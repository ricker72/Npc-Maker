


'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'src', 'tibia', 'spriteCompositor.js');
const src = fs.readFileSync(SRC, 'utf8');

function extract(name) {
  const start = src.indexOf(`export function ${name}(`);
  if (start === -1) throw new Error(`no se encontro ${name}`);
  let depth = 0;
  let i = src.indexOf('{', start);
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(start, i).replace('export function', 'function');
}


const ctx = { console };
vm.createContext(ctx);
vm.runInContext(extract('fitToBox'), ctx);
const { fitToBox } = ctx;

let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? 'PASA' : 'FALLA'}  ${label}${detail ? '  -> ' + detail : ''}`);
  if (!ok) failures++;
}
const f = (w, h) => ({ ok: true, width: w, height: h });


const CELLS = { 0: { w: 32, h: 32 }, 1: { w: 64, h: 64 }, 2: { w: 32, h: 64 }, 3: { w: 64, h: 64 } };
const SIZE = 120;

console.log(`fitToBox con lienzo ${SIZE}x${SIZE}\n`);

for (const [type, c] of Object.entries(CELLS)) {
  const fit = fitToBox([f(c.w, c.h)], SIZE);
  const dw = c.w * fit.scale;
  const dh = c.h * fit.scale;
  const inside = dw <= SIZE + 0.001 && dh <= SIZE + 0.001;
  const ratioOk = Math.abs((dw / dh) - (c.w / c.h)) < 1e-9;

  check(
    `spritetype ${type} (${c.w}x${c.h}) cabe y no se deforma`,
    inside && ratioOk,
    `dibuja ${dw.toFixed(0)}x${dh.toFixed(0)}`
  );
}


const t2 = fitToBox([f(32, 64)], SIZE);
check(
  'spritetype 2 ya NO se sale del cuadro (el bug reportado)',
  32 * t2.scale <= SIZE && 64 * t2.scale <= SIZE,
  `alto = ${(64 * t2.scale).toFixed(0)} <= ${SIZE}`
);


check(
  'celda estrecha queda centrada',
  Math.abs(t2.dx - (SIZE - 32 * t2.scale) / 2) < 1,
  `dx=${t2.dx}`
);


const multi = fitToBox([f(64, 64), f(32, 32)], SIZE);
check(
  'todas las capas comparten la misma escala y origen',
  multi.frames.length === 2 && multi.scale === SIZE / 64,
  `scale=${multi.scale}, frames=${multi.frames.length}`
);
check(
  'la composicion multi-capa cabe',
  64 * multi.scale <= SIZE && 32 * multi.scale <= SIZE,
  `max = ${(64 * multi.scale).toFixed(0)} <= ${SIZE}`
);


const partial = fitToBox([null, { ok: false }, f(64, 64)], SIZE);
check('ignora frames no validos', partial && partial.frames.length === 1, `frames=${partial.frames.length}`);

check('sin frames validos devuelve null', fitToBox([null, { ok: false }], SIZE) === null);


const unity = fitToBox([f(64, 64)], 64);
check('escala 1:1 cuando el tamano ya es el del lienzo', unity.scale === 1, `scale=${unity.scale}`);

console.log('');
if (failures > 0) { console.log(`${failures} comprobacion(es) fallaron.`); process.exit(1); }
console.log('Todas las comprobaciones pasaron.');