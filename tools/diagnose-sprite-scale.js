



'use strict';

const CELLS = { 0: { w: 32, h: 32 }, 1: { w: 64, h: 64 }, 2: { w: 32, h: 64 }, 3: { w: 64, h: 64 } };

const SIZE = 96;      
const BOX = 140;      
const CSS_SCALE = 2.2; 

function oldDraw(w, h) {
  const scale = SIZE / w;             
  return { w: w * scale, h: h * scale };
}

function newDraw(w, h) {
  
  const scale = SIZE / Math.max(w, h);
  const dw = w * scale;
  const dh = h * scale;
  return { w: dw, h: dh, x: (SIZE - dw) / 2, y: (SIZE - dh) / 2 };
}

console.log(`lienzo ${SIZE}x${SIZE} | caja .bestiary-card-sprite ${BOX}x${BOX} | CSS scale(${CSS_SCALE})`);
console.log('');
console.log('spritetype  celda   ANTES (dibuja)      desborda?   AHORA (dibuja)      cabe?');
console.log('----------  ------  ------------------  ----------  -------------------  ------');

let oldBad = 0;
let newBad = 0;

for (const [type, c] of Object.entries(CELLS)) {
  const o = oldDraw(c.w, c.h);
  const n = newDraw(c.w, c.h);
  const overOld = o.w > SIZE || o.h > SIZE;
  const overNew = n.w > SIZE || n.h > SIZE;
  if (overOld) oldBad++;
  if (overNew) newBad++;

  console.log(
    `${String(type).padEnd(10)}  ${(c.w + 'x' + c.h).padEnd(6)}  ` +
    `${(o.w.toFixed(0) + 'x' + o.h.toFixed(0)).padEnd(18)}  ` +
    `${(overOld ? 'SI (' + Math.max(o.w, o.h) / SIZE + 'x)' : 'no').padEnd(10)}  ` +
    `${(n.w.toFixed(0) + 'x' + n.h.toFixed(0)).padEnd(19)}  ` +
    `${overNew ? 'SI' : 'si'}`
  );
}

console.log('');
console.log(`ANTES: ${oldBad} de ${Object.keys(CELLS).length} tipos de celda se salen del cuadro.`);
console.log(`AHORA: ${newBad} de ${Object.keys(CELLS).length} se salen del cuadro.`);


console.log('');
console.log(`Ademas, en el navegador el canvas se multiplicaba por CSS scale(${CSS_SCALE}):`);
console.log(`  ${SIZE} x ${CSS_SCALE} = ${(SIZE * CSS_SCALE).toFixed(0)}px dentro de una caja de ${BOX}px`);
console.log(`  -> el sprite se ve ${(SIZE * CSS_SCALE / BOX).toFixed(2)}x mas grande que la caja`);

process.exit(newBad > 0 ? 1 : 0);