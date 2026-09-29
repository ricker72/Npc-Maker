#!/usr/bin/env node
'use strict';


const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const RN_PATH = path.join(ROOT, 'releaseNotes.md');
const PENDING_PATH = path.join(ROOT, 'tools', 'release', 'pending-notes.md');
const OUT_DIR = path.join(ROOT, 'tools', 'release', 'generated');

const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];


function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

function parseVersion(value) {
  const m = String(value || '').match(/^(\d+)\.(\d+)(?:\.(\d+))?$/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: m[3] !== undefined ? +m[3] : 0 };
}

function versionToString(v) {
  return `${v.major}.${v.minor}.${v.patch}`;
}

function bumpVersion(current, bump) {
  const v = parseVersion(current);
  if (!v) throw new Error(`Versión inválida en package.json: "${current}"`);
  if (/^\d+\.\d+\.\d+$/.test(bump)) return bump;
  if (bump === 'major') return `${v.major + 1}.0.0`;
  if (bump === 'minor') return `${v.major}.${v.minor + 1}.0`;
  if (bump === 'patch') return `${v.major}.${v.minor}.${v.patch + 1}`;
  throw new Error(`--bump inválido: "${bump}" (usa patch | minor | major | x.y.z)`);
}

const tagFor = (version) => `Version${version}`;
const releaseTitleFor = (version) => `NPC MAKER PRO V${version}`;

function fechaLarga(d = new Date()) {
  return `${d.getDate()} de ${MESES_ES[d.getMonth()]} de ${d.getFullYear()}`;
}

function fechaCorta(d = new Date()) {
  return `${d.getDate()} ${MESES_CORTO[d.getMonth()]} ${d.getFullYear()}`;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function fileEol(content) {
  return content.includes('\r\n') ? '\r\n' : '\n';
}

function readPendingNotes() {
  if (!fs.existsSync(PENDING_PATH)) return [];
  const raw = fs.readFileSync(PENDING_PATH, 'utf8');
  return raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .filter((l) => !/^[-*>]+$/.test(l))
    .map((l) => (/^[-*]\s+/.test(l) ? l.replace(/^[-*]\s+/, '- ') : `- ${l}`))
    .filter((l) => l.length > 2 && l !== '- -' && l !== '- *');
}

function clearPendingNotes() {
  const header = [
    '<!--',
    '  📝 Notas pendientes para la PRÓXIMA versión de NPC Maker Pro',
    '  ============================================================',
    '  Escribe aquí los cambios de la versión que vas a compilar, UNO POR',
    '  LÍNEA. `npm run release:prepare` los consume y genera el Summary /',
    '  Description del commit de GitHub. Líneas que empiezan con # se',
    '  ignoran. Ver tools/release/README.md',
    '-->',
    '',
    '- ',
    ''
  ].join('\n');
  fs.writeFileSync(PENDING_PATH, header, 'utf8');
}

function updateReleaseNotes(md, ctx) {
  const { oldVersion, newVersion, notes, tldr, eol } = ctx;
  const warnings = [];
  let out = md;
  const newAnchor = newVersion.replace(/\./g, '');

  const replaceOnce = (pattern, replacement, label) => {
    if (!pattern.test(out)) {
      warnings.push(`No se encontró el marcador: ${label}`);
      return;
    }
    out = out.replace(pattern, replacement);
  };

  replaceOnce(
    /### 📋 Release Notes · v[\d.]+/,
    `### 📋 Release Notes · v${newVersion}`,
    'cabecera "Release Notes · vX.Y.Z"'
  );
  replaceOnce(
    /(img\.shields\.io\/badge\/version-)[\d.]+(-)/,
    `$1${newVersion}$2`,
    'badge de versión'
  );

  if (tldr) {
    replaceOnce(
      /(> \[!NOTE\][\s\S]{0,40}?> \*\*TL;DR —\*\* ).*/,
      `$1${tldr}`,
      'TL;DR'
    );
  }

  replaceOnce(
    /\[Novedades de la versión [\d.]+\]\(#-novedades-de-la-versión-[\d]+\)/,
    `[Novedades de la versión ${newVersion}](#-novedades-de-la-versión-${newAnchor})`,
    'TOC "Novedades de la versión"'
  );

  replaceOnce(
    /(\| 🏷️ \*\*Versión\*\* \| `)[\d.]+(` \|)/,
    `$1${newVersion}$2`,
    'tabla "Versión"'
  );
  replaceOnce(
    /(\| 📅 \*\*Fecha de release\*\* \| )[^|]+( \|)/,
    `$1${fechaLarga()}$2`,
    'tabla "Fecha de release"'
  );

  return { md: out, warnings };
}

function updateReleaseNotesSection(md, ctx) {
  const { oldVersion, newVersion, notes, eol } = ctx;
  const warnings = [];
  let out = md;

  const sectionRe = new RegExp(
    `(## 🎉 Novedades de la versión )[\\d.]+([\\s\\S]*?)(?=\\n## )`
  );
  const sectionMatch = out.match(sectionRe);
  if (!sectionMatch) {
    warnings.push('No se encontró la sección "## 🎉 Novedades de la versión"');
  } else {
    const oldBody = sectionMatch[2].trim();
    out = out.replace(sectionRe, `$1${newVersion}${eol}${eol}${notes.join(eol)}${eol}`);

    const oldEsc = oldVersion.replace(/\./g, '\\.');
    const histEntryHeading = new RegExp(`^### .*v${oldEsc} — .*$`, 'm');
    if (histEntryHeading.test(out)) {
      const archive =
        `${eol}<details><summary>📄 Detalle técnico de la versión ${oldVersion}</summary>${eol}${eol}` +
        `${oldBody}${eol}${eol}</details>${eol}`;
      out = out.replace(histEntryHeading, (m) => `${m}${eol}${eol}${archive}`);
    } else {
      const archiveEntry =
        `### 📦 v${oldVersion} — (archivado)${eol}${eol}${oldBody}${eol}${eol}`;
      const histAnchor = /(^## 📜 Historial de versiones[\s\S]*?<br>)/m;
      if (histAnchor.test(out)) {
        out = out.replace(histAnchor, `$1${eol}${eol}${archiveEntry}`);
      } else {
        warnings.push('No se encontró el ancla del Historial para archivar la versión anterior');
      }
    }
  }

  if (!new RegExp(`v${newVersion.replace(/\./g, '\\.')} —`).test(out)) {
    const histEntry =
      `### 🆕 v${newVersion} — ${fechaCorta()}${eol}${eol}${notes.join(eol)}${eol}${eol}`;
    const histFirstEntry = /(^## 📜 Historial de versiones[\s\S]*?<br>[ \t]*\r?\n)/m;
    if (histFirstEntry.test(out)) {
      out = out.replace(histFirstEntry, `$1${eol}${histEntry}`);
    } else {
      warnings.push('No se encontró el ancla del Historial para insertar la nueva entrada');
    }
  }

  const summaryPattern = /(<summary>🧾 <b>)(v[\d.]+(?: · v[\d.]+)*)/;
  if (summaryPattern.test(out)) {
    const firstListed = out.match(summaryPattern)[2].split(' · ')[0];
    if (firstListed !== `v${newVersion}`) {
      out = out.replace(summaryPattern, `$1v${newVersion} · $2`);
    }
  } else {
    warnings.push('No se encontró el <summary> del Historial');
  }

  return { md: out, warnings };
}


function buildSummary(version, notes) {
  const first = (notes[0] || 'Release general')
    .replace(/^[-*]\s+/, '')
    .replace(/\*\*/g, '');
  const short = first.length > 48 ? first.slice(0, 45).trimEnd() + '…' : first;
  return `Release v${version}: ${short}`;
}

function buildDescription(version, notes) {
  return [
    `NPC Maker Pro v${version}`,
    '',
    'Cambios de esta versión:',
    ...notes.map((n) => `  ${n}`),
    '',
    `Tag del release:    ${tagFor(version)}`,
    `Título del release: ${releaseTitleFor(version)}`,
    'Artefactos:         Setup x64/ia32 + Portable x64/ia32 + SHA256SUMS.txt',
    'Detalles:           releaseNotes.md'
  ].join('\n');
}

function buildReleaseBody(version, notes, tldr) {
  const bullets = notes.map((n) => `> - ${n.replace(/^[-*]\s+/, '')}`).join('\n');
  return [
    '<div align="center">',
    '',
    `### 🎮 NPC Maker Pro v${version}`,
    '',
    `![Versión](https://img.shields.io/badge/version-${version}-d4af37?style=for-the-badge&labelColor=0f0f0f&color=b8860b)`,
    `![Plataforma](https://img.shields.io/badge/platform-Windows-0078D4?style=for-the-badge&logo=windows11&labelColor=0f0f0f)`,
    '',
    '</div>',
    '',
    '> [!NOTE]',
    `> **TL;DR —** ${(tldr || (notes[0] || 'Release').replace(/^[-*]\s+/, ''))}`,
    '',
    `## 🎉 Novedades de la versión ${version}`,
    '',
    bullets,
    '',
    '## 📦 Descargas',
    '',
    '| Arquitectura | Instalador | Portable |',
    '|:--|:--|:--|',
    '| x64 | `NPC-Maker-Pro-Setup-x64.exe` | `NPC-Maker-Pro-Portable-x64.exe` |',
    '| ia32 | `NPC-Maker-Pro-Setup-ia32.exe` | `NPC-Maker-Pro-Portable-ia32.exe` |',
    '',
    '## 🔐 Verificación SHA-256',
    '',
    'Los hashes de todos los artefactos están en `SHA256SUMS.txt`. Compara con:',
    '',
    '```',
    'certutil -hashfile NPC-Maker-Pro-Setup-x64.exe SHA256',
    '```',
    '',
    '---',
    '',
    `**Tag:** \`${tagFor(version)}\` · **Repositorio:** https://github.com/ricker72/Npc-Maker`
  ].join('\n');
}


function ensureOutDir() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
}

function writeArtifacts(version, notes, tldr) {
  ensureOutDir();
  const summary = buildSummary(version, notes);
  const description = buildDescription(version, notes);
  const body = buildReleaseBody(version, notes, tldr);
  fs.writeFileSync(path.join(OUT_DIR, 'commit-summary.txt'), summary + '\n', 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'commit-description.txt'), description + '\n', 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'github-release-body.md'), body + '\n', 'utf8');
  return { summary, description, body };
}

function loadContext() {
  const pkg = readJson(PKG_PATH);
  const notes = readPendingNotes();
  return { pkg, version: pkg.version, notes };
}

function printNext(args) {
  const { version } = loadContext();
  const next = bumpVersion(version, args.bump || 'patch');
  console.log([
    '⏭  SIGUIENTE VERSIÓN (la que se publicará después de esta)',
    '──────────────────────────────────────────────────────────',
    `  Nombre del release : ${releaseTitleFor(next)}`,
    `  Tag (GitHub)       : ${tagFor(next)}`,
    `  Versión (semver)   : ${next}`,
    `  URL del release    : https://github.com/ricker72/Npc-Maker/releases/tag/${tagFor(next)}`,
    '',
    `  (actual en package.json: v${version} — se sube con --bump ${args.bump || 'patch'})`
  ].join('\n'));
}

function cmdSummary(args) {
  const { version, notes } = loadContext();

  if (!args.write) {
    const effective = notes.length > 0 ? notes : ['- Mantenimiento general y correcciones.'];
    const summary = buildSummary(version, effective);
    const description = buildDescription(version, effective);
    console.log('SUMMARY (asunto del commit) [vista previa, sin escribir]:');
    console.log(summary);
    console.log('');
    console.log('DESCRIPTION (cuerpo del commit):');
    console.log(description);
    if (notes.length === 0) {
      console.log('');
      console.log('(Sin notas pendientes: esto es un marcador. Para regenerar de verdad: --write.)');
    }
    return;
  }

  const effective = notes.length > 0 ? notes : ['- Mantenimiento general y correcciones.'];
  const { summary, description } = writeArtifacts(version, effective, args.tldr);
  console.log('📝 SUMMARY (asunto del commit)');
  console.log('──────────────────────────────────────────────────────────');
  console.log(summary);
  console.log('');
  console.log('📄 DESCRIPTION (cuerpo del commit)');
  console.log('──────────────────────────────────────────────────────────');
  console.log(description);
  console.log('');
  console.log('💾 Generados en: tools/release/generated/');
}

function cmdBody(args) {
  const { version, notes } = loadContext();
  const generatedPath = path.join(OUT_DIR, 'github-release-body.md');

  if (notes.length === 0 && fs.existsSync(generatedPath) && !args.out && !args.write) {
    console.log(fs.readFileSync(generatedPath, 'utf8'));
    return;
  }
  if (notes.length === 0 && fs.existsSync(generatedPath) && args.out && !args.write) {
    fs.copyFileSync(generatedPath, args.out);
    console.log(`Release body copiado de generated/ a ${args.out}`);
    return;
  }

  const effective = notes.length > 0 ? notes : ['- Mantenimiento general y correcciones.'];
  if (!args.write && notes.length > 0) {
    console.log(buildReleaseBody(version, effective, args.tldr));
    console.log('');
    console.log('(Vista previa, sin escribir. Para regenerar: --write.)');
    return;
  }
  const { body } = writeArtifacts(version, effective, args.tldr);
  if (args.out) {
    fs.writeFileSync(args.out, body + '\n', 'utf8');
    console.log(`✅ Release body escrito en ${args.out}`);
  } else {
    console.log(body);
  }
}


function releaseNotesTemplate(version) {
  const eol = '\n';
  return [
    '### 📋 Release Notes · v' + version,
    '',
    '![Versión](https://img.shields.io/badge/version-' + version + '-d4af37?style=for-the-badge&labelColor=0f0f0f&color=b8860b)',
    '',
    '> [!NOTE]',
    '> **TL;DR —** ' + version,
    '',
    '1. [Resumen de la versión](#-resumen-de-la-versión)',
    '2. [Novedades de la versión ' + version + '](#-novedades-de-la-versión-' + version.replace(/\./g, '') + ')',
    '3. [Características principales](#-características-principales)',
    '4. [Historial de versiones](#-historial-de-versiones)',
    '',
    '## 📋 Resumen de la versión',
    '',
    '| 🏷️ **Versión** | `' + version + '` |',
    '| 📅 **Fecha de release** | ' + fechaLarga() + ' |',
    '',
    '## 🎉 Novedades de la versión ' + version,
    '',
    '## 🚀 Características principales',
    '',
    '## 📜 Historial de versiones',
    '',
    '<details>',
    '<summary>🧾 <b>v' + version + ' · ' + fechaCorta() + '</b></summary>',
    '<br>',
    '',
    '</details>',
    ''
  ].join(eol);
}

function readReleaseNotes() {
  if (!fs.existsSync(RN_PATH)) {
    const pkg = readJson(PKG_PATH);
    const seeded = releaseNotesTemplate(pkg.version);
    fs.writeFileSync(RN_PATH, seeded, 'utf8');
    return seeded;
  }
  return fs.readFileSync(RN_PATH, 'utf8');
}

function cmdPrepare(args) {
  const { pkg, version: oldVersion, notes } = loadContext();

  if (notes.length === 0) {
    console.error('❌ No hay notas pendientes.');
    console.error('   Escribe los cambios de la versión en tools/release/pending-notes.md');
    console.error('   (uno por línea) y vuelve a ejecutar.');
    process.exit(1);
  }

  const newVersion = bumpVersion(oldVersion, args.bump || 'patch');
  const tldr = typeof args.tldr === 'string' ? args.tldr : null;
  const rn = readReleaseNotes();
  const eol = fileEol(rn);

  const step1 = updateReleaseNotes(rn, { oldVersion, newVersion, notes, tldr, eol });
  const step2 = updateReleaseNotesSection(step1.md, { oldVersion, newVersion, notes, eol });
  const warnings = [...step1.warnings, ...step2.warnings];

  const summary = buildSummary(newVersion, notes);
  const description = buildDescription(newVersion, notes);

  console.log('🚀 PREPARACIÓN DE RELEASE');
  console.log('──────────────────────────────────────────────────────────');
  console.log(`  Versión anterior : v${oldVersion}`);
  console.log(`  Nueva versión    : v${newVersion}`);
  console.log(`  Nombre release   : ${releaseTitleFor(newVersion)}`);
  console.log(`  Tag (GitHub)     : ${tagFor(newVersion)}`);
  console.log(`  Fecha            : ${fechaLarga()}`);
  console.log('');
  console.log('📝 SUMMARY (asunto del commit)');
  console.log('──────────────────────────────────────────────────────────');
  console.log(summary);
  console.log('');
  console.log('📄 DESCRIPTION (cuerpo del commit)');
  console.log('──────────────────────────────────────────────────────────');
  console.log(description);
  console.log('');

  if (warnings.length > 0) {
    console.log('⚠️  Avisos (revisa releaseNotes.md a mano):');
    warnings.forEach((w) => console.log(`   · ${w}`));
    console.log('');
  }

  if (args['dry-run']) {
    console.log('🔍 dry-run: no se escribió ningún archivo.');
    return;
  }

  const { body } = writeArtifacts(newVersion, notes, tldr);
  void body;

  pkg.version = newVersion;
  writeJson(PKG_PATH, pkg);
  fs.writeFileSync(RN_PATH, step2.md, 'utf8');
  clearPendingNotes();

  console.log('✅ Archivos actualizados:');
  console.log('   · package.json                    (versión)');
  console.log('   · releaseNotes.md                 (badge, TOC, tabla, sección, historial)');
  console.log('   · tools/release/pending-notes.md  (vaciado)');
  console.log('   · tools/release/generated/        (summary, description, release body)');
  console.log('');
  console.log('▶ Siguiente paso:');
  console.log(`   git add -A && git commit -m "${summary}"`);
  console.log('');
  printNext({ bump: 'patch' });
}


function cmdCiSummary() {
  const { version, notes } = loadContext();

  const sumPath = path.join(OUT_DIR, 'commit-summary.txt');
  const descPath = path.join(OUT_DIR, 'commit-description.txt');
  const hasArtifacts = fs.existsSync(sumPath) && fs.existsSync(descPath);
  const effective = notes.length > 0 ? notes : ['- Mantenimiento general y correcciones.'];
  const summary = hasArtifacts
    ? fs.readFileSync(sumPath, 'utf8').trim()
    : buildSummary(version, effective);
  const description = hasArtifacts
    ? fs.readFileSync(descPath, 'utf8').trim()
    : buildDescription(version, effective);
  const next = bumpVersion(version, 'patch');
  const md = [
    `## 📦 NPC Maker Pro v${version}`,
    '',
    '| Campo | Valor |',
    '|:--|:--|',
    `| Nombre del release | \`${releaseTitleFor(version)}\` |`,
    `| Tag (GitHub) | \`${tagFor(version)}\` |`,
    `| Summary del commit | \`${summary.replace(/\|/g, '\\|')}\` |`,
    `| Siguiente versión | \`${next}\` → \`${tagFor(next)}\` / \`${releaseTitleFor(next)}\` |`,
    '',
    '<details><summary>📄 Description del commit</summary>',
    '',
    '```',
    description,
    '```',
    '',
    '</details>'
  ].join('\n');

  const dest = process.env.GITHUB_STEP_SUMMARY;
  if (dest) {
    fs.appendFileSync(dest, md + '\n', 'utf8');
    console.log('✅ Resumen añadido a GITHUB_STEP_SUMMARY');
  }
  console.log(md);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'help';

  switch (cmd) {
    case 'next': return printNext(args);
    case 'summary': return cmdSummary(args);
    case 'body': return cmdBody(args);
    case 'prepare': return cmdPrepare(args);
    case 'ci-summary': return cmdCiSummary();
    default:
      console.log([
        'NPC Maker Pro — CLI de releases',
        '',
        '  node tools/release/release.js next      [--bump patch|minor|major]',
        '      Nombre y tag de la SIGUIENTE versión para GitHub Releases.',
        '',
        '  node tools/release/release.js prepare  [--bump patch|minor|major|x.y.z]',
        '                                          [--tldr "..."] [--dry-run]',
        '      Sube la versión, actualiza releaseNotes.md y genera Summary +',
        '      Description para el commit. Usa tools/release/pending-notes.md.',
        '',
        '  node tools/release/release.js summary [--write]',
        '      Vista previa del Summary + Description (solo --write regenera).',
        '',
        '  node tools/release/release.js body [--out archivo.md] [--write]',
        '      Vista previa del cuerpo del Release (solo --write regenera).',
        '',
        '  node tools/release/release.js ci-summary',
        '      Resumen para $GITHUB_STEP_SUMMARY (GitHub Actions).'
      ].join('\n'));
  }
}

main();


