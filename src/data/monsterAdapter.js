
import { DEFAULT_MONSTER, COMBAT_ELEMENTS, IMMUNITY_TYPES } from './monsterConstants';

let uidSeq = 0;
const nextUid = () => {
  uidSeq += 1;
  return Date.now() % 1e7 + uidSeq;
};

export function toEditorMonster(entry) {
  const base = entry || {};

  const elementPercent = new Map(base.elements || []);
  const elements = COMBAT_ELEMENTS.map((type) => ({ type, percent: elementPercent.get(type) || 0 }));
  for (const [type, percent] of base.elements || []) {
    if (!elements.some((element) => element.type === type)) elements.push({ type, percent });
  }

  const immuneTypes = new Set(base.immunities || []);
  const immunities = IMMUNITY_TYPES.map((type) => ({ type, condition: immuneTypes.has(type) }));
  for (const type of immuneTypes) {
    if (!immunities.some((immunity) => immunity.type === type)) immunities.push({ type, condition: true });
  }

  return {
    ...DEFAULT_MONSTER,
    name: base.name || '',
    description: base.description || '',
    experience: base.experience || 0,
    raceId: base.raceId || 0,
    race: base.race || DEFAULT_MONSTER.race,
    corpse: base.corpse || 0,
    speed: base.speed || 0,
    manaCost: base.manaCost || 0,
    health: base.health || 0,
    maxHealth: base.maxHealth || base.health || 0,
    source: base.source || 'official',
    outfit: {
      ...DEFAULT_MONSTER.outfit,
      lookType: base.lookType || 0,
      lookHead: base.lookHead || 0,
      lookBody: base.lookBody || 0,
      lookLegs: base.lookLegs || 0,
      lookFeet: base.lookFeet || 0,
      lookAddons: base.lookAddons || 0,
      lookMount: base.lookMount || 0
    },
    bestiary: {
      class: base.family || '',
      race: base.bestiaryRace || DEFAULT_MONSTER.bestiary.race,
      toKill: base.toKill || 0,
      firstUnlock: base.firstUnlock || 0,
      secondUnlock: base.secondUnlock || 0,
      charmsPoints: base.charmsPoints || 0,
      stars: base.stars || 1,
      occurrence: base.occurrence || 0,
      locations: base.locations || ''
    },
    elements,
    immunities,
    defenses: { ...DEFAULT_MONSTER.defenses, ...(base.defenses || {}) },
    light: { ...DEFAULT_MONSTER.light, ...(base.light || {}) },
    changeTarget: { ...DEFAULT_MONSTER.changeTarget, ...(base.changeTarget || {}) },
    flags: { ...DEFAULT_MONSTER.flags, ...(base.flags || {}) },
    voices: {
      interval: base.voices?.interval ?? DEFAULT_MONSTER.voices.interval,
      chance: base.voices?.chance ?? DEFAULT_MONSTER.voices.chance,
      list: (base.voices?.list || []).map((voice) => ({ uid: nextUid(), text: voice.text, yell: !!voice.yell }))
    },
    loot: (base.loot || []).map((item) => ({ uid: nextUid(), ...item })),
    attacks: (base.attacks || []).map((attack) => ({ uid: nextUid(), ...attack })),
    defenseAbilities: (base.defenseAbilities || []).map((ability) => ({ uid: nextUid(), ...ability })),
    summon: {
      maxSummons: base.summon?.maxSummons || 0,
      summons: (base.summon?.summons || []).map((summon) => ({ uid: nextUid(), ...summon }))
    }
  };
}

export function officialAttackValue(entry) {
  const attacks = entry?.attacks || [];
  if (!attacks.length) return null;
  const max = Math.max(...attacks.map((attack) => Math.abs(attack.maxDamage || attack.minDamage || 0)));
  return max || null;
}

export function officialStars(count) {
  const stars = Math.max(0, Math.min(5, Number(count) || 0));
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

