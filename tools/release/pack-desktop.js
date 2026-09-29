#!/usr/bin/env node
'use strict';


const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const DIST_DIR = path.join(ROOT, 'dist');
const RN_PATH = path.join(ROOT, 'releaseNotes.md');
const PKG_PATH = path.join(ROOT, 'package.json');
const FOLDER_NAME = 'NPC Maker Pro';

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.indexOf('--') === 0) {
      const k = t.slice(2);
      const n = argv[i + 1];
      if (n !== undefined && n.indexOf('--') !== 0) { a[k] = n; i++; }
      else { a[k] = true; }
    } else { a._.push(t); }
  }
  return a;
}

function psDesktop() {
  try {
    return cp.execSync(
      'powershell -NoProfile -Command "[Environment]::GetFolderPath(\'Desktop\')"',
      { encoding: 'utf8', timeout: 8000 }).trim() || null;
  } catch (e) { return null; }
}

function resolveDesktop(explicit) {
  if (explicit) return { dir: path.resolve(explicit), via: '--dir' };
  if (process.env.NPCMAKER_DESKTOP_DIR) {
    return { dir: path.resolve(process.env.NPCMAKER_DESKTOP_DIR), via: 'env' };
  }
  if (process.env.GITHUB_ACTIONS) return { dir: null, via: 'CI' };
  const ps = psDesktop();
  if (ps) return { dir: ps, via: 'GetFolderPath' };
  const home = os.homedir();
  const od = path.join(home, 'OneDrive', 'Desktop');
  if (fs.existsSync(od)) return { dir: od, via: 'OneDrive' };
  const dt = path.join(home, 'Desktop');
  if (fs.existsSync(dt)) return { dir: dt, via: 'Desktop' };
  return { dir: null, via: 'none' };
}

function listExes() {
  if (!fs.existsSync(DIST_DIR)) return [];
  return fs.readdirSync(DIST_DIR).filter(function (n) {
    return n.toLowerCase().slice(-4) === '.exe';
  }).map(function (n) {
    return path.join(DIST_DIR, n);
  }).filter(function (p) {
    try { return fs.statSync(p).isFile(); } catch (e) { return false; }
  }).sort();
}

function mb(b) { return (b / 1048576).toFixed(1); }

function sha256(p) {
  return new Promise(function (res, rej) {
    const h = crypto.createHash('sha256');
    const s = fs.createReadStream(p);
    s.on('error', rej);
    s.on('data', function (d) { h.update(d); });
    s.on('end', function () { res(h.digest('hex').toUpperCase()); });
  });
}

function cpFile(src, dst, dry) {
  if (dry) { console.log('   [dry] ' + path.basename(src)); return; }
  fs.copyFileSync(src, dst);
}

function help() {
  console.log([
    'Empaquetado para usuarios -> "<Escritorio>/NPC Maker Pro"',
    '  npm run pack:desktop     copia dist/*.exe + releaseNotes.md',
    '  npm run build:desktop    compila (build:win) + copia',
    '  flags: --dir <ruta> --dry-run --archive --hash --only-notes'
  ].join('\n'));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dry = !!args['dry-run'];
  if (args.help || args._[0] === 'help') { help(); return; }
  const onlyNotes = !!args['only-notes'];
  const archive = !!args.archive;
  const doHash = !!args.hash;

  const version = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8')).version;
  const hasNotes = fs.existsSync(RN_PATH);
  const exes = onlyNotes ? [] : listExes();
  if (!onlyNotes && exes.length === 0) {
    console.error('SIN_EXE dist vacio. Corre: npm run build:win');
    process.exit(1);
  }
  const f = resolveDesktop(args.dir);
  if (!f.dir) {
    console.error('SIN_ESCRITORIO. Usa: --dir "<ruta>"');
    process.exit(1);
  }
  const target = path.join(f.dir, FOLDER_NAME);
  const existed = fs.existsSync(target);
  if (!dry) fs.mkdirSync(target, { recursive: true });
  console.log((existed ? 'REUSA ' : 'CREA ') + target + '  [via ' + f.via + ']');

  let total = 0;
  if (exes.length > 0) {
    console.log('EXES v' + version + ':');
    for (const e of exes) {
      const sz = fs.statSync(e).size;
      total += sz;
      console.log(' + ' + path.basename(e) + ' ' + mb(sz) + 'MB');
      cpFile(e, path.join(target, path.basename(e)), dry);
    }
    console.log('TOTAL ' + mb(total) + 'MB');
  }

  if (hasNotes) {
    console.log('NOTAS v' + version + ':');
    cpFile(RN_PATH, path.join(target, 'ReleaseNotes-v' + version + '.md'), dry);
    cpFile(RN_PATH, path.join(target, 'ReleaseNotes.md'), dry);
  } else {
    console.log('NOTAS omitidas (no existe releaseNotes.md; se genera con npm run release:prepare)');
  }

  const dSums = path.join(DIST_DIR, 'SHA256SUMS.txt');
  const tSums = path.join(target, 'SHA256SUMS-v' + version + '.txt');
  if (doHash && exes.length > 0) {
    console.log('HASH calculando...');
    const lines = [];
    for (const e of exes) {
      const h = dry ? 'DRYRUN' : await sha256(e);
      lines.push(h + '  ' + path.basename(e));
      console.log(' + ' + path.basename(e));
    }
    if (!dry) fs.writeFileSync(tSums, lines.join('\n') + '\n', 'utf8');
  } else if (fs.existsSync(dSums)) {
    console.log('HASH reusa dist/SHA256SUMS.txt');
    cpFile(dSums, tSums, dry);
  } else {
    console.log('HASH omitido (sin dist/SHA256SUMS.txt; usa --hash)');
  }

  if (!dry) {
    const today = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(path.join(target, 'version.txt'), version + '\n', 'utf8');
    const leeme = [
      'NPC Maker Pro - carpeta de usuario',
      'Version: ' + version + '  (empaquetado: ' + today + ')',
      '',
      'Contenido:',
      '  Setup-*.exe     Instalador (recomendado)',
      '  Portable-*.exe  Sin instalacion',
      '  ReleaseNotes.md Notas de esta version (ultima)',
      '  ReleaseNotes-vX.Y.Z.md  Notas versionadas',
      '',
      'Oficial: https://github.com/ricker72/Npc-Maker/releases',
      ''
    ].join('\n');
    fs.writeFileSync(path.join(target, 'LEEME.txt'), leeme, 'utf8');
  }
  console.log('META version.txt + LEEME.txt v' + version);

  if (archive) {
    const ad = path.join(target, 'v' + version);
    if (!dry) fs.mkdirSync(ad, { recursive: true });
    console.log('ARCHIVE ' + ad);
    for (const e of exes) cpFile(e, path.join(ad, path.basename(e)), dry);
    cpFile(RN_PATH, path.join(ad, 'ReleaseNotes-v' + version + '.md'), dry);
  }

  console.log('OK v' + version + (dry ? ' (dry-run)' : '') + ' -> ' + target);
  if (f.dir.indexOf('OneDrive') !== -1) {
    console.log('AVISO Escritorio en OneDrive (~1GB se sincroniza).');
    console.log('Alternativa: npm run pack:desktop -- --dir "C:\\Users\\Public\\Desktop\\NPC Maker Pro"');
  }
}

main().catch(function (err) {
  console.error('ERROR pack-desktop: ' + (err && err.message ? err.message : err));
  process.exit(1);
});
