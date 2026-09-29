import React, { useState, useMemo, useEffect } from 'react';
import { parseMonsterLuaFull } from './monsterLuaGenerator';
import { DEFAULT_MONSTER } from './data/monsterConstants';
import { CURATED_CREATURES } from './data/curatedCreatures';
import { toEditorMonster, officialAttackValue, officialStars } from './data/monsterAdapter';
import { useTranslation } from './i18n/LanguageContext';
import { useTibiaAssets } from './tibia/TibiaAssetsContext';
import { TibiaLookSprite, AssetsMissingNotice } from './TibiaOutfitCanvas';

const PAGE_SIZE = 60;

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

const OfficialCard = ({ creature, onLoad }) => {
  const { t } = useTranslation();

  const attack = officialAttackValue(creature);

  return (
    <div className="bestiary-card" onClick={() => onLoad(creature)}>
      <div className="bestiary-card-sprite">
        <TibiaLookSprite lookType={creature.lookType} size={120} className="character-sprite-bestiary" />
      </div>

      <div className="bestiary-card-name">{creature.name}</div>

      <div className="bestiary-card-tags">
        <span className="bestiary-tag">{creature.family}</span>
        {creature.stars > 0 && <span className="bestiary-tag">{officialStars(creature.stars)}</span>}
        <span className="bestiary-tag">#{creature.lookType}</span>
      </div>

      <div className="bestiary-stats-grid">
        <div className="bestiary-stat bestiary-stat-health">
          <span className="bestiary-stat-label">{t('monsterEditor.health').toUpperCase()}</span>
          <span className="bestiary-stat-value">{creature.health || '—'}</span>
        </div>
        <div className="bestiary-stat bestiary-stat-experience">
          <span className="bestiary-stat-label">{t('monsterEditor.experience').toUpperCase()}</span>
          <span className="bestiary-stat-value">{creature.experience || '—'}</span>
        </div>
        <div className="bestiary-stat bestiary-stat-attack">
          <span className="bestiary-stat-label">{t('monsterLibrary.attack').toUpperCase()}</span>
          <span className="bestiary-stat-value">{attack ?? '—'}</span>
        </div>
        <div className="bestiary-stat bestiary-stat-defense">
          <span className="bestiary-stat-label">{t('monsterLibrary.defense').toUpperCase()}</span>
          <span className="bestiary-stat-value">{creature.defenses?.defense || '—'}</span>
        </div>
      </div>

      <div className="creature-card-source">
        {creature.loot?.length
          ? `${creature.loot.length} ${t('monsterLibrary.lootCount')}`
          : t('monsterLibrary.noLoot')}
        {creature.attacks?.length ? ` · ${creature.attacks.length} ${t('monsterLibrary.attacksCount')}` : ''}
      </div>

      <button className="btn btn-gold-sm bestiary-edit-btn" onClick={(e) => { e.stopPropagation(); onLoad(creature); }}>
        ✏️ {t('monsterLibrary.editButton')}
      </button>
    </div>
  );
};

const BestiaryCard = ({ creature, onLoad }) => {
  const { t } = useTranslation();

  const attackValue = deriveAttackValue(creature);
  const defenseValue = creature.defenses?.defense ?? null;
  const familyTags = deriveFamilyTags(creature);

  return (
    <div className="bestiary-card" onClick={() => onLoad(creature)}>
      <div className="bestiary-card-sprite">
        <TibiaLookSprite lookType={creature.lookType} size={120} className="character-sprite-bestiary" />
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
  const { status: assetsStatus, selectFolder } = useTibiaAssets();
  const assetsLoaded = assetsStatus.loaded;
  const [imported, setImported] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFamily, setActiveFamily] = useState('all');
  const [showCurated, setShowCurated] = useState(false);
  const [bestiary, setBestiary] = useState(null);
  const [bestiaryError, setBestiaryError] = useState(null);
  const fileRef = React.useRef(null);

  useEffect(() => {
    let alive = true;
    import('./data/officialBestiary')
      .then((module) => {
        if (alive) setBestiary(module);
      })
      .catch((err) => {
        console.error('No se pudo cargar el bestiario oficial:', err);
        if (alive) setBestiaryError(err);
      });
    return () => { alive = false; };
  }, []);

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
    const { fileName, lookType, ...monsterFields } = creature;
    onLoadMonster(monsterFields);
  };

  const handleLoadOfficial = (creature) => {
    onLoadMonster(toEditorMonster(creature));
  };

  const filteredImported = imported.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const filteredCurated = CURATED_CREATURES.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const term = search.trim().toLowerCase();
  const OFFICIAL_BESTIARY = bestiary?.OFFICIAL_BESTIARY || [];
  const OFFICIAL_TOTAL = bestiary?.OFFICIAL_TOTAL || 0;
  const officialFamilies = useMemo(
    () =>
      OFFICIAL_BESTIARY.map((family) => ({
        ...family,
        monsters: term
          ? family.monsters.filter(
              (monster) =>
                monster.name.toLowerCase().includes(term) ||
                monster.family.toLowerCase().includes(term) ||
                (monster.description || '').toLowerCase().includes(term) ||
                (monster.loot || []).some((item) => String(item.name).toLowerCase().includes(term))
            )
          : family.monsters
      })).filter((family) => family.monsters.length > 0),
    [OFFICIAL_BESTIARY, term]
  );

  const visibleFamilies =
    activeFamily === 'all'
      ? officialFamilies
      : officialFamilies.filter((family) => family.key === activeFamily);

  const [limit, setLimit] = useState(PAGE_SIZE);
  useEffect(() => { setLimit(PAGE_SIZE); }, [activeFamily, term]);
  const officialShown = visibleFamilies.reduce(
    (sum, family) => sum + Math.min(family.monsters.length, Math.max(0, limit)),
    0
  );

  return (
    <div className="monster-library">
      <div className="section">
        <h3 className="section-title">{t('monsterLibrary.title')}</h3>
        <p className="section-hint">{t('monsterLibrary.officialHint')}</p>

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

        {bestiary && (
          <p className="section-hint" style={{ marginTop: '6px' }}>
            {t('monsterLibrary.officialSource', {
              file: bestiary.OFFICIAL_SOURCES?.client?.file || 'staticdata',
              monsters: bestiary.OFFICIAL_SOURCES?.client?.monsters ?? 0,
              bosses: bestiary.OFFICIAL_SOURCES?.client?.bosses ?? 0,
              families: bestiary.OFFICIAL_SOURCES?.client?.families ?? 0,
              date: bestiary.OFFICIAL_GENERATED
            })}
          </p>
        )}

        {!assetsLoaded && (
          <AssetsMissingNotice onSelectFolder={selectFolder} />
        )}
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
        <h3 className="section-title">
          {t('monsterLibrary.officialBestiary')}
          {bestiary ? ` (${officialShown}/${OFFICIAL_TOTAL})` : ''}
        </h3>

        {!bestiary && !bestiaryError && (
          <div className="empty-state-sm">{t('monsterLibrary.loadingBestiary')}</div>
        )}

        {bestiaryError && (
          <div className="empty-state-sm">{t('monsterLibrary.bestiaryError')}</div>
        )}

        {bestiary && (
          <>
            <div className="family-tabs">
              <button
                className={`family-tab ${activeFamily === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFamily('all')}
              >
                {t('monsterLibrary.allFamilies')}
              </button>
              {officialFamilies.map((family) => (
                <button
                  key={family.key}
                  className={`family-tab ${activeFamily === family.key ? 'active' : ''}`}
                  onClick={() => setActiveFamily(family.key)}
                >
                  {family.name} <span className="family-tab-count">{family.monsters.length}</span>
                </button>
              ))}
            </div>

            {visibleFamilies.length === 0 && <div className="empty-state-sm">{t('common.noResults')}</div>}

            {visibleFamilies.map((family) => {
              const shown = family.monsters.slice(0, limit);
              const hidden = family.monsters.length - shown.length;
              return (
                <div key={family.key} className="family-block">
                  <h4 className="family-block-title">
                    {family.name} <span className="family-tab-count">{family.monsters.length}</span>
                  </h4>
                  <div className="bestiary-grid">
                    {shown.map((creature) => (
                      <OfficialCard key={creature.name} creature={creature} onLoad={handleLoadOfficial} />
                    ))}
                  </div>
                  {hidden > 0 && (
                    <button
                      className="btn btn-gold-sm family-more-btn"
                      onClick={() => setLimit((n) => n + PAGE_SIZE)}
                    >
                      {t('monsterLibrary.showMore', { count: hidden })}
                    </button>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="section">
        <button className="btn" onClick={() => setShowCurated((v) => !v)}>
          {showCurated ? '▾' : '▸'} {t('monsterLibrary.curatedSet')}
        </button>
        {showCurated && (
          <>
            <p className="section-hint">{t('monsterLibrary.curatedDisclaimer')}</p>
            <div className="bestiary-grid">
              {filteredCurated.map((c) => (
                <BestiaryCard key={c.name} creature={c} onLoad={handleLoadCurated} />
              ))}
              {filteredCurated.length === 0 && <div className="empty-state-sm">{t('common.noResults')}</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MonsterLibrary;
