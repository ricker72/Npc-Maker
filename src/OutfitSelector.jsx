import React, { useState, useMemo, useEffect } from 'react';
import outfitsData from './data/outfits.json';
import colorsData from './data/colors.json';
import mountsData from './data/mounts.json';
import { buildOutfitImageUrl } from './luaGenerator';

const OutfitSelector = ({ outfit, onChange }) => {
  const [gender, setGender] = useState('male');
  const [activeColorTarget, setActiveColorTarget] = useState('lookHead');
  const [outfitSearch, setOutfitSearch] = useState('');
  const [mountSearch, setMountSearch] = useState('');
  const [mountEnabled, setMountEnabled] = useState(!!outfit.lookMount);
  const [imgError, setImgError] = useState(false);

  const filteredOutfits = useMemo(() => {
    return outfitsData
      .filter((o) => o.gender === gender)
      .filter((o) => o.name.toLowerCase().includes(outfitSearch.toLowerCase()));
  }, [gender, outfitSearch]);

  // Reset outfit when gender changes
  useEffect(() => {
    if (filteredOutfits.length > 0) {
      const first = filteredOutfits[0];
      if (outfit.lookType !== first.lookType) {
        onChange({ ...outfit, lookType: first.lookType, lookMount: first.lookMount || 0 });
      }
    }
  }, [gender, filteredOutfits]);

  const filteredMounts = useMemo(() => {
    return mountsData.filter((m) => m.name.toLowerCase().includes(mountSearch.toLowerCase()));
  }, [mountSearch]);

  const imgUrl = useMemo(() => buildOutfitImageUrl({ ...outfit, gender }), [outfit, gender]);

  const handleColorPick = (colorId) => {
    onChange({ ...outfit, [activeColorTarget]: colorId });
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
    { key: 'lookHead', label: 'Head' },
    { key: 'lookBody', label: 'Body' },
    { key: 'lookLegs', label: 'Legs' },
    { key: 'lookFeet', label: 'Feet' }
  ];

  const colorOf = (key) => {
    const id = outfit[key] ?? 0;
    return colorsData.find((c) => c.id === id) || colorsData[0];
  };

  return (
    <div className="outfit-selector">
      {/* Combined Preview and Colors Panel */}
      <div className="preview-color-panel" style={{ display: 'flex', gap: '1rem' }}>
        {/* Preview */}
        <div className="outfit-preview-panel" style={{ flex: '1' }}>
          <div className="character-viewer">
            {!imgError ? (
              <img src={imgUrl} alt="NPC outfit preview" className="character-sprite" onError={() => setImgError(true)} onLoad={() => setImgError(false)} />
            ) : (
              <div className="sprite-fallback">
                <span className="sprite-fallback-icon">👤</span>
                <p>Preview no disponible offline</p>
                <small>(se cargará al tener conexión a internet)</small>
              </div>
            )}
          </div>
          <div className="outfit-meta">
            <span className="outfit-meta-pill">Look: {outfit.lookType}</span>
            <span className="outfit-meta-pill">Addons: {outfit.lookAddons}</span>
            {outfit.lookMount > 0 && (
              <span className="outfit-meta-pill">Mount: {outfit.lookMount}</span>
            )}
          </div>
          <div className="outfit-random-actions">
            <button className="btn btn-gold-sm" onClick={randomizeColors}>🎲 Random Colors</button>
            <button className="btn btn-gold-sm" onClick={randomizeFull}>✨ Random Outfit</button>
          </div>
        </div>
        {/* Colors */}
        <div className="color-panel" style={{ flex: '1' }}>
          <h4>Colores</h4>
          <div className="color-target-tabs">
            {colorTargets.map((t) => (
              <button key={t.key}
                className={`color-target-tab ${activeColorTarget === t.key ? 'active' : ''}`}
                onClick={() => setActiveColorTarget(t.key)}>
                <span className="color-target-swatch" style={{ background: colorOf(t.key).hex }} />
                {t.label}
              </button>
            ))}
          </div>
          <div className="color-palette-grid">
            {colorsData.map((c) => (
              <div key={c.id}
                className={`color-cell ${outfit[activeColorTarget] === c.id ? 'selected' : ''}`}
                style={{ background: c.hex }}
                title={`Color ${c.id}`}
                onClick={() => handleColorPick(c.id)} />
            ))}
          </div>
        </div>
      </div>

      {/* Second Panel: Mounts and Outfits */}
      <div className="mount-outfit-panel" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        {/* Outfit block */}
        <div className="outfit-block" style={{ flex: '1' }}>
          <div className="outfit-block-header">
            <h4>Outfit</h4>
            <div className="gender-toggle">
              <button className={`pill-btn ${gender === 'male' ? 'active' : ''}`} onClick={() => setGender('male')}>Male</button>
              <button className={`pill-btn ${gender === 'female' ? 'active' : ''}`} onClick={() => setGender('female')}>Female</button>
            </div>
          </div>
          <input type="text" className="form-input search-input" placeholder="🔍 Buscar outfit..." value={outfitSearch} onChange={(e) => setOutfitSearch(e.target.value)} />
          <div className="outfit-list">
            {filteredOutfits.map((o) => (
              <div key={o.lookType}
                className={`outfit-list-item ${outfit.lookType === o.lookType ? 'selected' : ''}`}
                onClick={() => handleSelectOutfit(o.lookType)}>
                <span className="outfit-list-name">{o.name}</span>
                <span className="outfit-list-id">#{o.lookType}</span>
              </div>
            ))}
            {filteredOutfits.length === 0 && (
              <div className="empty-state-sm">Sin resultados</div>
            )}
          </div>
        </div>

        {/* Mount block */}
        <div className="outfit-block" style={{ flex: '1' }}>
          <div className="outfit-block-header">
            <h4>Mount (montura)</h4>
            <label className="checkbox-label">
              <input type="checkbox" checked={mountEnabled} onChange={(e) => toggleMount(e.target.checked)} />
              Habilitar
            </label>
          </div>
          {mountEnabled && (
            <>
              <input type="text" className="form-input search-input" placeholder="🔍 Buscar mount..." value={mountSearch} onChange={(e) => setMountSearch(e.target.value)} />
              <div className="outfit-list mount-list">
                {filteredMounts.map((m) => (
                  <div key={m.clientId}
                    className={`outfit-list-item ${outfit.lookMount === m.clientId ? 'selected' : ''}`}
                    onClick={() => handleSelectMount(m.clientId)}>
                    <span className="outfit-list-name">{m.name}</span>
                    <span className="outfit-list-id">#{m.clientId}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Addons Panel */}
      <div className="outfit-block" style={{ marginTop: '1rem' }}>
        <h4>Addons</h4>
        <div className="addon-checkboxes">
          <label className="checkbox-label">
            <input type="checkbox" checked={(outfit.lookAddons & 1) !== 0} onChange={(e) => {
              let addons = outfit.lookAddons;
              addons = e.target.checked ? (addons | 1) : (addons & ~1);
              onChange({ ...outfit, lookAddons: addons });
            }} />
            Addon 1
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={(outfit.lookAddons & 2) !== 0} onChange={(e) => {
              let addons = outfit.lookAddons;
              addons = e.target.checked ? (addons | 2) : (addons & ~2);
              onChange({ ...outfit, lookAddons: addons });
            }} />
            Addon 2
          </label>
        </div>
      </div>
    </div>
  );
};

export default OutfitSelector;
