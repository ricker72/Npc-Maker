// ───────────────────────────────────────────────────────────────────────────
// spriteCompositor.js
//
// Corre en el RENDERER. Toma las capas crudas (plantilla en gris + máscara
// de color) que devuelve window.tibiaAssets.getFrame(...) y las convierte en
// ImageData ya coloreadas con la paleta del juego (src/data/colors.json),
// para dibujarlas en un <canvas>.
//
// Algoritmo de coloreado verificado visualmente contra sprites reales del
// cliente 15.33: cada pixel de la mascara es uno de 4 colores de referencia
// (amarillo=cabeza, rojo=cuerpo, verde=piernas, azul=pies). El pixel final
// se obtiene multiplicando, canal por canal, el pixel de la plantilla (que
// solo aporta sombreado/luz en escala de grises) por el color de la paleta
// elegido para esa región (mismo algoritmo que usan los generadores de
// imagenes de outfits de la comunidad OpenTibia).
// ───────────────────────────────────────────────────────────────────────────

const REGION_REFERENCE_COLORS = {
  head: [255, 255, 0],
  body: [255, 0, 0],
  legs: [0, 255, 0],
  feet: [0, 0, 255],
};
const WHITE = [255, 255, 255];

// Umbral de distancia (al cuadrado, en espacio RGB) para considerar que un
// pixel de mascara "es" uno de los 4 colores de referencia. Verificado
// empiricamente contra mascaras reales (los colores puros no dejan dudas,
// asi que el umbral solo importa para evitar falsos positivos en bordes con
// antialiasing).
const REGION_MATCH_THRESHOLD_SQ = 3000;

function distSq(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

// Convierte un tile crudo (desde IPC: {width,height,rgba}) en un objeto
// {width,height,data:Uint8ClampedArray} listo para ImageData. Acepta tanto
// Uint8Array como Buffer serializado (Electron IPC preserva typed arrays).
function toRgbaArray(tile) {
  return tile.rgba instanceof Uint8ClampedArray
    ? tile.rgba
    : new Uint8ClampedArray(tile.rgba);
}

// tile: { width, height, layers: [templateTile, maskTile?] } (formato que
// devuelve getAppearanceFrame en el proceso principal).
// colors: { head:{r,g,b}, body:{r,g,b}, legs:{r,g,b}, feet:{r,g,b} }
export function colorizeTile(frame, colors) {
  const { width, height, layers } = frame;
  if (!layers || !layers[0]) return null;

  const template = layers[0];
  const mask = layers[1];
  const tpl = toRgbaArray(template);
  const out = new Uint8ClampedArray(width * height * 4);

  if (!mask) {
    // Sprite de un solo color fijo (monturas, efectos, etc.): se dibuja tal
    // cual, sin recolorear.
    out.set(tpl);
    return new ImageData(out, width, height);
  }

  const msk = toRgbaArray(mask);
  const regionEntries = Object.entries(REGION_REFERENCE_COLORS);

  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const ta = tpl[o + 3];
    if (ta === 0) {
      out[o + 3] = 0;
      continue;
    }
    const tr = tpl[o];
    const tg = tpl[o + 1];
    const tb = tpl[o + 2];
    const mPixel = [msk[o], msk[o + 1], msk[o + 2]];

    let bestRegion = null;
    let bestDist = Infinity;
    for (const [region, ref] of regionEntries) {
      const d = distSq(mPixel, ref);
      if (d < bestDist) {
        bestDist = d;
        bestRegion = region;
      }
    }
    const distWhite = distSq(mPixel, WHITE);

    if (bestRegion && bestDist < REGION_MATCH_THRESHOLD_SQ && bestDist < distWhite && colors[bestRegion]) {
      const col = colors[bestRegion];
      out[o] = (tr * col.r) / 255;
      out[o + 1] = (tg * col.g) / 255;
      out[o + 2] = (tb * col.b) / 255;
      out[o + 3] = ta;
    } else {
      out[o] = tr;
      out[o + 1] = tg;
      out[o + 2] = tb;
      out[o + 3] = ta;
    }
  }

  return new ImageData(out, width, height);
}

// Dibuja un frame (ya coloreado o de color fijo) en un contexto 2D, en la
// posicion (dx,dy) con el tamaño destino (dw,dh). Usa un canvas intermedio
// porque putImageData no respeta transformaciones ni escalado.
const scratchCanvas = document.createElement('canvas');

export function drawFrame(ctx, frame, colors, dx, dy, dw, dh) {
  const imageData = colorizeTile(frame, colors);
  if (!imageData) return;

  scratchCanvas.width = frame.width;
  scratchCanvas.height = frame.height;
  const scratchCtx = scratchCanvas.getContext('2d');
  scratchCtx.clearRect(0, 0, frame.width, frame.height);
  scratchCtx.putImageData(imageData, 0, 0);

  const prevSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(scratchCanvas, 0, 0, frame.width, frame.height, dx, dy, dw, dh);
  ctx.imageSmoothingEnabled = prevSmoothing;
}
