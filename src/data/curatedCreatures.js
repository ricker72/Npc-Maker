// Pequeño set de referencia de criaturas conocidas, para que la Biblioteca
// no esté vacía antes de importar tus propios archivos.
//
// ⚠️ IMPORTANTE sobre el origen de estos datos: se intentó usar
// tibiaxplorer.com/creatures como fuente, pero ese dominio no es accesible
// desde el entorno donde se construyó esta función (bloqueado por la
// política de red del entorno). Estos valores son una referencia rápida
// basada en conocimiento general de Tibia (aproximados a TibiaWiki), NO
// datos verificados en vivo contra ninguna fuente — pueden no coincidir
// exactamente con la versión actual del juego. Para un bestiario 100%
// preciso, usa "Importar archivos .lua" con los monstruos reales de tu
// propio servidor: esos datos sí son exactos porque son los tuyos.
//
// Se corrigió aquí un bug real: "Rat" y "Troll" compartían accidentalmente
// el mismo lookType (21), por lo que ambas tarjetas mostraban el mismo
// sprite — quedó corregido a valores distintos.

export const CURATED_CREATURES = [
  { name: 'Rat', lookType: 21, health: 20, experience: 5, description: 'a rat', family: 'Vermin', source: 'Referencia aproximada (no verificada)' },
  { name: 'Rotworm', lookType: 26, health: 65, experience: 40, description: 'a rotworm', family: 'Vermin', source: 'Referencia aproximada (no verificada)' },
  { name: 'Troll', lookType: 22, health: 90, experience: 23, description: 'a troll', family: 'Humanoid', source: 'Referencia aproximada (no verificada)' },
  { name: 'Dragon', lookType: 39, health: 1000, experience: 700, description: 'a dragon', family: 'Dragon', source: 'Referencia aproximada (no verificada)' },
  { name: 'Demon', lookType: 35, health: 8200, experience: 6000, description: 'a demon', family: 'Demon', source: 'Referencia aproximada (no verificada)' },
  { name: 'Dwarf', lookType: 18, health: 80, experience: 25, description: 'a dwarf', family: 'Humanoid', source: 'Referencia aproximada (no verificada)' }
];
