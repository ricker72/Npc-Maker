import React, { useState, useMemo, useEffect } from 'react';
import outfitsData from './data/outfits.json';
import colorsData from './data/colors.json';
import mountsData from './data/mounts.json';
import { useTranslation } from './i18n/LanguageContext';
import { useTibiaAssets } from './tibia/TibiaAssetsContext';
import TibiaOutfitCanvas, { DIRECTION_LABELS, TibiaLookSprite, AssetsMissingNotice } from './TibiaOutfitCanvas';

const OutfitSelector = ({ outfit, onChange, onLookMissing }) => {
  const { t } = useTranslation();
  const { status, selectFolder, retry } = useTibiaAssets();
  const [lookMissing, setLookMissing] = useState(false);
  const [mountMissing, setMountMissing] = useState(false);

  const SUB_PANELS = [
    { key: 'looktype', label: `🎨 ${t('appearance.tabLooktype')}` },
    { key: 'outfitsmounts', label: `👕 ${t('appearance.tabOutfitsMounts')}` },
    { key: 'addons', label: `➕ ${t('appearance.tabAddons')}` }
  ];

  const [subPanel, setSubPanel] = useState('looktype');
  const [gender, setGender] = useState('male');
  const [activeColorTarget, setActiveColorTarget] = useState('lookHead');
  const [outfitSearch, setOutfitSearch] = useState('');
  const [mountSearch, setMountSearch] = useState('');
  const [mountEnabled, setMountEnabled] = useState(!!outfit.lookMount);
  const [previewDirection, setPreviewDirection] = useState(2);
  const [previewAnimate, setPreviewAnimate] = useState(false);

  const filteredOutfits = useMemo(() => {
    return outfitsData
      .filter((o) => o.gender === gender)
      .filter((o) => o.name.toLowerCase().includes(outfitSearch.toLowerCase()));
  }, [gender, outfitSearch]);

  const filteredMounts = useMemo(() => {
    return mountsData.filter((m) => m.name.toLowerCase().includes(mountSearch.toLowerCase()));
  }, [mountSearch]);

  const handleGenderChange = (newGender) => {
    setGender(newGender);

    const currentOutfitEntry = outfitsData.find((o) => o.lookType === outfit.lookType);
    if (currentOutfitEntry) {
      const equivalent = outfitsData.find(
        (o) => o.gender === newGender && o.name === currentOutfitEntry.name
      );
      if (equivalent && equivalent.lookType !== outfit.lookType) {
        onChange({ ...outfit, lookType: equivalent.lookType });
      }
    }
  };

  const handleColorPick = (colorId) => {
    onChange({ ...outfit, [activeColorTarget]: colorId });
  };

  const handleLookTypeInput = (value) => {
    const num = parseInt(value, 10);
    const safeNum = Number.isNaN(num) ? 0 : Math.max(0, num);
    onChange({ ...outfit, lookType: safeNum });
  };

  const handleSelectOutfit = (lookType) => {
    onChange({ ...outfit, lookType });
  };

  const handleSelectMount = (clientId) => {
    onChange({ ...outfit, lookMount: clientId });
  };

  const toggleMount = (checked) => {
    setMountEnabled(checked);
    onChange({ ...outfit, lookMount: checked ? (outfit.lookMount || mountsData[0]?.clientId || 0) : 0 });
  };

  const randomizeColors = () => {
    const randomColor = () => Math.floor(Math.random() * 132);
    onChange({
      ...outfit,
      lookHead: randomColor(),
      lookBody: randomColor(),
      lookLegs: randomColor(),
      lookFeet: randomColor()
    });
  };

  const randomizeFull = () => {
    const pool = outfitsData.filter((o) => o.gender === gender);
    const randomOutfit = pool[Math.floor(Math.random() * pool.length)];
    const randomColor = () => Math.floor(Math.random() * 132);
    const randomAddons = Math.floor(Math.random() * 4);
    onChange({
      ...outfit,
      lookType: randomOutfit?.lookType || outfit.lookType,
      lookHead: randomColor(),
      lookBody: randomColor(),
      lookLegs: randomColor(),
      lookFeet: randomColor(),
      lookAddons: randomAddons
    });
  };

  const colorTargets = [
    { key: 'lookHead', label: t('appearance.head') },
    { key: 'lookBody', label: t('appearance.body') },
    { key: 'lookLegs', label: t('appearance.legs') },
    { key: 'lookFeet', label: t('appearance.feet') }
  ];

  const colorOf = (key) => {
    const id = outfit[key] ?? 0;
    return colorsData.find((c) => c.id === id) || colorsData[0];
  };

  useEffect(() => {
    setLookMissing(false);
    setMountMissing(false);
  }, [outfit.lookType, outfit.lookMount, status.loaded]);

  useEffect(() => {
    if (onLookMissing) onLookMissing(lookMissing);
  }, [lookMissing, onLookMissing]);

  return (
    <div className="outfit-selector">
      <div className="outfit-preview-panel">
        <div className="character-viewer">
          {status.loaded && !lookMissing && !mountMissing ? (
            <TibiaOutfitCanvas outfit={outfit} direction={previewDirection} animate={previewAnimate} size={192} onMissing={setLookMissing} />
          ) : (
            <AssetsMissingNotice reason={lookMissing ? t('assets.lookMissing') : undefined} onSelectFolder={selectFolder} />
          )}
        </div>

        {status.loaded && (
          <div className="outfit-preview-controls">
            <div className="direction-picker">
              {DIRECTION_LABELS.map((label, dirIndex) => (
                <button
                  key={dirIndex}
                  className={`pill-btn ${previewDirection === dirIndex ? 'active' : ''}`}
                  onClick={() => setPreviewDirection(dirIndex)}
                  title={`Dirección ${dirIndex}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={previewAnimate}
                onChange={(e) => setPreviewAnimate(e.target.checked)}
              />
              🚶 Animar caminata
            </label>
          </div>
        )}

        <div className="tibia-assets-panel">
          {status.loaded ? (
            <>
              <span className="outfit-meta-pill">
                ✅ {t('assets.loaded')} ({status.outfitCount} · {status.objectCount})
              </span>
              <button className="btn btn-gold-sm" onClick={selectFolder} disabled={status.loading}>
                📁 {t('assets.changeFolder')}
              </button>
            </>
          ) : (
            <button className="btn btn-gold-sm" onClick={status.error ? retry : selectFolder} disabled={status.loading}>
              📁 {status.loading ? t('assets.loading') : t('assets.selectFolder')}
            </button>
          )}
        </div>
        <div className="outfit-meta">
          <span className="outfit-meta-pill">{t('appearance.look')}: {outfit.lookType}</span>
          <span className="outfit-meta-pill">{t('appearance.addons')}: {outfit.lookAddons}</span>
          {outfit.lookMount > 0 && <span className="outfit-meta-pill">{t('appearance.mount')}: {outfit.lookMount}</span>}
        </div>
        <div className="outfit-random-actions">
          <button className="btn btn-gold-sm" onClick={randomizeColors}>🎲 {t('appearance.randomColors')}</button>
          <button className="btn btn-gold-sm" onClick={randomizeFull}>✨ {t('appearance.randomOutfit')}</button>
        </div>
      </div>

      {}
      <div className="outfit-controls-panel">
        <div className="sub-panel-tabs">
          {SUB_PANELS.map((p) => (
            <button
              key={p.key}
              className={`sub-panel-tab ${subPanel === p.key ? 'active' : ''}`}
              onClick={() => setSubPanel(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {}
        {subPanel === 'looktype' && (
          <div className="outfit-block">
            <h4>{t('appearance.looktypeTitle')}</h4>
            <div className="form-group">
              <label>{t('appearance.looktypeId')}</label>
              <input
                type="number"
                className="form-input"
                value={outfit.lookType}
                min="0"
                onChange={(e) => handleLookTypeInput(e.target.value)}
              />
            </div>

            <h4 style={{ marginTop: '16px' }}>{t('appearance.colorPaletteTitle')}</h4>
            <div className="color-target-tabs">
              {colorTargets.map((ct) => (
                <button
                  key={ct.key}
                  className={`color-target-tab ${activeColorTarget === ct.key ? 'active' : ''}`}
                  onClick={() => setActiveColorTarget(ct.key)}
                >
                  <span className="color-target-swatch" style={{ background: colorOf(ct.key).hex }} />
                  {ct.label}
                </button>
              ))}
            </div>

            <div className="color-palette-grid">
              {colorsData.map((c) => (
                <div
                  key={c.id}
                  className={`color-cell ${outfit[activeColorTarget] === c.id ? 'selected' : ''}`}
                  style={{ background: c.hex }}
                  title={`Color ${c.id}`}
                  onClick={() => handleColorPick(c.id)}
                />
              ))}
            </div>
          </div>
        )}

        {}
        {subPanel === 'outfitsmounts' && (
          <>
            <div className="outfit-block">
              <div className="outfit-block-header">
                <h4>{t('appearance.outfitTitle')}</h4>
                <div className="gender-toggle">
                  <button
                    className={`pill-btn ${gender === 'male' ? 'active' : ''}`}
                    onClick={() => handleGenderChange('male')}
                  >{t('common.male')}</button>
                  <button
                    className={`pill-btn ${gender === 'female' ? 'active' : ''}`}
                    onClick={() => handleGenderChange('female')}
                  >{t('common.female')}</button>
                </div>
              </div>

              <input
                type="text"
                className="form-input search-input"
                placeholder={`🔍 ${t('appearance.searchOutfit')}`}
                value={outfitSearch}
                onChange={(e) => setOutfitSearch(e.target.value)}
              />

              <div className="outfit-list">
                {filteredOutfits.map((o) => (
                  <div
                    key={o.lookType}
                    className={`outfit-list-item ${outfit.lookType === o.lookType ? 'selected' : ''}`}
                    onClick={() => handleSelectOutfit(o.lookType)}
                  >
                    <TibiaLookSprite lookType={o.lookType} size={32} className="outfit-list-thumb" />
                    <span className="outfit-list-name">{o.name}</span>
                    <span className="outfit-list-id">#{o.lookType}</span>
                  </div>
                ))}
                {filteredOutfits.length === 0 && (
                  <div className="empty-state-sm">{t('common.noResults')}</div>
                )}
              </div>
            </div>

            <div className="outfit-block">
              <div className="outfit-block-header">
                <h4>{t('appearance.mountTitle')} — {mountsData.length} {t('appearance.mountAvailable')}</h4>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={mountEnabled}
                    onChange={(e) => toggleMount(e.target.checked)}
                  />
                  {t('appearance.enable')}
                </label>
              </div>

              {mountEnabled && (
                <>
                  <input
                    type="text"
                    className="form-input search-input"
                    placeholder={`🔍 ${t('appearance.searchMount')}`}
                    value={mountSearch}
                    onChange={(e) => setMountSearch(e.target.value)}
                  />
                  <div className="outfit-list mount-list-full">
                    {filteredMounts.map((m) => (
                      <div
                        key={m.clientId}
                        className={`outfit-list-item ${outfit.lookMount === m.clientId ? 'selected' : ''}`}
                        onClick={() => handleSelectMount(m.clientId)}
                      >
                        <TibiaLookSprite lookType={m.clientId} size={32} className="outfit-list-thumb" />
                        <span className="outfit-list-name">{m.name}</span>
                        <span className="outfit-list-id">#{m.clientId}</span>
                      </div>
                    ))}
                    {filteredMounts.length === 0 && (
                      <div className="empty-state-sm">{t('common.noResults')}</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {}
        {subPanel === 'addons' && (
          <div className="outfit-block">
            <h4>{t('appearance.addonsTitle')}</h4>
            <div className="addon-checkboxes">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={(outfit.lookAddons & 1) !== 0}
                  onChange={(e) => {
                    let addons = outfit.lookAddons;
                    addons = e.target.checked ? (addons | 1) : (addons & ~1);
                    onChange({ ...outfit, lookAddons: addons });
                  }}
                />
                {t('appearance.addon1')}
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={(outfit.lookAddons & 2) !== 0}
                  onChange={(e) => {
                    let addons = outfit.lookAddons;
                    addons = e.target.checked ? (addons | 2) : (addons & ~2);
                    onChange({ ...outfit, lookAddons: addons });
                  }}
                />
                {t('appearance.addon2')}
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutfitSelector;
