import React, { useState, useMemo, useEffect } from 'react';
import outfitsData from './data/outfits.json';
import colorsData from './data/colors.json';
import mountsData from './data/mounts.json';
import { buildOutfitImageUrl } from './luaGenerator';

const SUB_PANELS = [
  { key: 'looktype', label: '🎨 Looktype & Colores' },
  { key: 'outfitsmounts', label: '👕 Outfits & Mounts' },
  { key: 'addons', label: '➕ Addons' }
];

const OutfitSelector = ({ outfit, onChange }) => {
  const [subPanel, setSubPanel] = useState('looktype');
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

  // Lista COMPLETA de mounts (231), solo filtrada por el buscador. Sin recortes.
  const filteredMounts = useMemo(() => {
    return mountsData.filter((m) => m.name.toLowerCase().includes(mountSearch.toLowerCase()));
  }, [mountSearch]);

  const imgUrl = useMemo(() => buildOutfitImageUrl(outfit), [outfit]);

  // Cada vez que cambia la URL (cambió el outfit), se vuelve a intentar
  // cargar la imagen. Sin esto, una vez que falla una carga, el <img> queda
  // desmontado para siempre y nunca se vuelve a probar, aunque el looktype
  // cambie después a uno válido (ej. bajar a 0 y luego subir de nuevo).
  useEffect(() => {
    setImgError(false);
  }, [imgUrl]);

  const handleGenderChange = (newGender) => {
    setGender(newGender);

    // Buscar el outfit actual (por nombre) y seleccionar automáticamente
    // su equivalente en el género nuevo, para que el looktype cambie solo.
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
      {/* Preview (siempre visible, sin importar el sub-panel activo) */}
      <div className="outfit-preview-panel">
        <div className="character-viewer">
          {!imgError ? (
            <img
              src={imgUrl}
              alt="NPC outfit preview"
              className="character-sprite"
              onError={() => setImgError(true)}
              onLoad={() => setImgError(false)}
            />
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
          {outfit.lookMount > 0 && <span className="outfit-meta-pill">Mount: {outfit.lookMount}</span>}
        </div>
        <div className="outfit-random-actions">
          <button className="btn btn-gold-sm" onClick={randomizeColors}>🎲 Random Colors</button>
          <button className="btn btn-gold-sm" onClick={randomizeFull}>✨ Random Outfit</button>
        </div>
      </div>

      {/* Controles divididos en 3 sub-paneles */}
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

        {/* ───────── PANEL 1: Looktype & Colores ───────── */}
        {subPanel === 'looktype' && (
          <div className="outfit-block">
            <h4>Looktype</h4>
            <div className="form-group">
              <label>ID de Looktype</label>
              <input
                type="number"
                className="form-input"
                value={outfit.lookType}
                min="0"
                onChange={(e) => handleLookTypeInput(e.target.value)}
              />
            </div>

            <h4 style={{ marginTop: '16px' }}>Paleta de Colores</h4>
            <div className="color-target-tabs">
              {colorTargets.map((t) => (
                <button
                  key={t.key}
                  className={`color-target-tab ${activeColorTarget === t.key ? 'active' : ''}`}
                  onClick={() => setActiveColorTarget(t.key)}
                >
                  <span className="color-target-swatch" style={{ background: colorOf(t.key).hex }} />
                  {t.label}
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

        {/* ───────── PANEL 2: Outfits & Mounts ───────── */}
        {subPanel === 'outfitsmounts' && (
          <>
            <div className="outfit-block">
              <div className="outfit-block-header">
                <h4>Outfit</h4>
                <div className="gender-toggle">
                  <button
                    className={`pill-btn ${gender === 'male' ? 'active' : ''}`}
                    onClick={() => handleGenderChange('male')}
                  >Male</button>
                  <button
                    className={`pill-btn ${gender === 'female' ? 'active' : ''}`}
                    onClick={() => handleGenderChange('female')}
                  >Female</button>
                </div>
              </div>

              <input
                type="text"
                className="form-input search-input"
                placeholder="🔍 Buscar outfit..."
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
                    <span className="outfit-list-name">{o.name}</span>
                    <span className="outfit-list-id">#{o.lookType}</span>
                  </div>
                ))}
                {filteredOutfits.length === 0 && (
                  <div className="empty-state-sm">Sin resultados</div>
                )}
              </div>
            </div>

            <div className="outfit-block">
              <div className="outfit-block-header">
                <h4>Mount (montura) — {mountsData.length} disponibles</h4>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={mountEnabled}
                    onChange={(e) => toggleMount(e.target.checked)}
                  />
                  Habilitar
                </label>
              </div>

              {mountEnabled && (
                <>
                  <input
                    type="text"
                    className="form-input search-input"
                    placeholder="🔍 Buscar mount..."
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
                        <span className="outfit-list-name">{m.name}</span>
                        <span className="outfit-list-id">#{m.clientId}</span>
                      </div>
                    ))}
                    {filteredMounts.length === 0 && (
                      <div className="empty-state-sm">Sin resultados</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ───────── PANEL 3: Addons ───────── */}
        {subPanel === 'addons' && (
          <div className="outfit-block">
            <h4>Addons</h4>
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
                Addon 1
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
                Addon 2
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutfitSelector;
