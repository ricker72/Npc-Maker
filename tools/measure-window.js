






'use strict';

const { app, BrowserWindow, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'public', 'electron.js');
const src = fs.readFileSync(SRC, 'utf8');

function extract(name) {
  const start = src.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`no se encontro ${name}`);
  let depth = 0;
  let i = src.indexOf('{', start);
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(start, i);
}

const ctx = { screen, console };
vm.createContext(ctx);
vm.runInContext(
  [extract('getWorkArea'), extract('fillWorkArea')].join('\n\n'),
  ctx
);
const { fillWorkArea } = ctx;

const log = (...a) => console.log('[MEDIDA]', ...a);
let fallos = 0;

function check(label, ok, detail) {
  if (!ok) fallos++;
  log(`${ok ? 'PASA' : 'FALLA'}  ${label}${detail ? '  -> ' + detail : ''}`);
}

function measure(win) {
  const b = win.getBounds();
  const w = screen.getDisplayMatching(b).workArea;
  return {
    b,
    w,
    overflowBottom: b.y + b.height - (w.y + w.height),
    overflowRight: b.x + b.width - (w.x + w.width),
  };
}

function assertFits(tag, win) {
  const m = measure(win);
  check(
    `${tag} cabe en el area libre`,
    m.overflowBottom <= 1 && m.overflowRight <= 1,
    `ventana ${m.b.width}x${m.b.height} @(${m.b.x},${m.b.y}) | workArea ${m.w.width}x${m.w.height} | desborde inf=${m.overflowBottom}px der=${m.overflowRight}px`
  );
}

app.whenReady().then(async () => {
  const d = screen.getPrimaryDisplay();
  log(`monitor ${d.bounds.width}x${d.bounds.height} | workArea ${d.workArea.width}x${d.workArea.height} | escala ${d.scaleFactor}`);
  log(`barra de tareas: ${d.bounds.height - d.workArea.height}px`);
  log('');

  const win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1000, minHeight: 700,
    show: true, backgroundColor: '#000',
  });

  await new Promise((r) => setTimeout(r, 600));

  log('--- 1) fillWorkArea() (lo que llama bootApp al arrancar) ---');
  fillWorkArea(win);
  await new Promise((r) => setTimeout(r, 300));
  assertFits('fillWorkArea', win);

  log('');
  log('--- 2) el USUARIO maximiza con el boton de la barra de titulo ---');
  win.maximize();
  await new Promise((r) => setTimeout(r, 700));
  const m = measure(win);
  log(`   maximize nativo -> y=${m.b.y} h=${m.b.height} (borde inf=${m.b.y + m.b.height} vs ${m.w.y + m.w.height})`);
  check('el maximize nativo de Electron se sale por abajo (motivo del bug)', m.overflowBottom > 1, `desborde=${m.overflowBottom}px`);

  log('');
  log('--- 3) aplicando la CORRECCION real: unmaximize() + fillWorkArea() ---');
  
  win.unmaximize();
  fillWorkArea(win);
  await new Promise((r) => setTimeout(r, 400));
  assertFits('tras la correccion', win);

  log('');
  log('--- 4) ciclo completo: maximize -> correccion -> unmaximize ---');
  win.maximize();
  await new Promise((r) => setTimeout(r, 600));
  const m4a = measure(win);
  log(`   maximize nativo otra vez -> desborde inferior=${m4a.overflowBottom}px`);
  win.unmaximize();
  fillWorkArea(win);
  await new Promise((r) => setTimeout(r, 300));
  assertFits('segundo ciclo', win);

  log('');
  if (fallos === 0) log('>>> OK: la correccion deja la ventana dentro del area libre.');
  else log(`>>> ${fallos} fallo(s).`);

  app.quit();
});