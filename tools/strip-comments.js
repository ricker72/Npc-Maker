








'use strict';

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const ROOT = path.resolve(__dirname, '..');
const WRITE = process.argv.includes('--write');
const IS_MAIN = require.main === module;


const PLUGINS = [
  'jsx',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'objectRestSpread',
  'optionalChaining',
  'nullishCoalescingOperator',
  'dynamicImport',
  'topLevelAwait',
  'numericSeparator',
  'logicalAssignment',
];

const TARGETS = [
  { dir: 'src', exts: ['.js', '.jsx'] },
  { dir: 'public', exts: ['.js'] },
  { dir: 'tools', exts: ['.js'] },
  { dir: '.', exts: ['.js'], files: ['electron.js'] },
];

function walk(dir, exts) {
  const out = [];
  const abs = path.join(ROOT, dir);
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'build' || e.name === 'dist' || e.name.startsWith('.')) continue;
    const full = path.join(abs, e.name);
    if (e.isDirectory()) {
      out.push(...walk(path.join(dir, e.name), exts));
    } else if (exts.includes(path.extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

function collectFiles() {
  const files = [];
  for (const t of TARGETS) {
    if (t.files) {
      t.files.forEach((f) => files.push(path.join(ROOT, t.dir, f)));
    } else {
      files.push(...walk(t.dir, t.exts));
    }
  }
  return files.filter((f) => fs.existsSync(f));
}


function stripComments(source) {
  const ast = parser.parse(source, {
    sourceType: 'unambiguous',
    plugins: PLUGINS,
  });

  const comments = ast.comments || [];
  if (comments.length === 0) return null;

  
  const ranges = comments
    .map((c) => ({ start: c.start, end: c.end, type: c.type }))
    .sort((a, b) => b.start - a.start);

  let out = source;
  for (const r of ranges) {
    out = out.slice(0, r.start) + out.slice(r.end);
  }

  
  
  
  out = out
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
    .join('\n');

  
  out = out.replace(/^\n+/, '').replace(/\n+$/, '');

  return out;
}

if (IS_MAIN) {
const files = collectFiles();
let changed = 0;
let removedTotal = 0;
let errors = 0;

for (const file of files) {
  const rel = path.relative(ROOT, file);
  const source = fs.readFileSync(file, 'utf8');

  let stripped;
  try {
    stripped = stripComments(source);
  } catch (err) {
    
    console.log(`  AVISO  ${rel}: no se pudo parsear (${err.message.split('\n')[0]})`);
    errors++;
    continue;
  }

  if (stripped === null) continue;

  removedTotal += source.split('\n').length - stripped.split('\n').length;
  changed++;
  console.log(`  ${WRITE ? 'LIMPIO' : 'DRY'}  ${rel}  (-${source.split('\n').length - stripped.split('\n').length} lineas)`);

  if (WRITE) {
    fs.writeFileSync(file, stripped, 'utf8');
  }
}

console.log('');
console.log(`${files.length} archivos analizados, ${changed} con comentarios, ${errors} con errores.`);
if (WRITE) {
  console.log('Comentarios eliminados. Revisa los archivos antes de commitear.');
} else {
  console.log('Dry-run: no se escribio nada. Usa --write para aplicar.');
}
}

module.exports = { stripComments };