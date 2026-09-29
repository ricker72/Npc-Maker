// Envuelve electron-builder para minificar public/ durante el empaquetado y
// restaurar SIEMPRE el codigo legible al terminar, pase lo que pase.
//
// Por que un wrapper y no los hooks beforePack/afterPack de electron-builder:
// electron-builder empaqueta en paralelo y llama a los hooks una vez por
// arquitectura. Con x64 e ia32, el afterPack del x64 restauraba el codigo
// legible mientras el ia32 seguia empaquetando, de modo que los ejecutables
// salian con el codigo sin minificar. Se probo y fallo.
//
// Aqui el orden es lineal: minificar -> electron-builder -> restaurar. Y como
// la restauracion esta en un finally, un fallo o un Ctrl+C durante el build
// tampoco dejan public/ minificado.
'use strict';

const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const { restore } = require('./minify-main.js');

function run(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [require.resolve('electron-builder/out/cli/cli.js'), ...args], {
      cwd: ROOT,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('close', (code) => resolve(code === null ? 1 : code));
    child.on('error', () => resolve(1));
  });
}

function runNode(scriptArgs) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(__dirname, 'minify-main.js'), ...scriptArgs], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    child.on('close', (code) => resolve(code === null ? 1 : code));
  });
}

(async () => {
  const args = process.argv.slice(2);

  const minified = await runNode(['--minify']);
  if (minified !== 0) {
    console.log('[pack] el minificado fallo, se sigue con el codigo legible');
  }

  let code = 1;
  try {
    code = await run(args);
  } finally {
    // Siempre, salga bien o mal el build.
    restore();
  }

  process.exit(code);
})();
