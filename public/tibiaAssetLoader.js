'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const protobuf = require('protobufjs');

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

let AppearancesType = null;
let loadedFolder = null;
let spriteCatalog = null;
let outfitById = null;
let objectById = null;
let sheetCache = new Map();
const SHEET_CACHE_LIMIT = 200;

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

function resolveAssetsDir(candidatePath) {
  const direct = path.join(candidatePath, 'catalog-content.json');
  if (fs.existsSync(direct)) return candidatePath;

  const nested = path.join(candidatePath, 'assets', 'catalog-content.json');
  if (fs.existsSync(nested)) return path.join(candidatePath, 'assets');

  return null;
}

function listDirSafe(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function autoDetectAssetsDir() {
  const candidates = [];

  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const roots = [path.join(localAppData, 'Tibia'), path.join(appData, 'Tibia')];

  for (const root of roots) {
    candidates.push(path.join(root, 'assets'));
    const packages = path.join(root, 'packages');
    for (const entry of listDirSafe(packages)) {
      if (!entry.isDirectory()) continue;
      candidates.push(path.join(packages, entry.name, 'assets'));
    }
  }

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'catalog-content.json'))) return candidate;
  }

  return null;
}


async function loadAssets(candidatePath) {
  const assetsDir = candidatePath ? resolveAssetsDir(candidatePath) : autoDetectAssetsDir();
  if (!assetsDir) {
    return {
      ok: false,
      autoDetectFailed: true,
      error:
        'No se encontro la carpeta "assets" del cliente Tibia. ' +
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

    const outfits = new Map();
    for (const o of decoded.outfit) {
      outfits.set(o.id, o);
    }

    const objects = new Map();
    for (const o of decoded.object) {
      objects.set(o.id, o);
    }

    const sprites = parsedCatalog
      .filter((e) => e.type === 'sprite')
      .sort((a, b) => a.firstspriteid - b.firstspriteid);

    loadedFolder = assetsDir;
    spriteCatalog = sprites;
    outfitById = outfits;
    objectById = objects;
    sheetCache = new Map();

    return {
      ok: true,
      path: assetsDir,
      appearancesFile: appearancesEntry.file,
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
    objectCount: objectById ? objectById.size : 0,
  };
}

function hasAppearance(lookType) {
  return !!(outfitById && outfitById.get(lookType));
}

function hasObject(objectId) {
  return !!(objectById && objectById.get(objectId));
}

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

function decompressSpriteSheetLzma(buf) {
  if (!lzma) {
    throw new Error('El decodificador LZMA no esta cargado (fallo ensureLzmaLoaded).');
  }
  const body = buf.subarray(32);
  const propsAndDictSize = body.subarray(0, 5);
  const unknownSizeMarker = Buffer.alloc(8, 0xff);
  const compressedStream = body.subarray(13);
  const synthetic = Buffer.concat([propsAndDictSize, unknownSizeMarker, compressedStream]);
  const out = lzma.decompress(synthetic);
  return Buffer.from(out);
}

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

function spriteIndex({ frame, z, y, x, layer, width, height, depth, layers }) {
  return ((((frame * depth + z) * height + y) * width + x) * layers + layer);
}

function pickFrameGroup(appearance, wantedFixed) {
  if (!appearance || !appearance.frameGroup || !appearance.frameGroup.length) return null;
  let group = appearance.frameGroup.find((f) => f.fixedFrameGroup === wantedFixed);
  if (!group) group = appearance.frameGroup[0];
  if (!group || !group.spriteInfo) return null;
  return group;
}

function extractLayers(si, { frame = 0, z = 0, y = 0, x = 0 } = {}) {
  const width = si.patternWidth || 1;
  const height = si.patternHeight || 1;
  const depth = si.patternDepth || 1;
  const layers = si.layers || 1;
  const total = si.spriteId.length;
  const frameCount = total / (width * height * depth * layers) || 1;

  const safeX = x % width;
  const safeY = Math.min(y, height - 1);
  const safeZ = Math.min(z, depth - 1);
  const safeFrame = Math.floor(frame) % frameCount;

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

  return { layerTiles, frameCount, width, height, depth, layers };
}

function getAppearanceFrame(lookType, { group = 'idle', direction = 2, patternY = 0, z = 0, phase = 0 } = {}) {
  if (!outfitById) return { ok: false, error: 'No hay assets cargados.' };
  const appearance = outfitById.get(lookType);
  if (!appearance) {
    return { ok: false, missing: true, error: `lookType ${lookType} no existe en appearances.dat.` };
  }

  const wantedFixed = group === 'moving' ? 1 : 0;
  const frameGroup = pickFrameGroup(appearance, wantedFixed);
  if (!frameGroup) {
    return { ok: false, error: `lookType ${lookType} no tiene sprite_info para el grupo ${group}.` };
  }

  const extracted = extractLayers(frameGroup.spriteInfo, { frame: phase, z, y: patternY, x: direction });

  return {
    ok: true,
    width: extracted.layerTiles[0] ? extracted.layerTiles[0].width : 0,
    height: extracted.layerTiles[0] ? extracted.layerTiles[0].height : 0,
    layers: extracted.layerTiles,
    frameCount: extracted.frameCount,
    hasAddons: extracted.height > 1,
    hasMountPose: extracted.depth > 1,
  };
}

function getItemFrame(objectId, { frame = 0 } = {}) {
  if (!objectById) return { ok: false, error: 'No hay assets cargados.' };
  const object = objectById.get(objectId);
  if (!object) {
    return { ok: false, missing: true, error: `item ${objectId} no existe en appearances.dat.` };
  }

  const frameGroup = pickFrameGroup(object, 0);
  if (!frameGroup) {
    return { ok: false, error: `item ${objectId} no tiene sprite_info.` };
  }

  const extracted = extractLayers(frameGroup.spriteInfo, { frame });

  return {
    ok: true,
    width: extracted.layerTiles[0] ? extracted.layerTiles[0].width : 0,
    height: extracted.layerTiles[0] ? extracted.layerTiles[0].height : 0,
    layers: extracted.layerTiles,
    frameCount: extracted.frameCount,
  };
}

module.exports = {
  loadAssets,
  getLoadedInfo,
  getAppearanceFrame,
  getItemFrame,
  hasAppearance,
  hasObject,
  autoDetectAssetsDir,
};

