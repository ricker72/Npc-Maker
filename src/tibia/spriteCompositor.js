const REGION_REFERENCE_COLORS = {
  head: [255, 255, 0],
  body: [255, 0, 0],
  legs: [0, 255, 0],
  feet: [0, 0, 255],
};
const WHITE = [255, 255, 255];

const REGION_MATCH_THRESHOLD_SQ = 3000;

function distSq(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function toRgbaArray(tile) {
  return tile.rgba instanceof Uint8ClampedArray
    ? tile.rgba
    : new Uint8ClampedArray(tile.rgba);
}

export function colorizeTile(frame, colors) {
  const { width, height, layers } = frame;
  if (!layers || !layers[0]) return null;

  const template = layers[0];
  const mask = layers[1];
  const tpl = toRgbaArray(template);
  const out = new Uint8ClampedArray(width * height * 4);

  if (!mask) {
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

const scratchCanvas = document.createElement('canvas');

export function fitToBox(frames, size) {
  const valid = frames.filter((f) => f && f.ok && f.width > 0 && f.height > 0);
  if (valid.length === 0) return null;

  const boxW = Math.max(...valid.map((f) => f.width));
  const boxH = Math.max(...valid.map((f) => f.height));

  const scale = size / Math.max(boxW, boxH);

  return {
    frames: valid,
    scale,
    dx: Math.round((size - boxW * scale) / 2),
    dy: Math.round((size - boxH * scale) / 2),
  };
}

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