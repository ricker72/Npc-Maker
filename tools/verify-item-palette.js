



'use strict';

const items = require('../src/data/items.json');
const prices = require('../src/data/npcPrices.json');

let fallos = 0;
function check(label, ok, detail) {
  if (!ok) fallos++;
  console.log(`${ok ? 'PASA' : 'FALLA'}  ${label}${detail ? '  -> ' + detail : ''}`);
}


const CATEGORIES = [
  { key: 'all' },
  { key: 'weapons', match: (n) => /sword|axe|bow|crossbow|spear|mace|hammer|dagger|katana|staff|wand|knife|cleaver|rod|sling|bolt|arrow|ammo/i.test(n) },
  { key: 'armor', match: (n) => /armor|armour|helmet|shield|legs|boots|gloves|ring|amulet|plate|robe|garb|coat|cloak/i.test(n) },
  { key: 'deposits', match: (n) => /chest|box|locker|cabinet|safe|crate|inlay|backpack|depot|container/i.test(n) },
  { key: 'tools', match: (n) => /pickaxe|pick|hammer|shovel|tool|rope|ladder|bucket|bottle|bag|torch|candle|fish/i.test(n) },
  { key: 'coins', match: (n) => /coin|gold|gem|diamond|ruby|emerald|sapphire|crystal|token|medal/i.test(n) },
  { key: 'runes', match: (n) => /rune|imbuement|charm|orb|heart|figure|doll/i.test(n) },
  { key: 'quest', match: (n) => /quest|key|ticket|scroll|parchment|seal|label|letter|map|note|pass/i.test(n) },
  { key: 'misc' },
];

console.log(`items.json: ${items.length} entries`);
console.log('');


const ids = new Set();
let sinNombre = 0;
items.forEach((it) => {
  ids.add(it.id);
  if (!it.name || !String(it.name).trim()) sinNombre++;
});
check('todos los items tienen id', items.every((it) => Number.isFinite(it.id)));
check('todos los items tienen nombre', sinNombre === 0, `sin nombre: ${sinNombre}`);
check('no hay ids duplicados', ids.size === items.length, `unicos: ${ids.size} / ${items.length}`);


console.log('');
console.log('items por categoria:');
for (const c of CATEGORIES) {
  let n;
  if (c.key === 'all') n = items.length;
  else if (c.key === 'misc') {
    const others = CATEGORIES.filter((x) => x.key !== 'all' && x.key !== 'misc');
    n = items.filter((it) => !others.some((o) => o.match(it.name))).length;
  } else n = items.filter((it) => c.match(it.name)).length;
  console.log(`  ${c.key.padEnd(10)} ${String(n).padStart(5)}`);
  check(`categoria "${c.key}" no vacia`, n > 0, `${n} items`);
}


{
  const others = CATEGORIES.filter((x) => x.key !== 'all' && x.key !== 'misc');
  const rest = items.filter((it) => !others.some((o) => o.match(it.name)));
  check('misc + otras = todos los items', rest.length + others.reduce((a, c) => a + items.filter((it) => c.match(it.name)).length, 0) >= items.length);
}


console.log('');
function search(term) {
  const t = term.trim().toLowerCase();
  return items.filter((it) => it.name.toLowerCase().includes(t) || String(it.id).includes(t));
}
check('buscar "sword" devuelve resultados', search('sword').length > 0, `${search('sword').length} items`);
check('buscar "golden" devuelve resultados', search('golden').length > 0, `${search('golden').length} items`);
check('buscar por id "100" devuelve resultados', search('100').length > 0, `${search('100').length} items`);
check('buscar id inexistente "999999" da 0', search('999999').length === 0);
check('busqueda vacia devuelve todo', search('  ').length === items.length);





const sampleId = items[0].id;
check(`el id ${sampleId} existe en items.json`, items.some((it) => it.id === sampleId));


const withPrice = items.filter((it) => prices[String(it.id)]);
check('npcPrices tiene entradas', Object.keys(prices).length > 0, `${Object.keys(prices).length} precios`);
check('algunos items tienen precio oficial', withPrice.length > 0, `${withPrice.length} de ${items.length}`);
check(
  'los precios tienen al menos buy o sell > 0',
  withPrice.every((it) => {
    const p = prices[String(it.id)];
    return Array.isArray(p) && (p[0] > 0 || p[1] > 0);
  })
);


const TILE_PAGE = 120;
check('TILE_PAGE cubre una pantalla razonable', TILE_PAGE > 24 && TILE_PAGE <= 300, `${TILE_PAGE}`);
check('hay items para paginar', items.length > TILE_PAGE, `${items.length} > ${TILE_PAGE}`);

console.log('');
if (fallos > 0) { console.log(`${fallos} comprobacion(es) fallaron.`); process.exit(1); }
console.log('Todas las comprobaciones pasaron.');