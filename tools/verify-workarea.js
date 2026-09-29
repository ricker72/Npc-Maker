


'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'electron.js'), 'utf8');


function extract(name) {
  const start = src.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`no se encontro ${name}`);
  let depth = 0;
  let i = src.indexOf('{', start);
  const from = i;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) { i++; break; }
    }
  }
  return src.slice(start, i);
}

const code = [extract('getWorkArea'), extract('fitToWorkArea'), extract('fillWorkArea')].join('\n\n');

let currentDisplay = null;
const screen = {
  getPrimaryDisplay: () => currentDisplay,
  getDisplayMatching: () => currentDisplay,
  on: () => {}
};

const ctx = { screen, console };
vm.createContext(ctx);
vm.runInContext(code, ctx);

function makeWindow() {
  return {
    bounds: null,
    min: [0, 0],
    destroyed: false,
    isDestroyed() { return this.destroyed; },
    getBounds() { return this.bounds; },
    setMinimumSize(w, h) { this.min = [w, h]; },
    setBounds(b) { this.bounds = b; },
    getMinimumSize() { return this.min; }
  };
}

function setDisplay(name, work) {
  currentDisplay = { workArea: work, bounds: { x: 0, y: 0, ...work } };
  return work;
}

const PREFS = { width: 1400, height: 900, minWidth: 1000, minHeight: 700 };
let failures = 0;

function check(label, ok, detail) {
  console.log(`${ok ? 'PASA' : 'FALLA'}  ${label}${detail ? '  -> ' + detail : ''}`);
  if (!ok) failures++;
}

function fitsInWorkArea(b, work) {
  return (
    b.x >= work.x &&
    b.y >= work.y &&
    b.x + b.width <= work.x + work.width &&
    b.y + b.height <= work.y + work.height
  );
}


{
  const work = setDisplay('1920x1080 taskbar', { x: 0, y: 0, width: 1920, height: 1040 });
  const w = makeWindow();
  ctx.fitToWorkArea(w, PREFS);
  const b = w.getBounds();
  check('pantalla normal: cabe en el area de trabajo', fitsInWorkArea(b, work), JSON.stringify(b));
  check('pantalla normal: respeta la barra de tareas', b.y + b.height <= 1040, `borde inferior ${b.y + b.height} <= 1040`);
}


{
  const work = setDisplay('1920x1080 taskbar', { x: 0, y: 0, width: 1920, height: 1040 });
  const w = makeWindow();
  ctx.fitToWorkArea(w, PREFS);
  ctx.fillWorkArea(w);
  const b = w.getBounds();
  check('fill: ocupa toda el area libre', b.width === 1920 && b.height === 1040, JSON.stringify(b));
  check('fill: no invade la barra de tareas', b.y + b.height <= 1040, `borde inferior ${b.y + b.height}`);
}



{
  const work = setDisplay('1366x768 taskbar', { x: 0, y: 0, width: 1366, height: 728 });
  const w = makeWindow();
  ctx.fitToWorkArea(w, PREFS);
  const b = w.getBounds();
  check('pantalla chica: cabe en el area de trabajo', fitsInWorkArea(b, work), JSON.stringify(b));
  check('pantalla chica: minHeight no excede el area', w.getMinimumSize()[1] <= 728, `minH=${w.getMinimumSize()[1]}`);
}


{
  const work = setDisplay('segundo monitor', { x: -1920, y: -200, width: 1920, height: 1080 });
  const w = makeWindow();
  ctx.fitToWorkArea(w, PREFS);
  const b = w.getBounds();
  check('monitor con offset: cabe en su area', fitsInWorkArea(b, work), JSON.stringify(b));
  check('monitor con offset: respeta el origen del area', b.x >= work.x && b.y >= work.y, `x=${b.x} >= ${work.x}, y=${b.y} >= ${work.y}`);
}



{
  const work = setDisplay('pantalla muy baja', { x: 0, y: 0, width: 1366, height: 560 });
  const w = makeWindow();
  ctx.fitToWorkArea(w, PREFS);
  const b = w.getBounds();
  check('pantalla muy baja: cabe en el area', fitsInWorkArea(b, work), JSON.stringify(b));
  check('pantalla muy baja: minHeight reducido', w.getMinimumSize()[1] <= 560, `minH=${w.getMinimumSize()[1]}`);
}


{
  const work = setDisplay('barra arriba', { x: 0, y: 48, width: 1920, height: 1032 });
  const w = makeWindow();
  ctx.fitToWorkArea(w, PREFS);
  const b = w.getBounds();
  check('barra arriba: no invade la barra', b.y >= 48, `y=${b.y} >= 48`);
  check('barra arriba: cabe en el area', fitsInWorkArea(b, work), JSON.stringify(b));
}

console.log('');
if (failures > 0) {
  console.log(`${failures} comprobacion(es) fallaron.`);
  process.exit(1);
}
console.log('Todas las comprobaciones pasaron.');