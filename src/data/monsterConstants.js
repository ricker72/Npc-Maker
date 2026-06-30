// monsterConstants.js
// Constantes extraídas directamente del código fuente real de monstruos de
// CrystalServer (https://github.com/zimbadev/crystalserver), no inventadas.

export const BESTIARY_RACES = [
  'BESTY_RACE_AMPHIBIC',
  'BESTY_RACE_AQUATIC',
  'BESTY_RACE_BIRD',
  'BESTY_RACE_CONSTRUCT',
  'BESTY_RACE_DEMON',
  'BESTY_RACE_DRAGON',
  'BESTY_RACE_ELEMENTAL',
  'BESTY_RACE_EXTRA_DIMENSIONAL',
  'BESTY_RACE_FEY',
  'BESTY_RACE_GIANT',
  'BESTY_RACE_HUMAN',
  'BESTY_RACE_HUMANOID',
  'BESTY_RACE_INKBORN', // categoría reciente (Tibia moderno, 15.x)
  'BESTY_RACE_LYCANTHROPE',
  'BESTY_RACE_MAGICAL',
  'BESTY_RACE_MAMMAL',
  'BESTY_RACE_PLANT',
  'BESTY_RACE_REPTILE',
  'BESTY_RACE_SLIME',
  'BESTY_RACE_UNDEAD',
  'BESTY_RACE_VERMIN'
];

// Los 10 tipos de daño/elemento estándar (monster.elements), en el orden en
// que aparecen siempre en los monstruos reales de CrystalServer.
export const COMBAT_ELEMENTS = [
  'COMBAT_PHYSICALDAMAGE',
  'COMBAT_ENERGYDAMAGE',
  'COMBAT_EARTHDAMAGE',
  'COMBAT_FIREDAMAGE',
  'COMBAT_LIFEDRAIN',
  'COMBAT_MANADRAIN',
  'COMBAT_DROWNDAMAGE',
  'COMBAT_ICEDAMAGE',
  'COMBAT_HOLYDAMAGE',
  'COMBAT_DEATHDAMAGE'
];

// Tipos de inmunidad a condiciones (monster.immunities) realmente usados.
export const IMMUNITY_TYPES = ['paralyze', 'outfit', 'invisible', 'bleed', 'drunk', 'fire', 'ice'];

// Valores típicos de monster.race (afecta sangre/decay del cadáver).
export const RACE_TYPES = ['blood', 'venom', 'undead', 'fire', 'energy'];

// Nombres de ataque más comunes (monster.attacks[].name). El campo es texto
// libre en Lua, esto es solo una ayuda de autocompletado.
export const COMMON_ATTACK_NAMES = [
  'melee', 'combat', 'poisonfield', 'firefield', 'energyfield', 'condition',
  'speed', 'outfit', 'invisible', 'drunk', 'physical', 'drown'
];

// Tipos de condición real para daño continuo (DoT) en ataques
// (monster.attacks[].condition.type).
export const CONDITION_TYPES = [
  'CONDITION_POISON',
  'CONDITION_FIRE',
  'CONDITION_ENERGY',
  'CONDITION_DROWN',
  'CONDITION_FREEZING',
  'CONDITION_BLEEDING',
  'CONDITION_CURSED'
];

// Efectos visuales comunes para ataques tipo "speed" (paralyze/slow).
export const COMMON_SHOOT_EFFECTS = [
  'CONST_ME_MAGIC_RED',
  'CONST_ME_MAGIC_GREEN',
  'CONST_ME_MAGIC_BLUE',
  'CONST_ME_POISONAREA',
  'CONST_ME_ICEATTACK',
  'CONST_ME_HITBYFIRE'
];

export const DEFAULT_MONSTER = {
  name: '',
  description: '',
  experience: 0,
  raceId: 0,
  outfit: {
    lookType: 21,
    lookHead: 0,
    lookBody: 0,
    lookLegs: 0,
    lookFeet: 0,
    lookAddons: 0,
    lookMount: 0
  },
  bestiary: {
    class: '',
    race: 'BESTY_RACE_MAMMAL',
    toKill: 500,
    firstUnlock: 25,
    secondUnlock: 250,
    charmsPoints: 15,
    stars: 1,
    occurrence: 0,
    locations: ''
  },
  health: 100,
  maxHealth: 100,
  race: 'blood',
  corpse: 0,
  speed: 100,
  manaCost: 0,
  changeTarget: { interval: 4000, chance: 0 },
  flags: {
    summonable: false,
    attackable: true,
    hostile: true,
    convinceable: false,
    pushable: false,
    rewardBoss: false,
    illusionable: false,
    canPushItems: false,
    canPushCreatures: false,
    staticAttackChance: 90,
    targetDistance: 1,
    runHealth: 0,
    healthHidden: false,
    isBlockable: false
  },
  light: { level: 0, color: 0 },
  voices: { interval: 5000, chance: 10, list: [] },
  loot: [],
  attacks: [],
  defenses: { defense: 0, armor: 0, mitigation: 0 },
  defenseAbilities: [],
  elements: COMBAT_ELEMENTS.map((type) => ({ type, percent: 0 })),
  immunities: IMMUNITY_TYPES.map((type) => ({ type, condition: false })),
  summon: { maxSummons: 0, summons: [] }
};
