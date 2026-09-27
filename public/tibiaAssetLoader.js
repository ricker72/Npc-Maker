// ───────────────────────────────────────────────────────────────────────────
// tibiaAssetLoader.js
//
// Corre en el PROCESO PRINCIPAL de Electron (tiene acceso a Node/fs). Se
// encarga de:
//   1. Encontrar y leer la carpeta "assets" de un cliente Tibia moderno
//      (12.90+, incluido 15.33): catalog-content.json + appearances-*.dat
//      + hojas de sprites "sprites-*.bmp.lzma".
//   2. Decodificar el protobuf de appearances.dat para saber, por cada
//      outfit/montura (lookType), que sprite corresponde a cada
//      combinacion de direccion/addon/montado/capa/cuadro de animacion.
//   3. Descomprimir bajo demanda las hojas de sprites (LZMA -> BMP) y
//      devolver, para un outfit/montura puntual, los pixeles RGBA en
//      crudo de cada capa (plantilla gris + mascara de color) para que el
//      renderer los coloree con canvas usando la paleta de colores del
//      juego (src/data/colors.json), sin tener que reimplementar todo
//      esto en el renderer.
//
// Todo el trabajo pesado (parseo protobuf, LZMA, BMP) vive aca para poder
// usar dependencias node normales (protobufjs, lzma1) sin preocuparse por
// bundling en el renderer.
// ───────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const protobuf = require('protobufjs');

// lzma1 es un paquete solo-ESM (\"type\": \"module\") y el proceso principal de
// Electron corre como CommonJS (Node 20 no soporta require() de ESM), asi que
// se carga una sola vez con import() dinamico. loadAssets() espera a que este
// listo antes de habilitar la decodificacion de hojas.
let lzma = null;
let lzmaModulePromise = null;
function ensureLzmaLoaded() {
  if (!lzmaModulePromise) {
    lzmaModulePromise = import('lzma1').then((mod) => {
      lzma = mod;
      return mod;
    });
  }
  return lzmaModulePromise;
}

// ───────────────────────────── Estado del modulo ──────────────────────────

let AppearancesType = null; // Tipo protobuf ya cargado (se carga 1 sola vez)
let loadedFolder = null;    // Carpeta "assets" actualmente cargada
let catalog = null;         // Array crudo de catalog-content.json
let spriteCatalog = null;   // Solo las entradas type:"sprite", ordenadas por firstspriteid
let outfitById = null;      // Map<number, AppearanceDecoded> (incluye monturas, comparten namespace)
let sheetCache = new Map(); // Map<filename, {width, height, rgba: Uint8Array}>
const SHEET_CACHE_LIMIT = 200; // ~200 hojas * hasta 590KB = ~120MB peor caso, aceptable para app de escritorio

// Tamaño de celda (px) segun el campo "spritetype" del catalogo.
// Verificado contra hojas reales del cliente 15.33.
const CELL_SIZE_BY_SPRITETYPE = {
  0: { w: 32, h: 32 },
  1: { w: 64, h: 64 },
  2: { w: 32, h: 64 },
  3: { w: 64, h: 64 },
};

async function ensureProtoLoaded() {
  if (AppearancesType) return;
  const protoPath = path.join(__dirname, 'appearances.proto');
  const root = await protobuf.load(protoPath);
  AppearancesType = root.lookupType('tibia.protobuf.appearances.Appearances');
}

// ───────────────────────────── Localizar carpeta ───────────────────────────

// El usuario puede seleccionar la carpeta que contiene catalog-content.json
// directamente, o la carpeta "padre" que contiene una subcarpeta "assets"
// (asi vienen los zips de clientes, con "assets/catalog-content.json").
function resolveAssetsDir(candidatePath) {
  const direct = path.join(candidatePath, 'catalog-content.json');
  if (fs.existsSync(direct)) return candidatePath;

  const nested = path.join(candidatePath, 'assets', 'catalog-content.json');
  if (fs.existsSync(nested)) return path.join(candidatePath, 'assets');

  return null;
}

// ───────────────────────────── Carga principal ─────────────────────────────

async function loadAssets(candidatePath) {
  const assetsDir = resolveAssetsDir(candidatePath);
  if (!assetsDir) {
    return {
      ok: false,
      error:
        'No se encontro "catalog-content.json" en esa carpeta ni en una subcarpeta "assets". ' +
        'Selecciona la carpeta "assets" extraida del cliente (o la carpeta que la contiene).',
    };
  }

  try {
    await ensureProtoLoaded();
    await ensureLzmaLoaded();

    const catalogRaw = fs.readFileSync(path.join(assetsDir, 'catalog-content.json'), 'utf-8');
    const parsedCatalog = JSON.parse(catalogRaw);

    const appearancesEntry = parsedCatalog.find((e) => e.type === 'appearances');
    if (!appearancesEntry) {
      return { ok: false, error: 'catalog-content.json no tiene una entrada "appearances".' };
    }

    const appearancesBuf = fs.readFileSync(path.join(assetsDir, appearancesEntry.file));
    const decoded = AppearancesType.decode(appearancesBuf);

    const map = new Map();
    for (const o of decoded.outfit) {
      map.set(o.id, o);
    }

    const sprites = parsedCatalog
      .filter((e) => e.type === 'sprite')
      .sort((a, b) => a.firstspriteid - b.firstspriteid);

    // Reseteamos estado
    loadedFolder = assetsDir;
    catalog = parsedCatalog;
    spriteCatalog = sprites;
    outfitById = map;
    sheetCache = new Map();

    return {
      ok: true,
      path: assetsDir,
      outfitCount: decoded.outfit.length,
      objectCount: decoded.object.length,
    };
  } catch (err) {
    return { ok: false, error: `Error leyendo assets: ${err.message}` };
  }
}

function getLoadedInfo() {
  if (!loadedFolder) return { loaded: false };
  return {
    loaded: true,
    path: loadedFolder,
    outfitCount: outfitById ? outfitById.size : 0,
  };
}

// ─────────────────────── Busqueda de hoja por sprite id ────────────────────

// Busqueda binaria sobre spriteCatalog (ordenado por firstspriteid) para
// encontrar la hoja que contiene un sprite id dado.
function findSheetForSpriteId(spriteId) {
  if (!spriteCatalog) return null;
  let lo = 0;
  let hi = spriteCatalog.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const entry = spriteCatalog[mid];
    if (spriteId < entry.firstspriteid) {
      hi = mid - 1;
    } else if (spriteId > entry.lastspriteid) {
      lo = mid + 1;
    } else {
      return entry;
    }
  }
  return null;
}

// ───────────────────────── Decodificacion de hojas ─────────────────────────

// Los .bmp.lzma de Tibia llevan: 32 bytes de cabecera propia (se descartan)
// + una cabecera LZMA "alone" de 13 bytes cuyo campo de tamaño (8 bytes) no
// es confiable, seguida del stream LZMA1 crudo. Reconstruimos una cabecera
// "alone" estandar (tamaño desconocido = 0xFF*8) para poder usar cualquier
// decodificador LZMA1 estandar sin tener que hablar en modo "raw"/filters.
function decompressSpriteSheetLzma(buf) {
  if (!lzma) {
    throw new Error('El decodificador LZMA no esta cargado (fallo ensureLzmaLoaded).');
  }
  const body = buf.subarray(32);
  const propsAndDictSize = body.subarray(0, 5); // 1 byte props + 4 bytes dict size (LE)
  const unknownSizeMarker = Buffer.alloc(8, 0xff);
  const compressedStream = body.subarray(13);
  const synthetic = Buffer.concat([propsAndDictSize, unknownSizeMarker, compressedStream]);
  const out = lzma.decompress(synthetic);
  return Buffer.from(out);
}

// Parser minimo de BMP de 32bpp (BITMAPV4HEADER, BI_BITFIELDS), que es el
// unico formato que usan estos archivos. Devuelve RGBA top-down.
function parseBmp32(bmpBuf) {
  if (bmpBuf[0] !== 0x42 || bmpBuf[1] !== 0x4d) {
    throw new Error('Archivo BMP invalido (falta firma "BM").');
  }
  const bOffBits = bmpBuf.readUInt32LE(10);
  const width = bmpBuf.readInt32LE(18);
  const heightRaw = bmpBuf.readInt32LE(22);
  const bitCount = bmpBuf.readUInt16LE(28);
  if (bitCount !== 32) {
    throw new Error(`BMP con bitCount=${bitCount} no soportado (se esperaba 32).`);
  }
  const height = Math.abs(heightRaw);
  const bottomUp = heightRaw > 0;

  const rgba = new Uint8Array(width * height * 4);
  const rowSize = width * 4;
  for (let y = 0; y < height; y++) {
    const srcRow = bottomUp ? height - 1 - y : y;
    const srcOffset = bOffBits + srcRow * rowSize;
    const dstOffset = y * rowSize;
    for (let x = 0; x < width; x++) {
      const s = srcOffset + x * 4;
      const d = dstOffset + x * 4;
      // Almacenado como BGRA en memoria (little-endian de 0xAARRGGBB)
      const b = bmpBuf[s];
      const g = bmpBuf[s + 1];
      const r = bmpBuf[s + 2];
      const a = bmpBuf[s + 3];
      rgba[d] = r;
      rgba[d + 1] = g;
      rgba[d + 2] = b;
      rgba[d + 3] = a;
    }
  }
  return { width, height, rgba };
}

function getDecodedSheet(filename) {
  if (sheetCache.has(filename)) {
    return sheetCache.get(filename);
  }
  const filePath = path.join(loadedFolder, filename);
  const raw = fs.readFileSync(filePath);
  const bmp = decompressSpriteSheetLzma(raw);
  const decoded = parseBmp32(bmp);

  if (sheetCache.size >= SHEET_CACHE_LIMIT) {
    const firstKey = sheetCache.keys().next().value;
    sheetCache.delete(firstKey);
  }
  sheetCache.set(filename, decoded);
  return decoded;
}

// Recorta el tile de un sprite id puntual de su hoja, como RGBA plano.
function getSpriteTile(spriteId) {
  const sheetEntry = findSheetForSpriteId(spriteId);
  if (!sheetEntry) return null;

  const cell = CELL_SIZE_BY_SPRITETYPE[sheetEntry.spritetype] || CELL_SIZE_BY_SPRITETYPE[0];
  const sheet = getDecodedSheet(sheetEntry.file);

  const cols = Math.floor(sheet.width / cell.w);
  const localIndex = spriteId - sheetEntry.firstspriteid;
  const col = localIndex % cols;
  const row = Math.floor(localIndex / cols);

  const out = new Uint8Array(cell.w * cell.h * 4);
  for (let y = 0; y < cell.h; y++) {
    const srcRowOffset = ((row * cell.h) + y) * sheet.width * 4;
    const srcColOffset = col * cell.w * 4;
    const srcOffset = srcRowOffset + srcColOffset;
    const dstOffset = y * cell.w * 4;
    out.set(sheet.rgba.subarray(srcOffset, srcOffset + cell.w * 4), dstOffset);
  }

  return { width: cell.w, height: cell.h, rgba: out };
}

// ────────────────────────── Consulta de apariencias ────────────────────────

// index = ((((frame*depth + z) * height + y) * width + x) * layers + layer)
// Formula verificada contra appearances.dat real (outfit 128 "Citizen" y
// varias monturas del archivo mounts.json).
function spriteIndex({ frame, z, y, x, layer, width, height, depth, layers }) {
  return ((((frame * depth + z) * height + y) * width + x) * layers + layer);
}

// Devuelve info + las capas (tiles RGBA) de UN cuadro puntual de un
// outfit/montura (lookType). "group" es 'idle' o 'moving'. patternY es el
// indice de addon (0=base,1=addon1,2=addon2). z es 0 (normal) o 1 (montado),
// si el outfit tiene esa pose (patternDepth=2).
function getAppearanceFrame(lookType, { group = 'idle', direction = 2, patternY = 0, z = 0, phase = 0 } = {}) {
  if (!outfitById) return { ok: false, error: 'No hay assets cargados.' };
  const appearance = outfitById.get(lookType);
  if (!appearance) return { ok: false, error: `lookType ${lookType} no existe en appearances.dat.` };

  const wantedFixed = group === 'moving' ? 1 : 0;
  let frameGroup = appearance.frameGroup.find((f) => f.fixedFrameGroup === wantedFixed);
  if (!frameGroup) frameGroup = appearance.frameGroup[0];
  if (!frameGroup || !frameGroup.spriteInfo) {
    return { ok: false, error: `lookType ${lookType} no tiene sprite_info para el grupo ${group}.` };
  }

  const si = frameGroup.spriteInfo;
  const width = si.patternWidth || 1;
  const height = si.patternHeight || 1;
  const depth = si.patternDepth || 1;
  const layers = si.layers || 1;
  const total = si.spriteId.length;
  const frameCount = total / (width * height * depth * layers) || 1;

  const safeX = direction % width;
  const safeY = Math.min(patternY, height - 1);
  const safeZ = Math.min(z, depth - 1);
  const safeFrame = Math.floor(phase) % frameCount;

  const layerTiles = [];
  for (let layer = 0; layer < layers; layer++) {
    const idx = spriteIndex({ frame: safeFrame, z: safeZ, y: safeY, x: safeX, layer, width, height, depth, layers });
    const spriteId = si.spriteId[idx];
    if (spriteId === undefined || spriteId === 0) {
      layerTiles.push(null);
      continue;
    }
    layerTiles.push(getSpriteTile(spriteId));
  }

  return {
    ok: true,
    width: layerTiles[0] ? layerTiles[0].width : 0,
    height: layerTiles[0] ? layerTiles[0].height : 0,
    layers: layerTiles, // [{width,height,rgba}, ...] - longitud 1 (fijo) o 2 (coloreable: [plantilla, mascara])
    frameCount,
    hasAddons: height > 1, // patternHeight>1 -> soporta addon1/addon2
    hasMountPose: depth > 1, // patternDepth>1 -> tiene pose "montado"
  };
}

module.exports = {
  loadAssets,
  getLoadedInfo,
  getAppearanceFrame,
};
