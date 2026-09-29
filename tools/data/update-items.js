#!/usr/bin/env node
'use strict';


const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_ASSETS =
  process.env.TIBIA_ASSETS ||
  path.join(process.env.LOCALAPPDATA || process.env.HOME || '', 'Tibia', 'packages', 'Tibia', 'assets');
const DEFAULT_ITEMS = path.join(ROOT, 'src', 'data', 'items.json');
const DEFAULT_PRICES = path.join(ROOT, 'src', 'data', 'npcPrices.json');

const HELP = `Uso: node tools/data/update-items.js [opciones]

Opciones:
  --assets <dir>           Carpeta de assets del cliente Tibia
                           (por defecto ${DEFAULT_ASSETS})
  --items <archivo>        items.json de salida (por defecto src/data/items.json)
  --prices <archivo>       npcPrices.json de salida (por defecto src/data/npcPrices.json)
  --prefer-client-names    Usa el nombre del cliente aunque el heredado sea distinto
  --keep-legacy-all        No descarta tiles ni ids que ya no existen en el cliente
  --check                  Informe sin escribir archivos
  --help                   Esta ayuda
`;

function parseArgs(argv) {
  const opts = {
    assets: DEFAULT_ASSETS,
    items: DEFAULT_ITEMS,
    prices: DEFAULT_PRICES,
    preferClientNames: false,
    keepLegacyAll: false,
    check: false,
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
    else if (arg === '--items') opts.items = next();
    else if (arg === '--prices') opts.prices = next();
    else if (arg === '--prefer-client-names') opts.preferClientNames = true;
    else if (arg === '--keep-legacy-all') opts.keepLegacyAll = true;
    else if (arg === '--check') opts.check = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else throw new Error(`Opción desconocida: ${arg} (usa --help)`);
  }
  return opts;
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

const group = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');


function findAppearances(assetsDir) {
  const catalogPath = path.join(assetsDir, 'catalog-content.json');
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`No se encontró catalog-content.json en:\n  ${assetsDir}\nUsa --assets "<carpeta>" (ej: %LOCALAPPDATA%\\Tibia\\packages\\Tibia\\assets)`);
  }
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const entries = Array.isArray(catalog) ? catalog : Object.values(catalog);
  const entry = entries.find((e) => e && e.type === 'appearances');
  if (!entry || !entry.file) {
    throw new Error(`catalog-content.json no tiene una entrada "appearances":\n  ${catalogPath}`);
  }
  const datPath = path.join(assetsDir, entry.file);
  if (!fs.existsSync(datPath)) {
    throw new Error(`La entrada "appearances" apunta a un archivo inexistente:\n  ${datPath}`);
  }
  return { datPath, file: entry.file };
}

function parseAppearances(datPath) {
  const blob = fs.readFileSync(datPath);
  const objects = new Map();
  const special = {};
  let entries = 0;

  for (const [field, wireType, value] of parseFields(blob, 0, blob.length)) {
    if (wireType !== 2) continue;

    if (field === 5) {
      for (const [sf, swt, sv] of parseFields(value, 0, value.length)) {
        if (swt === 0) special[sf] = sv;
      }
      continue;
    }
    if (field !== 1) continue;

    entries++;
    const item = { id: 0, name: '', description: '', market: null, shops: [], unmove: false, take: false };
    for (const [f, wt, v] of parseFields(value, 0, value.length)) {
      if (f === 1 && wt === 0) {
        item.id = v;
      } else if (f === 4 && wt === 2) {
        item.name = decodeText(v);
      } else if (f === 5 && wt === 2) {
        item.description = decodeText(v);
      } else if (f === 3 && wt === 2) {
        for (const [gf, gwt, gv] of parseFields(v, 0, v.length)) {
          if (gwt === 0) {
            if (gf === 14) item.unmove = true;
            else if (gf === 18) item.take = true;
          } else if (gwt === 2 && gf === 36) {
            const market = {};
            for (const [mf, mwt, mv] of parseFields(gv, 0, gv.length)) {
              market[mf] = mwt === 2 ? decodeText(mv) : mv;
            }
            item.market = market;
          } else if (gwt === 2 && gf === 40) {
            const shop = {};
            for (const [sf, swt, sv] of parseFields(gv, 0, gv.length)) {
              shop[sf] = swt === 2 ? decodeText(sv) : sv;
            }
            item.shops.push(shop);
          }
        }
      }
    }
    if (item.id > 0) objects.set(item.id, item);
  }

  return { objects, special, entries, bytes: blob.length };
}

function loadLegacy(file) {
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(data)) throw new Error(`${file} no es un array de items`);
  return data.filter((it) => it && Number.isFinite(it.id) && typeof it.name === 'string');
}



function buildItems(appearances, legacy, opts) {
  const byId = new Map();
  const stats = { official: 0, addedOfficial: 0, legacyKept: 0, legacyTiles: 0, legacyGone: 0, renamed: [] };

  for (const item of legacy) {
    const legacyName = item.name.trim();
    if (!legacyName) continue;
    const official = appearances.get(item.id);

    if (!official) {
      stats.legacyGone++;
      if (opts.keepLegacyAll && !byId.has(item.id)) byId.set(item.id, legacyName);
      continue;
    }
    if (official.unmove && !official.take && !opts.keepLegacyAll) {
      stats.legacyTiles++;
      continue;
    }

    const name = opts.preferClientNames && official.name ? official.name : legacyName;
    if (official.name && official.name !== legacyName) stats.renamed.push([item.id, legacyName, official.name]);
    if (!byId.has(item.id)) {
      byId.set(item.id, name);
      stats.legacyKept++;
    }
  }

  for (const official of appearances.values()) {
    if (!official.name) continue;
    stats.official++;
    if (!byId.has(official.id)) {
      byId.set(official.id, official.name);
      stats.addedOfficial++;
    }
  }

  const items = [...byId.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.id - b.id);
  return { items, stats };
}

function buildPrices(appearances, catalog) {
  const prices = {};
  const stats = { records: 0, specialCurrency: 0, skipped: 0, unnamed: 0, npcs: new Set(), cities: new Set() };

  for (const official of appearances.values()) {
    if (!official.shops.length) continue;

    for (const shop of official.shops) {
      stats.records++;
      if (shop[5] || shop[6]) stats.specialCurrency++;
      if (shop[1]) stats.npcs.add(shop[1]);
      if (shop[2]) stats.cities.add(shop[2]);
    }

    if (!catalog.has(official.id)) {
      stats.unnamed++;
      continue;
    }

    const gold = official.shops.filter((shop) => !shop[5] && !shop[6]);
    const sellers = gold.filter((s) => s[3] > 0).sort((a, b) => a[3] - b[3]);
    const buyers = gold.filter((s) => s[4] > 0).sort((a, b) => b[4] - a[4]);
    if (!sellers.length && !buyers.length) {
      stats.skipped++;
      continue;
    }

    const reference = sellers[0] || buyers[0];
    prices[official.id] = [
      sellers.length ? sellers[0][3] : 0,
      buyers.length ? buyers[0][4] : 0,
      reference[1] || '',
      reference[2] || ''
    ];
  }

  return { prices, stats };
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
  return fs.statSync(file).size;
}


function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write(HELP);
    return;
  }

  const { datPath, file } = findAppearances(opts.assets);
  const { objects, special, entries, bytes } = parseAppearances(datPath);
  const legacy = loadLegacy(opts.items);
  const { items, stats } = buildItems(objects, legacy, opts);
  const { prices, stats: priceStats } = buildPrices(objects, new Set(items.map((item) => item.id)));

  console.log('NPC Maker Pro · update-items — fuente oficial del cliente Tibia');
  console.log(`  assets      : ${opts.assets}`);
  console.log(`  appearances : ${file}`);
  console.log(`                ${group(bytes)} bytes · ${group(entries)} objects · ${group(objects.size)} ids`);
  console.log(`  ids clave   : gold coin=${special[1] || '?'} · platinum=${special[2] || '?'} · crystal=${special[3] || '?'} · tibia coins=${special[4] || '?'}`);
  const priceCount = Object.keys(prices).length;
  console.log(`  venta NPC   : ${group(priceCount)} items con precio oficial · ${group(priceStats.records)} registros · ${group(priceStats.npcs.size)} NPCs · ${group(priceStats.cities.size)} localizaciones`);
  if (priceStats.specialCurrency) {
    console.log(`                (${group(priceStats.specialCurrency)} pagos con moneda especial: favor, trust points, event points, theons...)`);
  }
  if (priceStats.skipped) {
    console.log(`                (${group(priceStats.skipped)} items solo se venden/pagan con moneda especial: sin precio en oro)`);
  }
  if (priceStats.unnamed) {
    console.log(`                (${group(priceStats.unnamed)} items vendidos por NPC no tienen nombre en el cliente y quedan fuera)`);
  }
  console.log('');
  console.log(`  items.json  : ${group(legacy.length)} → ${group(items.length)}`);
  console.log(`                + ${group(stats.addedOfficial)} items incluidos desde la fuente oficial`);
  console.log(`                = ${group(stats.legacyKept)} heredados conservados · descartados ${group(stats.legacyTiles)} tiles y ${group(stats.legacyGone)} ids obsoletos`);
  console.log(`  nombres     : ${group(stats.renamed.length)} heredados difieren del nombre oficial del cliente`);
  for (const [id, legacyName, officialName] of stats.renamed.slice(0, 5)) {
    console.log(`                #${id} "${legacyName}" (cliente: "${officialName}")`);
  }
  if (stats.renamed.length > 5) console.log(`                ... y ${group(stats.renamed.length - 5)} más (--prefer-client-names para usar los del cliente)`);

  if (opts.check) {
    console.log('\n--check: informe únicamente, no se escribió ningún archivo.');
    return;
  }

  const itemsBytes = writeJson(opts.items, items);
  const pricesBytes = writeJson(opts.prices, prices);
  console.log('');
  console.log(`  escrito ${path.relative(ROOT, opts.items)} (${group(itemsBytes)} bytes)`);
  console.log(`  escrito ${path.relative(ROOT, opts.prices)} (${group(pricesBytes)} bytes)`);
}

try {
  main();
} catch (err) {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
}
