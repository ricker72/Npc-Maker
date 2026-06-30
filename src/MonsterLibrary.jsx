import React, { useState, useMemo } from 'react';
import { parseMonsterLuaFull } from './monsterLuaGenerator';
import { buildOutfitImageUrl } from './luaGenerator';
import { DEFAULT_MONSTER } from './data/monsterConstants';
import { CURATED_CREATURES } from './data/curatedCreatures';

const CreatureCard = ({ creature, onLoad }) => {
  const [imgError, setImgError] = useState(false);
  const imgUrl = useMemo(
    () => buildOutfitImageUrl({ lookType: creature.lookType, lookHead: 0, lookBody: 0, lookLegs: 0, lookFeet: 0, lookAddons: 0, lookMount: 0 }),
    [creature.lookType]
  );

  return (
    <div className="creature-card">
      <div className="creature-card-sprite">
        {!imgError ? (
          <img src={imgUrl} alt={creature.name} onError={() => setImgError(true)} className="character-sprite-sm" />
        ) : (
          <span className="sprite-fallback-icon-sm">👤</span>
        )}
      </div>
      <div className="creature-card-info">
        <div className="creature-card-name">{creature.name}</div>
        <div className="creature-card-stats">
          <span className="outfit-meta-pill">HP: {creature.health}</span>
          <span className="outfit-meta-pill">EXP: {creature.experience}</span>
          <span className="outfit-meta-pill">Look: {creature.lookType}</span>
          {creature.loot?.length > 0 && <span className="outfit-meta-pill">🎒 {creature.loot.length} loot</span>}
          {creature.attacks?.length > 0 && <span className="outfit-meta-pill">⚔️ {creature.attacks.length} attacks</span>}
          {creature.elements?.some((e) => e.percent !== 0) && <span className="outfit-meta-pill">🛡️ resist</span>}
        </div>
        {creature.source && <div className="creature-card-source">Fuente: {creature.source}</div>}
        {creature.fileName && <div className="creature-card-source">Archivo: {creature.fileName}</div>}
      </div>
      <button className="btn btn-gold-sm" onClick={() => onLoad(creature)}>✏️ Editar</button>
    </div>
  );
};

const MonsterLibrary = ({ onLoadMonster }) => {
  const [imported, setImported] = useState([]);
  const [search, setSearch] = useState('');
  const fileRef = React.useRef(null);

  const handleFiles = (event) => {
    const files = Array.from(event.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const parsed = parseMonsterLuaFull(e.target.result);
        setImported((prev) => [...prev, { ...parsed, lookType: parsed.outfit?.lookType, fileName: file.name }]);
      };
      reader.readAsText(file);
    });
    event.target.value = '';
  };

  const handleLoadCurated = (creature) => {
    onLoadMonster({
      ...DEFAULT_MONSTER,
      name: creature.name,
      description: creature.description,
      experience: creature.experience,
      health: creature.health,
      maxHealth: creature.health,
      outfit: { ...DEFAULT_MONSTER.outfit, lookType: creature.lookType }
    });
  };

  const handleLoadImported = (creature) => {
    // Ahora se usa el parser completo: trae loot, attacks (con condition),
    // elements, immunities, defenses, bestiary, voices y summons reales del
    // archivo, no solo los 5 campos básicos. Lo que el parser no pudo
    // detectar queda en los valores por defecto del editor.
    const { fileName, lookType, ...monsterFields } = creature;
    onLoadMonster(monsterFields);
  };

  const filteredImported = imported.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const filteredCurated = CURATED_CREATURES.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="monster-library">
      <div className="section">
        <h3 className="section-title">📚 Biblioteca de Criaturas</h3>
        <p className="section-hint">
          Importa tus propios archivos <code>.lua</code> de monstruos (de tu servidor Canary/CrystalServer)
          para navegarlos y editarlos aquí. También incluye un pequeño set de referencia básico
          (TibiaWiki, CC-BY-SA) para empezar rápido.
        </p>

        <div className="library-actions-row">
          <button className="btn btn-gold" onClick={() => fileRef.current?.click()}>📂 Importar archivos .lua</button>
          <input
            ref={fileRef}
            type="file"
            accept=".lua"
            multiple
            onChange={handleFiles}
            style={{ display: 'none' }}
          />
          <input
            type="text"
            className="form-input search-input"
            placeholder="🔍 Buscar criatura..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: '300px', marginBottom: 0 }}
          />
        </div>
      </div>

      {imported.length > 0 && (
        <div className="section">
          <h3 className="section-title">Tus archivos importados ({imported.length})</h3>
          <div className="creature-grid">
            {filteredImported.map((c, idx) => (
              <CreatureCard key={`${c.fileName}-${idx}`} creature={c} onLoad={handleLoadImported} />
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <h3 className="section-title">Set de referencia rápida</h3>
        <div className="creature-grid">
          {filteredCurated.map((c) => (
            <CreatureCard key={c.name} creature={c} onLoad={handleLoadCurated} />
          ))}
          {filteredCurated.length === 0 && <div className="empty-state-sm">Sin resultados</div>}
        </div>
      </div>
    </div>
  );
};

export default MonsterLibrary;
