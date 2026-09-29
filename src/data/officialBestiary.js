
import bestiaryData from './monsters.json';

export { toEditorMonster, officialAttackValue, officialStars } from './monsterAdapter';

export const OFFICIAL_BESTIARY = bestiaryData.families;
export const OFFICIAL_SOURCES = bestiaryData.sources;
export const OFFICIAL_GENERATED = bestiaryData.generated;

export const OFFICIAL_TOTAL = OFFICIAL_BESTIARY.reduce(
  (sum, family) => sum + family.monsters.length,
  0
);

export const OFFICIAL_CREATURES = OFFICIAL_BESTIARY.flatMap((family) =>
  family.monsters.map((monster) => ({ ...monster, familyKey: family.key, familyName: family.name }))
);

const normalize = (name) => String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
const BY_NAME = new Map(OFFICIAL_CREATURES.map((creature) => [normalize(creature.name), creature]));

export function findOfficialCreature(name) {
  return BY_NAME.get(normalize(name)) || null;
}

export default OFFICIAL_BESTIARY;
