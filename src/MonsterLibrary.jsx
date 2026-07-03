import React, { useState, useMemo, useEffect } from 'react';
import { parseMonsterLuaFull } from './monsterLuaGenerator';
import { buildOutfitImageUrl } from './luaGenerator';
import { DEFAULT_MONSTER } from './data/monsterConstants';
import { CURATED_CREATURES } from './data/curatedCreatures';
import { useTranslation } from './i18n/LanguageContext';

// Deriva un valor de "ataque" representativo a partir del array de ataques
// parseado (el mayor daño máximo en valor absoluto), para mostrarlo como un
// solo número en la tarjeta estilo bestiario.
function deriveAttackValue(creature) {
  if (!creature.attacks?.length) return null;
  const maxAbs = Math.max(...creature.attacks.map((a) => Math.abs(a.maxDamage || a.minDamage || 0)));
  return maxAbs || null;
}

function deriveFamilyTags(creature) {
  const tags = [];
  if (creature.family) tags.push(creature.family);
  if (creature.bestiary?.class) tags.push(creature.bestiary.class);
  if (creature.bestiary?.race) tags.push(creature.bestiary.race.replace('BESTY_RACE_', ''));
  if (creature.race && !tags.length) tags.push(creature.race);
  return [...new Set(tags)].slice(0, 3);
}

// ─────────────────────────────────────────────────────────────────────────
// Tarjeta estilo "bestiario": looktype centrado arriba, nombre, tags de
// familia/raza, y stats en formato HEALTH / EXPERIENCE / ATTACK / DEFENSE
// (igual que el bestiario oficial de Tibia).
// ─────────────────────────────────────────────────────────────────────────
const BestiaryCard = ({ creature, onLoad }) => {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const imgUrl = useMemo(
    () => buildOutfitImageUrl({ lookType: creature.lookType, lookHead: 0, lookBody: 0, lookLegs: 0, lookFeet: 0, lookAddons: 0, lookMount: 0 }),
    [creature.lookType]
  );

  useEffect(() => { setImgError(false); }, [imgUrl]);

  const attackValue = deriveAttackValue(creature);
  const defenseValue = creature.defenses?.defense ?? null;
  const familyTags = deriveFamilyTags(creature);

  return (
    <div className="bestiary-card" onClick={() => onLoad(creature)}>
      <div className="bestiary-card-sprite">
        {!imgError ? (
          <img src={imgUrl} alt={creature.name} onError={() => setImgError(true)} className="character-sprite-bestiary" />
        ) : (
          <span className="sprite-fallback-icon-lg">👤</span>
        )}
      </div>

      <div className="bestiary-card-name">{creature.name}</div>

      {familyTags.length > 0 && (
        <div className="bestiary-card-tags">
          {familyTags.map((tag) => (
            <span key={tag} className="bestiary-tag">{tag}</span>
          ))}
        </div>
      )}

      <div className="bestiary-stats-grid">
        <div className="bestiary-stat bestiary-stat-health">
          <span className="bestiary-stat-label">{t('monsterEditor.health').toUpperCase()}</span>
          <span className="bestiary-stat-value">{creature.health ?? '—'}</span>
        </div>
        <div className="bestiary-stat bestiary-stat-experience">
          <span className="bestiary-stat-label">{t('monsterEditor.experience').toUpperCase()}</span>
          <span className="bestiary-stat-value">{creature.experience ?? '—'}</span>
        </div>
        <div className="bestiary-stat bestiary-stat-attack">
          <span className="bestiary-stat-label">{t('monsterLibrary.attack').toUpperCase()}</span>
          <span className="bestiary-stat-value">{attackValue ?? '—'}</span>
        </div>
        <div className="bestiary-stat bestiary-stat-defense">
          <span className="bestiary-stat-label">{t('monsterLibrary.defense').toUpperCase()}</span>
          <span className="bestiary-stat-value">{defenseValue ?? '—'}</span>
        </div>
      </div>

      {(creature.source || creature.fileName) && (
        <div className="creature-card-source">
          {creature.source ? `${t('common.source')}: ${creature.source}` : `${t('common.fileName')}: ${creature.fileName}`}
        </div>
      )}

      <button className="btn btn-gold-sm bestiary-edit-btn" onClick={(e) => { e.stopPropagation(); onLoad(creature); }}>
        ✏️ {t('monsterLibrary.editButton')}
      </button>
    </div>
  );
};

const MonsterLibrary = ({ onLoadMonster }) => {
  const { t } = useTranslation();
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
    // Se usa el parser completo: trae loot, attacks (con condition),
    // elements, immunities, defenses, bestiary, voices y summons reales del
    // archivo, no solo los campos básicos.
    const { fileName, lookType, ...monsterFields } = creature;
    onLoadMonster(monsterFields);
  };

  const filteredImported = imported.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const filteredCurated = CURATED_CREATURES.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="monster-library">
      <div className="section">
        <h3 className="section-title">{t('monsterLibrary.title')}</h3>
        <p className="section-hint">{t('monsterLibrary.hint')}</p>

        <div className="library-actions-row">
          <button className="btn btn-gold" onClick={() => fileRef.current?.click()}>📂 {t('monsterLibrary.importFiles')}</button>
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
            placeholder={`🔍 ${t('monsterLibrary.searchPlaceholder')}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: '300px', marginBottom: 0 }}
          />
        </div>
      </div>

      {imported.length > 0 && (
        <div className="section">
          <h3 className="section-title">{t('monsterLibrary.yourImported')} ({imported.length})</h3>
          <div className="bestiary-grid">
            {filteredImported.map((c, idx) => (
              <BestiaryCard key={`${c.fileName}-${idx}`} creature={c} onLoad={handleLoadImported} />
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <h3 className="section-title">{t('monsterLibrary.curatedSet')}</h3>
        <p className="section-hint">{t('monsterLibrary.curatedDisclaimer')}</p>
        <div className="bestiary-grid">
          {filteredCurated.map((c) => (
            <BestiaryCard key={c.name} creature={c} onLoad={handleLoadCurated} />
          ))}
          {filteredCurated.length === 0 && <div className="empty-state-sm">{t('common.noResults')}</div>}
        </div>
      </div>
    </div>
  );
};

export default MonsterLibrary;
