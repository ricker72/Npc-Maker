// monsterLuaGenerator.js
// Genera scripts Lua de monstruos 100% compatibles con el formato real de
// CrystalServer (Game.createMonsterType + tabla monster + mType:register).

const escapeLua = (str = '') => String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const sanitizeName = (name) => (name || 'unnamed_monster').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

function fmtNum(n) {
  return Number.isFinite(n) ? n : 0;
}

export function generateMonsterLua(monster) {
  const m = monster;
  let s = '';

  s += `local mType = Game.createMonsterType("${escapeLua(m.name)}")\n`;
  s += `local monster = {}\n\n`;

  s += `monster.description = "${escapeLua(m.description)}"\n`;
  s += `monster.experience = ${fmtNum(m.experience)}\n`;
  s += `monster.outfit = {\n`;
  s += `\tlookType = ${fmtNum(m.outfit.lookType)},\n`;
  s += `\tlookHead = ${fmtNum(m.outfit.lookHead)},\n`;
  s += `\tlookBody = ${fmtNum(m.outfit.lookBody)},\n`;
  s += `\tlookLegs = ${fmtNum(m.outfit.lookLegs)},\n`;
  s += `\tlookFeet = ${fmtNum(m.outfit.lookFeet)},\n`;
  s += `\tlookAddons = ${fmtNum(m.outfit.lookAddons)},\n`;
  s += `\tlookMount = ${fmtNum(m.outfit.lookMount)},\n`;
  s += `}\n\n`;

  if (m.raceId) {
    s += `monster.raceId = ${fmtNum(m.raceId)}\n`;
  }
  if (m.bestiary?.class) {
    s += `monster.Bestiary = {\n`;
    s += `\tclass = "${escapeLua(m.bestiary.class)}",\n`;
    s += `\trace = ${m.bestiary.race},\n`;
    s += `\ttoKill = ${fmtNum(m.bestiary.toKill)},\n`;
    s += `\tFirstUnlock = ${fmtNum(m.bestiary.firstUnlock)},\n`;
    s += `\tSecondUnlock = ${fmtNum(m.bestiary.secondUnlock)},\n`;
    s += `\tCharmsPoints = ${fmtNum(m.bestiary.charmsPoints)},\n`;
    s += `\tStars = ${fmtNum(m.bestiary.stars)},\n`;
    s += `\tOccurrence = ${fmtNum(m.bestiary.occurrence)},\n`;
    s += `\tLocations = "${escapeLua(m.bestiary.locations)}",\n`;
    s += `}\n\n`;
  }

  s += `monster.health = ${fmtNum(m.health)}\n`;
  s += `monster.maxHealth = ${fmtNum(m.maxHealth)}\n`;
  s += `monster.race = "${escapeLua(m.race)}"\n`;
  s += `monster.corpse = ${fmtNum(m.corpse)}\n`;
  s += `monster.speed = ${fmtNum(m.speed)}\n`;
  s += `monster.manaCost = ${fmtNum(m.manaCost)}\n\n`;

  s += `monster.changeTarget = {\n\tinterval = ${fmtNum(m.changeTarget.interval)},\n\tchance = ${fmtNum(m.changeTarget.chance)},\n}\n\n`;

  s += `monster.flags = {\n`;
  Object.entries(m.flags).forEach(([key, value]) => {
    s += `\t${key} = ${typeof value === 'boolean' ? value : fmtNum(value)},\n`;
  });
  s += `}\n\n`;

  s += `monster.light = {\n\tlevel = ${fmtNum(m.light.level)},\n\tcolor = ${fmtNum(m.light.color)},\n}\n\n`;

  s += `monster.voices = {\n\tinterval = ${fmtNum(m.voices.interval)},\n\tchance = ${fmtNum(m.voices.chance)},\n`;
  (m.voices.list || []).forEach((v) => {
    s += `\t{ text = "${escapeLua(v.text)}"${v.yell ? ', yell = true' : ''} },\n`;
  });
  s += `}\n\n`;

  if (m.loot?.length) {
    s += `monster.loot = {\n`;
    m.loot.forEach((item) => {
      const idOrName = item.id ? `id = ${fmtNum(item.id)}` : `name = "${escapeLua(item.name)}"`;
      let line = `\t{ ${idOrName}, chance = ${fmtNum(item.chance)}`;
      if (item.maxCount && item.maxCount > 1) line += `, maxCount = ${fmtNum(item.maxCount)}`;
      line += ' },\n';
      s += line;
    });
    s += `}\n\n`;
  }

  if (m.attacks?.length) {
    s += `monster.attacks = {\n`;
    m.attacks.forEach((a) => {
      const parts = [`name = "${escapeLua(a.name)}"`, `interval = ${fmtNum(a.interval)}`, `chance = ${fmtNum(a.chance)}`];
      if (a.minDamage !== undefined && a.minDamage !== '') parts.push(`minDamage = ${fmtNum(a.minDamage)}`);
      if (a.maxDamage !== undefined && a.maxDamage !== '') parts.push(`maxDamage = ${fmtNum(a.maxDamage)}`);
      if (a.range) parts.push(`range = ${fmtNum(a.range)}`);
      if (a.radius) parts.push(`radius = ${fmtNum(a.radius)}`);
      if (a.target) parts.push('target = true');
      // Ataques tipo "speed" (paralyze/slow): speedChange/effect/duration
      if (a.speedChange) parts.push(`speedChange = ${fmtNum(a.speedChange)}`);
      if (a.effect) parts.push(`effect = ${a.effect}`);
      if (a.duration) parts.push(`duration = ${fmtNum(a.duration)}`);
      // Daño continuo (DoT): condition = { type = CONDITION_X, totalDamage, interval }
      if (a.condition?.type) {
        parts.push(`condition = { type = ${a.condition.type}, totalDamage = ${fmtNum(a.condition.totalDamage)}, interval = ${fmtNum(a.condition.interval)} }`);
      }
      s += `\t{ ${parts.join(', ')} },\n`;
    });
    s += `}\n\n`;
  }

  s += `monster.defenses = {\n\tdefense = ${fmtNum(m.defenses.defense)},\n\tarmor = ${fmtNum(m.defenses.armor)},\n\tmitigation = ${m.defenses.mitigation || 0},\n`;
  (m.defenseAbilities || []).forEach((d) => {
    const parts = [`name = "${escapeLua(d.name)}"`, `interval = ${fmtNum(d.interval)}`, `chance = ${fmtNum(d.chance)}`];
    if (d.minDamage !== undefined && d.minDamage !== '') parts.push(`minDamage = ${fmtNum(d.minDamage)}`);
    if (d.maxDamage !== undefined && d.maxDamage !== '') parts.push(`maxDamage = ${fmtNum(d.maxDamage)}`);
    if (d.speedChange) parts.push(`speedChange = ${fmtNum(d.speedChange)}`);
    if (d.effect) parts.push(`effect = ${d.effect}`);
    if (d.duration) parts.push(`duration = ${fmtNum(d.duration)}`);
    if (d.target) parts.push('target = true');
    s += `\t{ ${parts.join(', ')} },\n`;
  });
  s += `}\n\n`;

  s += `monster.elements = {\n`;
  m.elements.forEach((e) => {
    s += `\t{ type = ${e.type}, percent = ${fmtNum(e.percent)} },\n`;
  });
  s += `}\n\n`;

  s += `monster.immunities = {\n`;
  m.immunities.forEach((i) => {
    s += `\t{ type = "${i.type}", condition = ${i.condition ? 'true' : 'false'} },\n`;
  });
  s += `}\n\n`;

  if (m.summon?.summons?.length) {
    s += `monster.summon = {\n\tmaxSummons = ${fmtNum(m.summon.maxSummons)},\n\tsummons = {\n`;
    m.summon.summons.forEach((sm) => {
      s += `\t\t{ name = "${escapeLua(sm.name)}", chance = ${fmtNum(sm.chance)}, interval = ${fmtNum(sm.interval)}, count = ${fmtNum(sm.count)} },\n`;
    });
    s += `\t},\n}\n\n`;
  }

  s += `mType:register(monster)\n`;

  return s;
}

export function getMonsterFileName(name) {
  return `${sanitizeName(name)}.lua`;
}

// ─────────────────────────────────────────────────────────────────────────
// Parser "completo" (basado en regex + conteo de llaves, no es un parser
// Lua real, pero cubre con fidelidad la estructura que genera esta misma
// app y la que usan los monstruos reales de CrystalServer/Canary).
// ─────────────────────────────────────────────────────────────────────────

// Devuelve el contenido interno (sin las llaves externas) del bloque
// "monster.KEY = { ... }", manejando correctamente llaves anidadas
// (por ejemplo el sub-bloque "condition = {...}" dentro de un ataque).
// Devuelve el contenido interno (sin llaves externas) del bloque "KEY = {...}"
// dentro de un texto arbitrario (no requiere el prefijo "monster."), usando
// conteo de llaves para soportar anidamiento.
function extractSubBlock(text, key) {
  const marker = new RegExp(`\\b${key}\\s*=\\s*\\{`);
  const m = text.match(marker);
  if (!m) return null;
  const braceStart = m.index + m[0].length - 1;
  let depth = 0;
  for (let i = braceStart; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(braceStart + 1, i);
    }
  }
  return null;
}

function extractBlock(luaText, key) {
  const marker = `monster.${key}`;
  const idx = luaText.indexOf(marker);
  if (idx === -1) return null;
  const braceStart = luaText.indexOf('{', idx);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < luaText.length; i++) {
    if (luaText[i] === '{') depth++;
    else if (luaText[i] === '}') {
      depth--;
      if (depth === 0) return luaText.slice(braceStart + 1, i);
    }
  }
  return null;
}

// Divide el contenido de un bloque en sus entradas { ... } de primer nivel,
// respetando llaves anidadas (necesario para attacks con condition).
function splitTopLevelEntries(blockContent) {
  if (!blockContent) return [];
  const entries = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < blockContent.length; i++) {
    const ch = blockContent[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        entries.push(blockContent.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return entries;
}

function field(text, name, type = 'number') {
  if (type === 'string') {
    const m = text.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`));
    return m ? m[1] : undefined;
  }
  if (type === 'bool') {
    const m = text.match(new RegExp(`\\b${name}\\s*=\\s*(true|false)`));
    return m ? m[1] === 'true' : undefined;
  }
  if (type === 'raw') {
    const m = text.match(new RegExp(`\\b${name}\\s*=\\s*([A-Z_][A-Z0-9_]*)`));
    return m ? m[1] : undefined;
  }
  const m = text.match(new RegExp(`\\b${name}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`));
  return m ? parseFloat(m[1]) : undefined;
}

function topLevelScalar(luaText, name, type = 'number') {
  return field(luaText, `monster\\.${name}`, type);
}

export function parseMonsterLuaFull(luaText) {
  const basic = parseMonsterLuaBasic(luaText);

  // Outfit
  const outfitBlock = extractBlock(luaText, 'outfit') || '';
  const outfit = {
    lookType: field(outfitBlock, 'lookType') ?? basic.lookType,
    lookHead: field(outfitBlock, 'lookHead') ?? 0,
    lookBody: field(outfitBlock, 'lookBody') ?? 0,
    lookLegs: field(outfitBlock, 'lookLegs') ?? 0,
    lookFeet: field(outfitBlock, 'lookFeet') ?? 0,
    lookAddons: field(outfitBlock, 'lookAddons') ?? 0,
    lookMount: field(outfitBlock, 'lookMount') ?? 0
  };

  // Flags (pares clave=valor separados por comas, sin llaves anidadas)
  const flagsBlock = extractBlock(luaText, 'flags') || '';
  const flags = {};
  flagsBlock.split(',').forEach((pair) => {
    const m = pair.match(/(\w+)\s*=\s*(true|false|-?\d+)/);
    if (m) flags[m[1]] = m[2] === 'true' ? true : m[2] === 'false' ? false : parseInt(m[2], 10);
  });

  // Defenses (puede incluir, además de defense/armor/mitigation, entradas
  // de hechizos defensivos/auto-buff con la misma forma que un ataque, ej.
  // un "speed" que el monstruo se lanza a sí mismo).
  const defensesBlock = extractBlock(luaText, 'defenses') || '';
  const defenses = {
    defense: field(defensesBlock, 'defense') ?? 0,
    armor: field(defensesBlock, 'armor') ?? 0,
    mitigation: field(defensesBlock, 'mitigation') ?? 0
  };
  const defenseAbilities = splitTopLevelEntries(defensesBlock).map((entry, idx) => ({
    uid: Date.now() + idx + 50000,
    name: field(entry, 'name', 'string') || '',
    interval: field(entry, 'interval') ?? 2000,
    chance: field(entry, 'chance') ?? 10,
    speedChange: field(entry, 'speedChange') ?? 0,
    effect: field(entry, 'effect', 'raw') || '',
    duration: field(entry, 'duration') ?? 0,
    minDamage: field(entry, 'minDamage'),
    maxDamage: field(entry, 'maxDamage'),
    target: field(entry, 'target', 'bool') ?? false
  }));

  // Elements
  const elementsBlock = extractBlock(luaText, 'elements') || '';
  const elements = splitTopLevelEntries(elementsBlock).map((entry) => ({
    type: field(entry, 'type', 'raw'),
    percent: field(entry, 'percent') ?? 0
  })).filter((e) => e.type);

  // Immunities
  const immunitiesBlock = extractBlock(luaText, 'immunities') || '';
  const immunities = splitTopLevelEntries(immunitiesBlock).map((entry) => ({
    type: field(entry, 'type', 'string'),
    condition: field(entry, 'condition', 'bool') ?? false
  })).filter((i) => i.type);

  // Loot
  const lootBlock = extractBlock(luaText, 'loot') || '';
  const loot = splitTopLevelEntries(lootBlock).map((entry, idx) => ({
    uid: Date.now() + idx,
    id: field(entry, 'id'),
    name: field(entry, 'name', 'string') || '',
    chance: field(entry, 'chance') ?? 1000,
    maxCount: field(entry, 'maxCount') ?? 1
  }));

  // Attacks (con soporte de condition anidado y campos de speed/paralyze)
  const attacksBlock = extractBlock(luaText, 'attacks') || '';
  const attacks = splitTopLevelEntries(attacksBlock).map((entry, idx) => {
    const conditionMatch = entry.match(/condition\s*=\s*\{([^}]*)\}/);
    const attack = {
      uid: Date.now() + idx,
      name: field(entry, 'name', 'string') || 'melee',
      interval: field(entry, 'interval') ?? 2000,
      chance: field(entry, 'chance') ?? 100,
      minDamage: field(entry, 'minDamage') ?? 0,
      maxDamage: field(entry, 'maxDamage') ?? 0,
      range: field(entry, 'range') ?? 0,
      radius: field(entry, 'radius') ?? 0,
      target: field(entry, 'target', 'bool') ?? false,
      speedChange: field(entry, 'speedChange') ?? 0,
      effect: field(entry, 'effect', 'raw') || '',
      duration: field(entry, 'duration') ?? 0
    };
    if (conditionMatch) {
      attack.condition = {
        type: field(conditionMatch[1], 'type', 'raw') || 'CONDITION_POISON',
        totalDamage: field(conditionMatch[1], 'totalDamage') ?? 0,
        interval: field(conditionMatch[1], 'interval') ?? 4000
      };
    }
    return attack;
  });

  // Bestiary (capital B en el Lua real)
  const bestiaryBlock = extractBlock(luaText, 'Bestiary') || '';
  const bestiary = bestiaryBlock
    ? {
        class: field(bestiaryBlock, 'class', 'string') || '',
        race: field(bestiaryBlock, 'race', 'raw') || 'BESTY_RACE_MAMMAL',
        toKill: field(bestiaryBlock, 'toKill') ?? 500,
        firstUnlock: field(bestiaryBlock, 'FirstUnlock') ?? 25,
        secondUnlock: field(bestiaryBlock, 'SecondUnlock') ?? 250,
        charmsPoints: field(bestiaryBlock, 'CharmsPoints') ?? 15,
        stars: field(bestiaryBlock, 'Stars') ?? 1,
        occurrence: field(bestiaryBlock, 'Occurrence') ?? 0,
        locations: field(bestiaryBlock, 'Locations', 'string') || ''
      }
    : null;

  // Voices
  const voicesBlock = extractBlock(luaText, 'voices') || '';
  const voiceEntries = splitTopLevelEntries(voicesBlock)
    .map((entry, idx) => ({
      uid: Date.now() + idx,
      text: field(entry, 'text', 'string') || '',
      yell: field(entry, 'yell', 'bool') ?? false
    }))
    .filter((v) => v.text);
  const voices = {
    interval: field(voicesBlock, 'interval') ?? 5000,
    chance: field(voicesBlock, 'chance') ?? 10,
    list: voiceEntries
  };

  // Summons
  const summonBlock = extractBlock(luaText, 'summon') || '';
  const summonsSubBlock = extractSubBlock(summonBlock, 'summons');
  const summons = summonsSubBlock
    ? splitTopLevelEntries(summonsSubBlock).map((entry, idx) => ({
        uid: Date.now() + idx,
        name: field(entry, 'name', 'string') || '',
        chance: field(entry, 'chance') ?? 10,
        interval: field(entry, 'interval') ?? 2000,
        count: field(entry, 'count') ?? 1
      }))
    : [];

  return {
    name: basic.name,
    description: basic.description,
    experience: basic.experience ?? topLevelScalar(luaText, 'experience') ?? 0,
    raceId: topLevelScalar(luaText, 'raceId') ?? 0,
    outfit,
    bestiary: bestiary || undefined,
    health: basic.health,
    maxHealth: topLevelScalar(luaText, 'maxHealth') ?? basic.health,
    race: topLevelScalar(luaText, 'race', 'string') || 'blood',
    corpse: topLevelScalar(luaText, 'corpse') ?? 0,
    speed: topLevelScalar(luaText, 'speed') ?? 100,
    manaCost: topLevelScalar(luaText, 'manaCost') ?? 0,
    flags: Object.keys(flags).length ? flags : undefined,
    defenses,
    defenseAbilities: defenseAbilities.length ? defenseAbilities : undefined,
    elements: elements.length ? elements : undefined,
    immunities: immunities.length ? immunities : undefined,
    loot,
    attacks,
    voices,
    summon: { maxSummons: field(summonBlock, 'maxSummons') ?? 0, summons }
  };
}

// Intenta extraer datos básicos (nombre, looktype, health, experience) de un
// archivo .lua de monstruo existente — usado como base rápida por
// parseMonsterLuaFull() y también de forma independiente si solo se
// necesita una vista previa ligera.
export function parseMonsterLuaBasic(luaText) {
  const nameMatch = luaText.match(/Game\.createMonsterType\(\s*"([^"]+)"/);
  const lookTypeMatch = luaText.match(/lookType\s*=\s*(\d+)/);
  const healthMatch = luaText.match(/monster\.health\s*=\s*(\d+)/);
  const expMatch = luaText.match(/monster\.experience\s*=\s*(\d+)/);
  const descMatch = luaText.match(/monster\.description\s*=\s*"([^"]*)"/);

  return {
    name: nameMatch ? nameMatch[1] : 'Desconocido',
    lookType: lookTypeMatch ? parseInt(lookTypeMatch[1], 10) : 21,
    health: healthMatch ? parseInt(healthMatch[1], 10) : 0,
    experience: expMatch ? parseInt(expMatch[1], 10) : 0,
    description: descMatch ? descMatch[1] : ''
  };
}
