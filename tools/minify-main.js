// Minifica los archivos de public/ que viajan DENTRO del ejecutable.
//
// Motivo: src/ ya lo minifica webpack, asi que sus comentarios y nombres no
// llegan nunca al .exe. En cambio public/electron.js y companyia se copian
// tal cual, asi que sus nombres de funcion se ven tal cual al abrir el asar.
//
// Por que NO se usa un hook de electron-builder (beforePack/afterPack):
// electron-builder empaqueta en paralelo y llama a los hooks UNA VEZ POR
// ARQUITECTURA. Con x64 e ia32, el afterPack del x64 restaura el codigo
// legible mientras el ia32 sigue empaquetando, asi que la mitad de los
// ejecutables salian con el codigo sin minificar. Se probo y fallaba.
//
// En vez de eso se hace en dos pasos explicitos y deterministas:
//   node tools/minify-main.js --minify   (minifica, guardando originals)
//   electron-builder ...
//   node tools/minify-main.js --restore  (restaura los originales)
//
//   node tools/minify-main.js            (dry-run, no escribe)
'use strict';

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

// Solo estos: son los .js que la seccion build.files copia al paquete.
// appearances.proto y launcher.html no son JS.
const TARGETS = ['electron.js', 'preload.js', 'updateChecker.js', 'launcher-preload.js', 'tibiaAssetLoader.js'];

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const BACKUP_DIR = path.join(ROOT, '.pack-backup');

const KEEP = require('./minify-keep.js');

async function minifyOne(code) {
  const result = await minify(code, {
    ecma: 2020,
    module: false,
    // toplevel:true es lo que renombra las funciones de primer nivel
    // (fillWorkArea, getWorkArea, hardenWindow...). Con false el codigo queda
    // minificado pero los nombres siguen intactos, que es justo lo que se
    // quiere evitar. KEEP protege los simbolos de Electron/Node.
    toplevel: true,
    compress: {
      drop_console: false,
      passes: 2,
    },
    mangle: {
      reserved: KEEP,
      keep_fnames: false,
      keep_classnames: false,
    },
    format: {
      comments: false,
      ascii_only: false,
    },
  });
  if (!result || typeof result.code !== 'string' || result.code.length === 0) {
    throw new Error('terser devolvio una salida vacia');
  }
  return result.code;
}

async function apply() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const report = [];

  for (const name of TARGETS) {
    const file = path.join(PUBLIC_DIR, name);
    if (!fs.existsSync(file)) {
      report.push(`  ${name}: no existe, se omite`);
      continue;
    }
    // Solo se guarda el backup la primera vez. electron-builder llama a
    // beforePack una vez por arquitectura (x64, ia32): si se volviera a
    // guardar aqui, el "original" seria el archivo ya minificado de la vuelta
    // anterior y al restaurar se perderia el codigo legible para siempre.
    const backupPath = path.join(BACKUP_DIR, name);
    const original = fs.existsSync(backupPath)
      ? fs.readFileSync(backupPath, 'utf8')
      : fs.readFileSync(file, 'utf8');
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, original, 'utf8');
    }

    const minified = await minifyOne(original);
    fs.writeFileSync(file, minified, 'utf8');

    const before = Buffer.byteLength(original);
    const after = Buffer.byteLength(minified);
    const pct = before ? Math.round((1 - after / before) * 100) : 0;
    report.push(
      `  ${name.padEnd(22)} ${String(before).padStart(7)} -> ${String(after).padStart(6)} bytes  (-${pct}%)`
    );
  }

  console.log('[minify] archivos minificados para empaquetar:');
  report.forEach((l) => console.log(l));
  console.log('[minify] originals guardados en .pack-backup (se restauran tras empaquetar)');
}

function restore() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('[minify] no hay backup que restaurar');
    return;
  }
  for (const name of TARGETS) {
    const backup = path.join(BACKUP_DIR, name);
    if (fs.existsSync(backup)) {
      fs.copyFileSync(backup, path.join(PUBLIC_DIR, name));
    }
  }
  fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  console.log('[minify] codigo fuente restaurado');
}

async function dryRun() {
  console.log('[minify] dry-run (no se escribe nada):');
  for (const name of TARGETS) {
    const file = path.join(PUBLIC_DIR, name);
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, 'utf8');
    const out = await minifyOne(src);
    const before = Buffer.byteLength(src);
    const after = Buffer.byteLength(out);
    console.log(
      `  ${name.padEnd(22)} ${String(before).padStart(7)} -> ${String(after).padStart(6)} bytes  (-${Math.round((1 - after / before) * 100)}%)`
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--minify')) {
    await apply();
  } else if (args.includes('--restore')) {
    restore();
  } else {
    await dryRun();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[minify] ERROR:', err.message);
    // Si falla el minificado se restauran los originales antes de salir, para
    // no dejar public/ en un estado intermedio.
    restore();
    process.exit(1);
  });
}

module.exports = { minifyOne, restore, TARGETS };


