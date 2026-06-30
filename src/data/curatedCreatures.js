// Pequeño set de referencia de criaturas conocidas, para que la Biblioteca
// no esté vacía antes de importar tus propios archivos. Datos básicos
// (nombre, looktype, health, experience, descripción) tomados de TibiaWiki
// (https://tibia.fandom.com), licencia CC-BY-SA — se reformatean aquí solo
// como referencia rápida, no como una base de datos completa ni oficial.
// Para datos completos (loot, resistencias, etc.) usa tus propios XML/Lua
// del servidor mediante "Importar archivos .lua".

export const CURATED_CREATURES = [
  { name: 'Rat', lookType: 21, health: 20, experience: 5, description: 'a rat', source: 'TibiaWiki (CC-BY-SA)' },
  { name: 'Rotworm', lookType: 26, health: 65, experience: 40, description: 'a rotworm', source: 'TibiaWiki (CC-BY-SA)' },
  { name: 'Troll', lookType: 21, health: 90, experience: 23, description: 'a troll', source: 'TibiaWiki (CC-BY-SA)' },
  { name: 'Dragon', lookType: 39, health: 1000, experience: 700, description: 'a dragon', source: 'TibiaWiki (CC-BY-SA)' },
  { name: 'Demon', lookType: 35, health: 8200, experience: 6000, description: 'a demon', source: 'TibiaWiki (CC-BY-SA)' },
  { name: 'Dwarf', lookType: 18, health: 80, experience: 25, description: 'a dwarf', source: 'TibiaWiki (CC-BY-SA)' }
];
