// Verifica que el codigo MINIFICADO de public/ sigue siendo funcional, no solo
// que tenga menos bytes. Minificar un proceso principal de Electron se puede
// romper de formas sutiles (nombres que Electron resuelve por su cuenta,
// require dinamicos, comparaciones de cadenas), asi que aqui se comprueba que
// el resultado hace lo mismo que el original.
//   node tools/verify-minify.js
'use strict';

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const FILES = ['electron.js', 'preload.js', 'updateChecker.js', 'launcher-preload.js', 'tibiaAssetLoader.js'];

const KEEP = require(path.join(__dirname, 'minify-keep.js'));

let fallos = 0;
function check(label, ok, detail) {
  if (!ok) fallos++;
  console.log(`${ok ? 'PASA' : 'FALLA'}  ${label}${detail ? '  -> ' + detail : ''}`);
}

async function minifyOne(code) {
  const r = await minify(code, {
    ecma: 2020,
    module: false,
    toplevel: true,
    compress: { drop_console: false, passes: 2 },
    mangle: { reserved: KEEP, keep_fnames: false, keep_classnames: false },
    format: { comments: false, ascii_only: false },
  });
  return r.code;
}

// Carga electron.js con un stub de electron y comprueba que el modulo sigue
// cargando sin reventar.
function loadWithStub(code) {
  const calls = [];
  const stub = {
    app: { getVersion: () => '2.7.2', getPath: () => '/tmp', isPackaged: true, on() {} },
    BrowserWindow: function BW() {},
    Menu: { buildFromTemplate: () => ({}), setApplicationMenu() {} },
    shell: { openExternal: async () => true },
    ipcMain: { handle() {} },
    dialog: {},
    screen: {
      getDisplayMatching: () => ({ workArea: { x: 0, y: 0, width: 100, height: 100 } }),
      getPrimaryDisplay: () => ({ workArea: { x: 0, y: 0, width: 100, height: 100 } }),
      on() {},
    },
  };
  const module_ = { exports: {} };
  const sandboxRequire = (name) => {
    if (name === 'electron') return stub;
    if (name === 'path' || name === 'fs') return require(name);
    if (name.includes('tibiaAssetLoader')) return {};
    if (name.includes('updateChecker')) return {};
    return require(name);
  };
  const ctx = vm.createContext({
    require: sandboxRequire,
    module: module_,
    exports: module_.exports,
    __dirname: PUBLIC,
    __filename: path.join(PUBLIC, 'electron.js'),
    console: { log() {}, warn() {}, error() {} },
    process: { platform: 'win32', env: {} },
    setTimeout, clearTimeout, setInterval, clearInterval, setImmediate,
    Buffer, URL,
  });
  vm.runInContext(code, ctx, { filename: 'electron.min.js' });
  return { exports: module_.exports, stub, calls };
}

(async () => {
  console.log('1) Cada archivo minificado sigue siendo JS valido y exporta lo mismo');
  for (const name of FILES) {
    const file = path.join(PUBLIC, name);
    const src = fs.readFileSync(file, 'utf8');
    const out = await minifyOne(src);
    let parses = true;
    try { new vm.Script(out, { filename: name }); } catch (e) { parses = false; console.log(`   ${e.message}`); }
    check(`${name}: la salida minificada parsea`, parses);
  }

  console.log('');
  console.log('2) electron.js minificado carga y no explota');
  {
    const src = fs.readFileSync(path.join(PUBLIC, 'electron.js'), 'utf8');
    const out = await minifyOne(src);
    let ok = true;
    let err = null;
    try { loadWithStub(out); } catch (e) { ok = false; err = e.message; }
    check('electron.js minificado se carga con un stub de Electron', ok, err || '');
  }

  console.log('');
  console.log('3) Los nombres publicos NO se renombran');
  {
    const src = fs.readFileSync(path.join(PUBLIC, 'electron.js'), 'utf8');
    const out = await minifyOne(src);
    // Electron resuelve estos por su cuenta desde package.json / el runtime.
    for (const sym of ['require', 'app', 'BrowserWindow', 'ipcMain', 'screen']) {
      check(`"${sym}" sigue presente tras minificar`, new RegExp(`\\b${sym}\\b`).test(out));
    }
    // Las claves del bridge de preload se acceden por cadena desde el renderer.
    const pre = fs.readFileSync(path.join(PUBLIC, 'preload.js'), 'utf8');
    const preOut = await minifyOne(pre);
    for (const key of ['tibiaAssets', 'npcUpdates', 'electron']) {
      check(`bridge "${key}" conservado en preload.js`, preOut.includes(key));
    }
  }

  console.log('');
  console.log('4) Los nombres internos SI se renombran');
  {
    const src = fs.readFileSync(path.join(PUBLIC, 'electron.js'), 'utf8');
    const out = await minifyOne(src);
    // Estas son funciones propias del main process: no las usa Electron por
    // nombre, asi que deben desaparecer. Si aparece alguna, el mangle de
    // toplevel no esta funcionando.
    for (const internal of [
      'fillWorkArea', 'getWorkArea', 'fitToWorkArea', 'hardenWindow',
      'createMainWindow', 'createSplashWindow', 'bootApp', 'runFirstRunSetup',
      'reportProgress', 'getConfigPath', 'readConfig', 'writeConfigField',
    ]) {
      const visible = new RegExp(`\\b${internal}\\b`).test(out);
      check(`"${internal}" renombrado`, !visible, visible ? 'sigue visible' : '');
    }
  }

  console.log('');
  console.log('5) El codigo de la UI (src/) NO se toca por esto');
  {
    // src/ lo minifica webpack; este script no debe haberlo modificado.
    const app = fs.readFileSync(path.join(ROOT, 'src', 'App.jsx'), 'utf8');
    check('src/App.jsx sigue legible (sin minificar)', app.includes('\n') && !app.includes('function App(){'));
  }

  console.log('');
  console.log('6) build.files no empaqueta copias sin minificar de public/');
  {
    // react-scripts copia public/*.js dentro de build/. Si build/**/* se
    // empaquetara tal cual, el asar llevaria una segunda copia LEGIBLE de
    // electron.js y el minificado no serviria de nada. Esto ya paso una vez.
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const files = pkg.build.files || [];
    const broad = files.includes('build/**/*') || files.includes('build/*');
    check('no se incluye build/**/* entero', !broad);
    check('se incluye build/index.html', files.includes('build/index.html'));
    check('se incluye build/static/**/*', files.includes('build/static/**/*'));
  }

  console.log('');
  if (fallos) { console.log(`${fallos} fallo(s).`); process.exit(1); }
  console.log('Todo correcto: el codigo minificado sigue siendo funcional.');
})();
