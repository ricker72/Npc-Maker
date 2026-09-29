#!/usr/bin/env node
'use strict';


const fs = require('fs');
const path = require('path');
const https = require('https');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_ASSETS =
  process.env.TIBIA_ASSETS ||
  path.join(process.env.LOCALAPPDATA || process.env.HOME || '', 'Tibia', 'packages', 'Tibia', 'assets');
const DEFAULT_OUT = path.join(ROOT, 'src', 'data', 'monsters.json');
const DEFAULT_CACHE = path.join(ROOT, '.cache', 'datapacks');

const DATAPACKS = [
  { id: 'crystalserver-global', repo: 'zimbadev/crystalserver', pack: 'data-global/monster' },
  { id: 'crystalserver-crystal', repo: 'zimbadev/crystalserver', pack: 'data-crystal/monster' },
  { id: 'canary', repo: 'opentibiabr/canary', pack: 'data-otservbr-global/monster' }
];

const EXTRA_GROUPS = {
  unclassified: { key: 'unclassified', name: 'Unclassified', official: false },
  bosses: { key: 'bosses', name: 'Bosses', official: false }
};

const FOLDER_GROUPS = {
  quests: { key: 'quest-bosses', name: 'Quest bosses' },
  raids: { key: 'raids', name: 'Raids' },
  event_creatures: { key: 'event-creatures', name: 'Event creatures' },
  nostalgia: { key: 'nostalgia', name: 'Nostalgia' },
  traps: { key: 'traps', name: 'Traps' },
  trainers: { key: 'training', name: 'Training' },
  familiars: { key: 'familiars', name: 'Familiars' },
  dawnport: { key: 'dawnport', name: 'Dawnport' },
  wild_magics: { key: 'wild-magics', name: 'Wild magic' },
  no_rest_for_the_wicked: { key: 'no-rest-for-the-wicked', name: 'No Rest for the Wicked' },
  targuna: { key: 'targuna', name: 'Targuna' },
  winter_update_2025: { key: 'winter-update-2025', name: 'Winter Update 2025' },
  newhaven_update_2025: { key: 'newhaven-update-2025', name: 'Newhaven Update 2025' }
};


const HELP = `Uso: node tools/data/update-monsters.js [opciones]

Opciones:
  --assets <dir>       Carpeta de assets del cliente Tibia
                       (por defecto ${DEFAULT_ASSETS})
  --datapack <dir>     Datapack local con los .lua de las criaturas
                       (desactiva la descarga; usa tu propio servidor)
  --out <archivo>      monsters.json de salida (por defecto src/data/monsters.json)
  --cache <dir>        Carpeta de caché de datapacks (por defecto .cache/datapacks)
  --keep-extra         Incluye criaturas fuera del bestiario/bosstiary oficial
                       (quests, raids, eventos, nostalgia...)
  --prefer-datapack-looktypes
                       Usa el looktype del datapack en vez del oficial del cliente
  --pin <repo>=<sha>   Fija el commit de un datapack (se puede repetir)
  --refresh            Ignora la caché y vuelve a descargar el datapack
  --offline            No usa la red (exige datapack local o caché completa)
  --check              Informe sin escribir el archivo
  --force              Escribe aunque el bestiario pierda criaturas
  --help               Esta ayuda
`;

function parseArgs(argv) {
  const opts = {
    assets: DEFAULT_ASSETS,
    datapack: null,
    out: DEFAULT_OUT,
    cache: DEFAULT_CACHE,
    keepExtra: false,
    preferDatapackLooktypes: false,
    pins: {},
    refresh: false,
    offline: false,
    check: false,
    force: false,
    help: false
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (!value) throw new Error(`Falta el valor de ${arg}`);
      return value;
    };
    if (arg === '--assets') opts.assets = next();
    else if (arg === '--datapack') opts.datapack = next();
    else if (arg === '--out') opts.out = next();
    else if (arg === '--cache') opts.cache = next();
    else if (arg === '--keep-extra') opts.keepExtra = true;
    else if (arg === '--prefer-datapack-looktypes') opts.preferDatapackLooktypes = true;
    else if (arg === '--pin') {
      const [repo, sha] = next().split('=');
      if (!repo || !sha) throw new Error('--pin espera owner/repo=sha');
      opts.pins[repo] = sha;
    } else if (arg === '--refresh') opts.refresh = true;
    else if (arg === '--offline') opts.offline = true;
    else if (arg === '--check') opts.check = true;
    else if (arg === '--force') opts.force = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else throw new Error(`Opción desconocida: ${arg} (usa --help)`);
  }
  return opts;
}

function group(number) {
  return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function normalizeName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}


function readVarint(buf, pos) {
  let result = 0;
  let shift = 0;
  let byte;
  do {
    byte = buf[pos++];
    result += (byte & 0x7f) * Math.pow(2, shift);
    shift += 7;
  } while (byte & 0x80);
  return [result, pos];
}

function parseFields(buf, start, end) {
  const fields = [];
  let pos = start;
  while (pos < end) {
    let key;
    [key, pos] = readVarint(buf, pos);
    const field = key >>> 3;
    const wireType = key & 7;
    let value;
    if (wireType === 0) {
      [value, pos] = readVarint(buf, pos);
    } else if (wireType === 2) {
      let length;
      [length, pos] = readVarint(buf, pos);
      value = buf.subarray(pos, pos + length);
      pos += length;
    } else if (wireType === 5) {
      value = buf.readUInt32LE(pos);
      pos += 4;
    } else if (wireType === 1) {
      value = Number(buf.readBigUInt64LE(pos));
      pos += 8;
    } else {
      throw new Error(`Wire type no soportado: ${wireType}`);
    }
    fields.push([field, wireType, value]);
  }
  return fields;
}

function decodeText(sub) {
  let end = sub.length;
  while (end > 0 && sub[end - 1] === 0) end--;
  return sub.subarray(0, end).toString('utf8').trim();
}

function scalarFields(buf) {
  const out = {};
  for (const [field, wireType, value] of parseFields(buf, 0, buf.length)) {
    out[field] = wireType === 2 ? value : Number(value);
  }
  return out;
}


function findStaticData(assetsDir) {
  const catalogPath = path.join(assetsDir, 'catalog-content.json');
  if (!fs.existsSync(catalogPath)) {
    throw new Error(
      `No se encontró catalog-content.json en:\n  ${assetsDir}\nUsa --assets "<carpeta>" (ej: %LOCALAPPDATA%\\Tibia\\packages\\Tibia\\assets)`
    );
  }
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const entries = Array.isArray(catalog) ? catalog : Object.values(catalog);
  const entry = entries.find((e) => e && e.type === 'staticdata');
  if (!entry || !entry.file) {
    throw new Error(`catalog-content.json no tiene una entrada "staticdata":\n  ${catalogPath}`);
  }
  const datPath = path.join(assetsDir, entry.file);
  if (!fs.existsSync(datPath)) {
    throw new Error(`La entrada "staticdata" apunta a un archivo inexistente:\n  ${datPath}`);
  }
  return { datPath, file: entry.file };
}

function readStaticData(assetsDir) {
  const { datPath, file } = findStaticData(assetsDir);
  const buf = fs.readFileSync(datPath);
  const monsters = [];
  const families = [];
  const bosses = [];

  for (const [field, wireType, value] of parseFields(buf, 0, buf.length)) {
    if (wireType !== 2) continue;
    if (field === 2) {
      const entry = scalarFields(value);
      if (entry[1] !== undefined && entry[2] !== undefined) {
        families.push({ id: Number(entry[1]), name: decodeText(entry[2]) });
      }
    } else if (field === 1 || field === 5) {
      const raw = parseFields(value, 0, value.length);
      const raceId = raw.find((f) => f[0] === 1);
      const name = raw.find((f) => f[0] === 2);
      const outfitField = raw.find((f) => f[0] === 3);
      const stars = raw.find((f) => f[0] === 4);
      if (!name || !outfitField || outfitField[1] !== 2) continue;
      const outfit = parseFields(outfitField[2], 0, outfitField[2].length);
      const colors = outfit.find((f) => f[0] === 2);
      const colorValues = colors && colors[1] === 2 ? scalarFields(colors[2]) : {};
      const lookTypeField = outfit.find((f) => f[0] === 1);
      const addonsField = outfit.find((f) => f[0] === 3);
      const mountField = outfit.find((f) => f[0] === 4);
      const record = {
        name: decodeText(name[2]),
        raceId: raceId ? Number(raceId[2]) : 0,
        lookType: lookTypeField ? Number(lookTypeField[2]) : 0,
        lookHead: Number(colorValues[1] || 0),
        lookBody: Number(colorValues[2] || 0),
        lookLegs: Number(colorValues[3] || 0),
        lookFeet: Number(colorValues[4] || 0),
        addons: addonsField ? Number(addonsField[2]) : 0,
        mount: mountField ? Number(mountField[2]) : 0,
        stars: stars ? Number(stars[2]) : 0
      };
      if (field === 1) monsters.push(record);
      else bosses.push(record);
    }
  }

  return { file, bytes: buf.length, monsters, families, bosses };
}


function loadAppModules() {
  const file = path.join(ROOT, 'src', 'monsterLuaGenerator.js');
  const src = fs.readFileSync(file, 'utf8');
  const names = [...src.matchAll(/^export (?:const|function) (\w+)/gm)].map((m) => m[1]);
  const cjs = src.replace(/^export /gm, '') + `\nmodule.exports = { ${names.join(', ')} };\n`;
  const mod = { exports: {} };
  vm.runInNewContext(cjs, {
    module: mod,
    exports: mod.exports,
    console,
    Date,
    Math,
    Number,
    String,
    Object,
    Array,
    JSON,
    RegExp,
    parseFloat,
    parseInt,
    isNaN
  });
  return mod.exports;
}

const { parseMonsterLuaFull } = loadAppModules();

function parseCreatureFile(text, folder, source) {
  const parsed = parseMonsterLuaFull(text);
  if (!parsed.name || parsed.name === 'Desconocido') return null;
  return { creature: parsed, folder, source };
}


function scanLocalDatapack(rootDir) {
  if (!fs.existsSync(rootDir)) throw new Error(`El datapack no existe: ${rootDir}`);
  const packs = new Map();
  const stack = [path.resolve(rootDir)];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        stack.push(full);
      } else if (entry.name.endsWith('.lua')) {
        const parts = path.relative(path.resolve(rootDir), full).split(path.sep);
        const idx = parts.lastIndexOf('monster');
        if (idx < 1) continue;
        const key = parts.slice(0, idx + 1).join('/');
        if (!packs.has(key)) packs.set(key, { pack: key, files: [] });
        packs.get(key).files.push(full);
      }
    }
  }
  const priority = (key) => {
    const known = DATAPACKS.findIndex((d) => d.pack === key);
    return known === -1 ? DATAPACKS.length : known;
  };
  return [...packs.values()].sort((a, b) => {
    const diff = priority(a.pack) - priority(b.pack);
    return diff !== 0 ? diff : a.pack.localeCompare(b.pack);
  });
}

function readLocalCreatures(pack, id) {
  const creatures = [];
  for (const file of pack.files) {
    const folder = path.basename(path.dirname(file));
    const parsed = parseCreatureFile(fs.readFileSync(file, 'utf8'), folder, id);
    if (parsed) creatures.push(parsed);
  }
  return creatures;
}


function httpGet(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      { headers: { 'User-Agent': 'npc-maker-pro-update-monsters', Accept: 'application/vnd.github+json' } },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} en ${url}`));
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }
    );
    request.on('error', reject);
    request.setTimeout(60000, () => request.destroy(new Error(`Timeout en ${url}`)));
  });
}

async function httpJson(url) {
  return JSON.parse((await httpGet(url)).toString('utf8'));
}

function repoCacheDir(repo, opts) {
  return path.join(opts.cache, repo.replace('/', '-'));
}

async function resolveCommit(repo, opts) {
  const dir = repoCacheDir(repo, opts);
  if (opts.pins[repo]) return { repo, sha: opts.pins[repo], date: null };
  const headFile = path.join(dir, 'head.json');
  const cached = fs.existsSync(headFile) ? JSON.parse(fs.readFileSync(headFile, 'utf8')) : null;
  if (cached && !opts.refresh && Date.now() - Date.parse(cached.checkedAt) < 24 * 3600 * 1000) return cached;
  if (opts.offline) {
    if (cached) return cached;
    throw new Error(`Sin red y sin caché de ${repo}: usa --datapack <ruta> o ejecuta una vez sin --offline`);
  }
  let info;
  try {
    info = await httpJson(`https://api.github.com/repos/${repo}/commits/main`);
  } catch (err) {
    info = await httpJson(`https://api.github.com/repos/${repo}/commits/master`);
  }
  const head = { repo, sha: info.sha, date: info.commit.committer.date, checkedAt: new Date().toISOString() };
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(headFile, JSON.stringify(head, null, 2));
  return head;
}

async function fetchMonsterPaths(repo, sha, opts) {
  const dir = path.join(repoCacheDir(repo, opts), sha);
  const cacheFile = path.join(dir, 'monster-paths.json');
  if (!opts.refresh && fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  if (opts.offline) throw new Error(`Sin red y sin caché de ${repo}@${sha} (--offline)`);
  const tree = await httpJson(`https://api.github.com/repos/${repo}/git/trees/${sha}?recursive=1`);
  const paths = tree.tree.filter((e) => e.type === 'blob' && /\/monster\/.*\.lua$/.test(e.path)).map((e) => e.path);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(paths));
  return paths;
}

async function ensureFiles(repo, sha, paths, opts) {
  const root = path.join(repoCacheDir(repo, opts), sha, 'files');
  const pending = paths.filter((rel) => !fs.existsSync(path.join(root, rel)));
  if (!pending.length) return root;
  if (opts.offline) {
    throw new Error(`Faltan ${group(pending.length)} ficheros en la caché y --offline está activo`);
  }
  let done = 0;
  let failed = 0;
  const queue = [...pending];
  await Promise.all(
    Array.from({ length: 24 }, async () => {
      while (queue.length) {
        const rel = queue.shift();
        const dest = path.join(root, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        try {
          fs.writeFileSync(dest, await httpGet(`https://raw.githubusercontent.com/${repo}/${sha}/${rel}`));
        } catch (err) {
          failed++;
        }
        done++;
        if (done % 250 === 0) process.stdout.write(`      ${done}/${pending.length} ficheros descargados\r`);
      }
    })
  );
  if (done >= 250) process.stdout.write(' '.repeat(48) + '\r');
  if (failed) console.log(`      (${group(failed)} ficheros no se pudieron descargar)`);
  return root;
}

function findLocalPackRoot(def, cacheRoot) {
  const packLeaf = def.pack.split('/')[0];
  const candidates = [
    path.join(cacheRoot, def.id),
    path.join(cacheRoot, def.id, 'monster'),
    path.join(ROOT, '.tmp-inspect', 'crystalserver-cache', packLeaf),
    path.join(ROOT, '.tmp-inspect', 'canary-cache'),
    path.join(ROOT, '.tmp-inspect', 'crystalserver-cache'),
  ];
  for (const base of candidates) {
    if (!base || !fs.existsSync(base)) continue;
    const files = collectPackLuas(base, null);
    const wanted =
      base === path.join(cacheRoot, def.id) || base === path.join(cacheRoot, def.id, 'monster')
        ? files
        : files.filter(
            (f) =>
              f.split(path.sep).join('/').includes(`${packLeaf}/monster/`) ||
              (def.id === 'canary' && f.split(path.sep).join('/').includes('monster/'))
          );
    if (wanted.length) return { base, files: wanted };
  }
  return null;
}

function collectPackLuas(baseDir, packSub) {
  const files = [];
  const start = packSub ? path.join(baseDir, packSub) : baseDir;
  const roots = fs.existsSync(start) ? [start] : fs.existsSync(baseDir) ? [baseDir] : [];
  const stack = [...roots];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name.endsWith('.lua')) files.push(full);
    }
  }
  return files.filter((f) => f.split(path.sep).includes('monster'));
}


async function loadDatapacks(opts, log) {
  const loaded = [];

  if (opts.datapack) {
    for (const pack of scanLocalDatapack(opts.datapack)) {
      const known = DATAPACKS.find((d) => d.pack === pack.pack);
      const id = known ? known.id : pack.pack.replace(/\//g, '-');
      const creatures = readLocalCreatures(pack, id);
      loaded.push({ id, pack: pack.pack, repo: null, sha: null, files: pack.files.length, creatures });
      log(`  datapack    : ${pack.pack} (${group(pack.files.length)} ficheros · ${group(creatures.length)} criaturas) [local]`);
    }
    if (!loaded.length) throw new Error(`No se encontró ninguna carpeta "monster" con .lua en ${opts.datapack}`);
    return loaded;
  }

  for (const def of DATAPACKS) {
    let commit = null;
    let offlineFiles = null;
    if (opts.offline) {
      const local = findLocalPackRoot(def, opts.cache);
      if (!local) {
        if (def.id === 'canary') {
          log(`  datapack    : ${def.id} — sin caché local, se omite (offline)`);
          continue;
        }
        throw new Error(
          `Sin red y sin caché de ${def.id}: ejecuta una vez sin --offline o usa --datapack <ruta>`
        );
      }
      offlineFiles = local.files;
      commit = { repo: def.repo, sha: 'local', date: null };
    } else {
      commit = await resolveCommit(def.repo, opts);
    }
    const depth = def.pack.split('/').length;
    const creatures = [];
    let fileCount = 0;
    if (offlineFiles) {
      fileCount = offlineFiles.length;
      for (const full of offlineFiles) {
        const rel = full.split(path.sep).join('/');
        const idx = rel.lastIndexOf(`${def.pack.split('/')[0]}/monster/`);
        const tail = idx === -1 ? rel : rel.slice(idx);
        const folder = tail.split('/')[2] || '';
        const parsed = parseCreatureFile(fs.readFileSync(full, 'utf8'), folder, def.id);
        if (parsed) creatures.push(parsed);
      }
    } else {
      const paths = await fetchMonsterPaths(def.repo, commit.sha, opts);
      const packPaths = paths.filter((p) => p.startsWith(`${def.pack}/`));
      const root = await ensureFiles(def.repo, commit.sha, packPaths, opts);
      fileCount = packPaths.length;
      for (const rel of packPaths) {
        const full = path.join(root, rel);
        if (!fs.existsSync(full)) continue;
        const parsed = parseCreatureFile(fs.readFileSync(full, 'utf8'), rel.split('/')[depth] || '', def.id);
        if (parsed) creatures.push(parsed);
      }
    }
    loaded.push({
      id: def.id,
      pack: def.pack,
      repo: def.repo,
      sha: commit.sha,
      date: commit.date,
      files: fileCount,
      creatures
    });
    log(
      `  datapack    : ${def.id} — ${def.repo}@${String(commit.sha).slice(0, 8)}` +
        ` (${group(fileCount)} ficheros · ${group(creatures.length)} criaturas)`
    );
  }
  return loaded;
}


function titleCase(name) {
  return String(name || '')
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function slugifyFolder(name) {
  return String(name || 'misc').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'misc';
}

function familyKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function makeGroup(key, name, official) {
  return { key, name, official, monsters: [] };
}

function serializeMonster({ details, official, family, preferDatapackLooktypes }) {
  const source = details ? details.source : 'client';
  const parsed = details ? details.creature : null;
  const outfit = (parsed && parsed.outfit) || {};
  const useOfficialLook = !!official && !!official.lookType && !preferDatapackLooktypes;
  const datapackLookType = parsed ? Number(outfit.lookType) || 0 : 0;
  const lookType = useOfficialLook ? official.lookType : datapackLookType || (official ? official.lookType : 0);
  const lookMount = official && official.mount ? official.mount : Number(outfit.lookMount) || 0;

  const entry = {
    name: parsed ? parsed.name : titleCase(official && official.name),
    lookType,
    lookHead: Number((useOfficialLook ? official.lookHead : outfit.lookHead)) || 0,
    lookBody: Number((useOfficialLook ? official.lookBody : outfit.lookBody)) || 0,
    lookLegs: Number((useOfficialLook ? official.lookLegs : outfit.lookLegs)) || 0,
    lookFeet: Number((useOfficialLook ? official.lookFeet : outfit.lookFeet)) || 0,
    lookAddons: Number((useOfficialLook ? official.addons : outfit.lookAddons)) || 0,
    lookMount,
    raceId: (parsed && parsed.raceId) || (official && official.raceId) || 0,
    health: (parsed && parsed.health) || 0,
    maxHealth: (parsed && (parsed.maxHealth || parsed.health)) || 0,
    experience: (parsed && parsed.experience) || 0,
    race: (parsed && parsed.race) || '',
    corpse: (parsed && parsed.corpse) || 0,
    speed: (parsed && parsed.speed) || 0,
    manaCost: (parsed && parsed.manaCost) || 0,
    description: (parsed && parsed.description) || '',
    family,
    source,
    lookTypeSource: useOfficialLook ? 'client' : parsed ? 'datapack' : 'client'
  };
  if (datapackLookType && datapackLookType !== lookType) entry.datapackLookType = datapackLookType;
  if (official && official.stars) entry.stars = official.stars;
  if (!parsed) return entry;

  const bestiary = parsed.bestiary;
  if (bestiary) {
    entry.toKill = bestiary.toKill;
    entry.firstUnlock = bestiary.firstUnlock;
    entry.secondUnlock = bestiary.secondUnlock;
    entry.charmsPoints = bestiary.charmsPoints;
    entry.occurrence = bestiary.occurrence;
    entry.locations = bestiary.locations || '';
    entry.bestiaryRace = bestiary.race || '';
    if (!entry.stars && bestiary.stars) entry.stars = bestiary.stars;
  }

  if (parsed.flags && Object.keys(parsed.flags).length) entry.flags = parsed.flags;
  if (parsed.light) entry.light = { level: parsed.light.level || 0, color: parsed.light.color || 0 };
  if (parsed.changeTarget) {
    entry.changeTarget = { interval: parsed.changeTarget.interval ?? 4000, chance: parsed.changeTarget.chance ?? 0 };
  }
  if (parsed.defenses) entry.defenses = parsed.defenses;

  const stripUid = (list) =>
    (list || []).map((entryWithUid) => {
      const clean = {};
      for (const [key, value] of Object.entries(entryWithUid)) {
        if (key === 'uid') continue;
        if (value === '' || value === undefined || value === null) continue;
        clean[key] = value;
      }
      return clean;
    });
  if (parsed.defenseAbilities && parsed.defenseAbilities.length) entry.defenseAbilities = stripUid(parsed.defenseAbilities);
  if (parsed.attacks && parsed.attacks.length) entry.attacks = stripUid(parsed.attacks);

  const elements = (parsed.elements || []).filter((e) => e.type).map((e) => [e.type, e.percent || 0]);
  if (elements.length) entry.elements = elements;
  const immunities = (parsed.immunities || []).filter((i) => i.type && i.condition).map((i) => i.type);
  if (immunities.length) entry.immunities = immunities;

  const loot = (parsed.loot || []).map((itemWithUid) => {
    const item = { name: itemWithUid.name || '' };
    if (itemWithUid.id) item.id = itemWithUid.id;
    item.chance = itemWithUid.chance ?? 1000;
    item.maxCount = itemWithUid.maxCount ?? 1;
    return item;
  });
  if (loot.length) entry.loot = loot;

  if (parsed.voices && (parsed.voices.list?.length || parsed.voices.interval)) {
    entry.voices = {
      interval: parsed.voices.interval ?? 5000,
      chance: parsed.voices.chance ?? 10,
      list: (parsed.voices.list || []).map((voice) => ({ text: voice.text, yell: !!voice.yell }))
    };
  }
  if (parsed.summon && (parsed.summon.maxSummons || parsed.summon.summons?.length)) {
    entry.summon = {
      maxSummons: parsed.summon.maxSummons ?? 0,
      summons: (parsed.summon.summons || []).map((summonWithUid) => {
        const clean = {};
        for (const [key, value] of Object.entries(summonWithUid)) {
          if (key === 'uid') continue;
          clean[key] = value;
        }
        return clean;
      })
    };
  }
  return entry;
}


function buildBestiary({ staticData, packs, opts }) {
  const stats = {
    duplicates: [],
    unknownClasses: new Set(),
    lookTypeMismatch: [],
    variants: [],
    withoutDatapack: [],
    withDatapack: 0,
    bossesWithDatapack: 0,
    extras: 0,
    official: 0,
    officialTotal: staticData.monsters.length,
    bosses: 0,
    bossesTotal: staticData.bosses.length,
    packs: packs.map((pack) => ({
      id: pack.id,
      repo: pack.repo,
      sha: pack.sha,
      date: pack.date,
      files: pack.files,
      creatures: pack.creatures.length
    }))
  };

  const byName = new Map();
  for (const pack of packs) {
    for (const item of pack.creatures) {
      const key = normalizeName(item.creature.name);
      if (!key) continue;
      const previous = byName.get(key);
      if (previous) {
        if (previous.source !== item.source) stats.duplicates.push(`${item.creature.name}: ${previous.source} → ${item.source}`);
        continue;
      }
      byName.set(key, { creature: item.creature, folder: item.folder, source: item.source });
    }
  }

  const groups = new Map();
  const order = [];
  const officialFamilyNames = new Set(staticData.families.map((family) => family.name));
  for (const family of staticData.families) {
    const key = familyKey(family.name);
    if (groups.has(key)) continue;
    groups.set(key, makeGroup(key, family.name, true));
    order.push(key);
  }
  const folderOrder = [];
  const groupFor = (key, name, official) => {
    if (!groups.has(key)) {
      groups.set(key, makeGroup(key, name, official));
      if (!official) folderOrder.push(key);
    }
    return groups.get(key);
  };

  const addMonster = (group, entry, details) => {
    group.monsters.push(entry);
    if (details && entry.lookTypeSource === 'client' && entry.datapackLookType) {
      stats.lookTypeMismatch.push(`${entry.name}: cliente ${entry.lookType} · datapack ${entry.datapackLookType}`);
    }
  };

  const usedNames = new Set();

  const chooseVariants = (list) => {
    const chosen = new Map();
    const dupes = new Map();
    for (const official of list) {
      const key = normalizeName(official.name);
      if (!dupes.has(key)) dupes.set(key, []);
      dupes.get(key).push(official);
      const current = chosen.get(key);
      if (!current) {
        chosen.set(key, official);
        continue;
      }
      const details = byName.get(key);
      const datapackLook = details && details.creature.outfit ? Number(details.creature.outfit.lookType) || 0 : 0;
      const currentMatches = datapackLook > 0 && datapackLook === current.lookType;
      const candidateMatches = datapackLook > 0 && datapackLook === official.lookType;
      if (candidateMatches && !currentMatches) chosen.set(key, official);
      else if (!currentMatches && !candidateMatches && official.raceId < current.raceId) chosen.set(key, official);
    }
    for (const [key, entries] of dupes) {
      if (entries.length < 2) continue;
      const kept = chosen.get(key);
      stats.variants.push(
        `${kept.name}: ${entries.length} variantes (clientid ${entries.map((e) => e.raceId).join('/')}, look ${entries.map((e) => e.lookType).join('/')}) → se usa el ${kept.raceId}`
      );
    }
    return chosen;
  };
  const officialMonsters = chooseVariants(staticData.monsters);
  const officialBosses = chooseVariants(staticData.bosses);

  for (const official of officialMonsters.values()) {
    stats.official++;
    const key = normalizeName(official.name);
    const details = byName.get(key) || null;
    usedNames.add(key);
    if (details) stats.withDatapack++;
    else stats.withoutDatapack.push(official.name);
    const className = details && details.creature.bestiary && details.creature.bestiary.class;
    if (className && !officialFamilyNames.has(className)) stats.unknownClasses.add(className);
    const group = className
      ? groupFor(familyKey(className), className, officialFamilyNames.has(className))
      : groupFor('unclassified', EXTRA_GROUPS.unclassified.name, false);
    const entry = serializeMonster({
      details,
      official,
      family: group.name,
      preferDatapackLooktypes: opts.preferDatapackLooktypes
    });
    addMonster(group, entry, details);
  }

  for (const official of officialBosses.values()) {
    const key = normalizeName(official.name);
    if (usedNames.has(key)) continue;
    stats.bosses++;
    const details = byName.get(key) || null;
    usedNames.add(key);
    if (details) stats.bossesWithDatapack++;
    const group = groupFor('bosses', EXTRA_GROUPS.bosses.name, false);
    const entry = serializeMonster({
      details,
      official,
      family: group.name,
      preferDatapackLooktypes: opts.preferDatapackLooktypes
    });
    group.monsters.push(entry);
    if (details && entry.lookTypeSource === 'client' && entry.datapackLookType) {
      stats.lookTypeMismatch.push(`${entry.name}: cliente ${entry.lookType} · datapack ${entry.datapackLookType}`);
    }
  }

  if (opts.keepExtra) {
    for (const pack of packs) {
      for (const item of pack.creatures) {
        const key = normalizeName(item.creature.name);
        if (usedNames.has(key)) continue;
        usedNames.add(key);
        const className = item.creature.bestiary && item.creature.bestiary.class;
        let group;
        if (className) {
          if (!officialFamilyNames.has(className)) stats.unknownClasses.add(className);
          group = groupFor(familyKey(className), className, officialFamilyNames.has(className));
        } else {
          const known = FOLDER_GROUPS[item.folder];
          group = known
            ? groupFor(known.key, known.name, false)
            : groupFor(
                `folder-${slugifyFolder(item.folder)}`,
                titleCase(slugifyFolder(item.folder).replace(/-/g, ' ')),
                false
              );
        }
        const entry = serializeMonster({
          details: item,
          official: null,
          family: group.name,
          preferDatapackLooktypes: true
        });
        group.monsters.push(entry);
        stats.extras++;
      }
    }
  }

  for (const key of order) {
    groups.get(key).monsters.sort((a, b) => a.name.localeCompare(b.name));
  }
  for (const key of folderOrder) {
    groups.get(key).monsters.sort((a, b) => a.name.localeCompare(b.name));
  }

  const families = [];
  for (const key of order) {
    const group = groups.get(key);
    if (group.monsters.length) families.push({ key: group.key, name: group.name, official: group.official, monsters: group.monsters });
  }
  for (const key of folderOrder) {
    const group = groups.get(key);
    if (group.monsters.length) families.push({ key: group.key, name: group.name, official: group.official, monsters: group.monsters });
  }

  const data = {
    generated: new Date().toISOString().slice(0, 10),
    sources: {
      client: {
        file: staticData.file,
        bytes: staticData.bytes,
        monsters: staticData.monsters.length,
        families: staticData.families.length,
        bosses: staticData.bosses.length
      },
      datapacks: stats.packs
    },
    families
  };
  return { data, stats, total: families.reduce((sum, family) => sum + family.monsters.length, 0) };
}


async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write(HELP);
    return;
  }

  const log = (line) => process.stdout.write(line + '\n');
  const staticData = readStaticData(opts.assets);
  const packs = await loadDatapacks(opts, log);
  const { data, stats, total } = buildBestiary({ staticData, packs, opts });

  log('NPC Maker Pro · update-monsters — bestiario oficial del cliente Tibia');
  log('  cliente       : ' + staticData.file);
  log('                  ' + group(staticData.bytes) + ' bytes · ' + group(staticData.monsters.length) + ' monstruos · ' + group(staticData.families.length) + ' familias · ' + group(staticData.bosses.length) + ' bosses');
  for (const pack of stats.packs) {
    log('  datapack      : ' + pack.id + ' (' + String(pack.sha).slice(0, 12) + ') · ' + group(pack.creatures) + ' criaturas parseadas de ' + group(pack.files) + ' ficheros');
  }
  log('  bestiario     : ' + group(stats.official) + '/' + group(stats.officialTotal) + ' oficiales · ' + group(stats.withDatapack) + ' con datos del datapack · ' + group(stats.withoutDatapack.length) + ' solo-cliente');
  log('  bosstiary     : ' + group(stats.bosses) + '/' + group(stats.bossesTotal) + ' oficiales · ' + group(stats.bossesWithDatapack) + ' con datos del datapack');
  if (stats.variants.length) {
    log('  variantes     : ' + group(stats.variants.length) + ' variantes con el mismo nombre en el cliente (se queda la que coincide con el datapack)');
    for (const line of stats.variants) log('                  ' + line);
  }
  if (stats.extras) log('  extras        : ' + group(stats.extras) + ' criaturas fuera del bestiario (--keep-extra)');
  if (stats.unknownClasses.size) log('  clases nuevas : ' + [...stats.unknownClasses].join(', '));
  if (stats.lookTypeMismatch.length) {
    log('  looktypes     : ' + group(stats.lookTypeMismatch.length) + ' difieren entre cliente y datapack (se usa el oficial)');
    for (const line of stats.lookTypeMismatch.slice(0, 8)) log('                  ' + line);
    if (stats.lookTypeMismatch.length > 8) log('                  ... y ' + group(stats.lookTypeMismatch.length - 8) + ' más (--prefer-datapack-looktypes para usar los del datapack)');
  }
  log('  familias      : ' + group(data.families.length) + ' grupos · ' + group(total) + ' criaturas en total');
  for (const family of data.families) log('                  ' + family.name + ': ' + group(family.monsters.length));

  if (opts.check) {
    log('\n--check: informe únicamente, no se escribió ningún archivo.');
    return;
  }

  if (!opts.force) {
    if (stats.official < 800) throw new Error('El bestiario oficial trae ' + stats.official + ' monstruos (< 800): abortado por seguridad (usa --force para escribirlo igual).');
    if (stats.withDatapack < stats.official * 0.9) throw new Error('Solo ' + stats.withDatapack + '/' + stats.official + ' monstruos oficiales tienen datos del datapack (< 90%): abortado por seguridad (usa --force para escribirlo igual).');
  }

  fs.mkdirSync(path.dirname(opts.out), { recursive: true });
  fs.writeFileSync(opts.out, JSON.stringify(data, null, 2));
  const bytes = fs.statSync(opts.out).size;
  log('');
  log('  escrito ' + path.relative(ROOT, opts.out) + ' (' + group(bytes) + ' bytes)');
}

main().catch((err) => {
  console.error('\nError: ' + err.message);
  process.exit(1);
});
