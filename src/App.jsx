import React, { useState, useRef, useMemo } from 'react';
import './App.css';
import OutfitSelector from './OutfitSelector';
import ItemPicker from './ItemPicker';
import { generateNpcLua, getNpcFileName } from './luaGenerator';

const DEFAULT_NPC = {
  name: '',
  health: 100,
  maxHealth: 100,
  walkInterval: 2000,
  walkRadius: 2,
  speed: 100,
  floorChange: false,
  outfit: {
    lookType: 128,
    lookHead: 0,
    lookBody: 0,
    lookLegs: 0,
    lookFeet: 0,
    lookAddons: 0,
    lookMount: 0
  },
  messages: {
    greet: 'Hello |PLAYERNAME|, how can I help you?',
    farewell: 'Good bye!',
    walkaway: 'Hey, come back!',
    sell: 'Sold %ix %s for %i gold.'
  },
  shop: {
    items: []
  },
  keywords: []
};

const App = () => {
  const [activeTab, setActiveTab] = useState('basic');
  const [npc, setNpc] = useState(DEFAULT_NPC);
  const fileInputRef = useRef(null);

  const [keywordInput, setKeywordInput] = useState('');
  const [responseInput, setResponseInput] = useState('');

  const update = (patch) => setNpc((prev) => ({ ...prev, ...patch }));
  const updateMessages = (patch) => setNpc((prev) => ({ ...prev, messages: { ...prev.messages, ...patch } }));

  const addShopItem = (item) => {
    setNpc((prev) => ({
      ...prev,
      shop: { items: [...prev.shop.items, { ...item, uid: Date.now() + Math.random() }] }
    }));
  };

  const removeShopItem = (uid) => {
    setNpc((prev) => ({
      ...prev,
      shop: { items: prev.shop.items.filter((it) => it.uid !== uid) }
    }));
  };

  const addKeyword = () => {
    const keyword = keywordInput.trim().toLowerCase();
    const response = responseInput.trim();
    if (!keyword) return alert('Ingresa una keyword');
    if (!response) return alert('Ingresa una respuesta');
    if (npc.keywords.some((k) => k.keyword === keyword)) return alert('Esa keyword ya existe');
    setNpc((prev) => ({ ...prev, keywords: [...prev.keywords, { keyword, response, uid: Date.now() }] }));
    setKeywordInput('');
    setResponseInput('');
  };

  const removeKeyword = (uid) => {
    setNpc((prev) => ({ ...prev, keywords: prev.keywords.filter((k) => k.uid !== uid) }));
  };

  const luaCode = useMemo(() => generateNpcLua(npc), [npc]);

  const exportLua = () => {
    const fileName = getNpcFileName(npc.name);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(luaCode));
    element.setAttribute('download', fileName);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const exportJSON = () => {
    const jsonData = JSON.stringify(npc, null, 2);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonData));
    element.setAttribute('download', `${npc.name || 'npc'}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const importJSON = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        setNpc({ ...DEFAULT_NPC, ...imported });
        alert('NPC importado correctamente');
      } catch (err) {
        alert('Error al importar: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const copyLuaToClipboard = () => {
    navigator.clipboard.writeText(luaCode);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">⚔️</span>
            <h1>NPC Maker Pro</h1>
          </div>
          <div className="header-actions">
            <button className="btn btn-gold" onClick={exportLua}>📥 Export Lua</button>
            <button className="btn btn-gold" onClick={exportJSON}>📥 Export JSON</button>
            <button className="btn btn-gold" onClick={() => fileInputRef.current?.click()}>📤 Import JSON</button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={importJSON} style={{ display: 'none' }} />
          </div>
        </div>
      </header>

      <div className="main-content">
        <nav className="sidebar">
          <div className="nav-group">
            <h3 className="nav-title">Configuration</h3>
            <button className={`nav-btn ${activeTab === 'basic' ? 'active' : ''}`} onClick={() => setActiveTab('basic')}>
              <span className="nav-icon">📋</span> Basic Info
            </button>
            <button className={`nav-btn ${activeTab === 'outfit' ? 'active' : ''}`} onClick={() => setActiveTab('outfit')}>
              <span className="nav-icon">👕</span> Appearance
            </button>
            <button className={`nav-btn ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
              <span className="nav-icon">💬</span> Messages
            </button>
            <button className={`nav-btn ${activeTab === 'shop' ? 'active' : ''}`} onClick={() => setActiveTab('shop')}>
              <span className="nav-icon">💰</span> Shop
            </button>
            <button className={`nav-btn ${activeTab === 'keywords' ? 'active' : ''}`} onClick={() => setActiveTab('keywords')}>
              <span className="nav-icon">🗨️</span> Keywords
            </button>
            <button className={`nav-btn ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>
              <span className="nav-icon">👁️</span> Preview Lua
            </button>
          </div>
        </nav>

        <div className="content-area">
          {/* BASIC INFO */}
          {activeTab === 'basic' && (
            <div className="tab-content">
              <div className="section">
                <h2 className="section-title">Información Básica</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nombre del NPC</label>
                    <input
                      type="text"
                      className="form-input"
                      value={npc.name}
                      onChange={(e) => update({ name: e.target.value })}
                      placeholder="ej: Sarah the Merchant"
                    />
                  </div>
                </div>
              </div>

              <div className="section">
                <h2 className="section-title">Salud</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Health</label>
                    <input
                      type="number"
                      className="form-input"
                      value={npc.health}
                      min="1"
                      onChange={(e) => update({ health: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Max Health</label>
                    <input
                      type="number"
                      className="form-input"
                      value={npc.maxHealth}
                      min="1"
                      onChange={(e) => update({ maxHealth: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              <div className="section">
                <h2 className="section-title">Movimiento</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Walk Interval (ms)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={npc.walkInterval}
                      onChange={(e) => update({ walkInterval: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Walk Radius</label>
                    <input
                      type="number"
                      className="form-input"
                      value={npc.walkRadius}
                      onChange={(e) => update({ walkRadius: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Speed</label>
                    <input
                      type="number"
                      className="form-input"
                      value={npc.speed}
                      onChange={(e) => update({ speed: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label" style={{ marginTop: '24px' }}>
                      <input
                        type="checkbox"
                        checked={npc.floorChange}
                        onChange={(e) => update({ floorChange: e.target.checked })}
                      />
                      Permite cambio de piso (floorchange)
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* APPEARANCE */}
          {activeTab === 'outfit' && (
            <div className="tab-content">
              <div className="section">
                <h2 className="section-title">Apariencia del NPC</h2>
                <OutfitSelector
                  outfit={npc.outfit}
                  onChange={(outfit) => update({ outfit })}
                />
              </div>
            </div>
          )}

          {/* MESSAGES */}
          {activeTab === 'messages' && (
            <div className="tab-content">
              <div className="section">
                <h2 className="section-title">Mensajes del NPC</h2>
                <div className="form-grid-1">
                  <div className="form-group">
                    <label>Greet (saludo) — usa |PLAYERNAME| para el nombre del jugador</label>
                    <textarea
                      className="form-textarea"
                      rows="2"
                      value={npc.messages.greet}
                      onChange={(e) => updateMessages({ greet: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Farewell (despedida)</label>
                    <textarea
                      className="form-textarea"
                      rows="2"
                      value={npc.messages.farewell}
                      onChange={(e) => updateMessages({ farewell: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Walkaway (cuando el jugador se aleja)</label>
                    <textarea
                      className="form-textarea"
                      rows="2"
                      value={npc.messages.walkaway}
                      onChange={(e) => updateMessages({ walkaway: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Sell message (formato: %ix %s for %i gold.)</label>
                    <textarea
                      className="form-textarea"
                      rows="2"
                      value={npc.messages.sell}
                      onChange={(e) => updateMessages({ sell: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SHOP */}
          {activeTab === 'shop' && (
            <div className="tab-content">
              <div className="section">
                <h2 className="section-title">Shop del NPC</h2>
                <p className="section-hint">
                  Busca items reales por nombre o ID (base de datos de Tibia/Canary incluida).
                  Define precio de compra (buy = el NPC le vende al jugador) y/o venta (sell = el NPC le compra al jugador).
                </p>
                <ItemPicker onAdd={addShopItem} label="Agregar al shop" />

                <div className="items-list" style={{ marginTop: '20px' }}>
                  {npc.shop.items.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">📦</span>
                      <p>No hay items en el shop todavía</p>
                    </div>
                  ) : (
                    npc.shop.items.map((item) => (
                      <div key={item.uid} className="shop-item-row">
                        <span className="shop-item-name">{item.name}</span>
                        <span className="shop-item-id">#{item.id}</span>
                        {item.buy !== '' && <span className="shop-item-tag buy">Buy: {item.buy}</span>}
                        {item.sell !== '' && <span className="shop-item-tag sell">Sell: {item.sell}</span>}
                        {item.count > 1 && <span className="shop-item-tag">x{item.count}</span>}
                        <button className="btn btn-danger-sm" onClick={() => removeShopItem(item.uid)}>🗑️</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* KEYWORDS */}
          {activeTab === 'keywords' && (
            <div className="tab-content">
              <div className="section">
                <h2 className="section-title">Keywords (Diálogos personalizados)</h2>
                <p className="section-hint">
                  Cuando el jugador escriba una de estas palabras, el NPC responderá automáticamente.
                </p>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Keyword</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="ej: quest, trade, name"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Response</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Respuesta del NPC"
                      value={responseInput}
                      onChange={(e) => setResponseInput(e.target.value)}
                    />
                  </div>
                </div>
                <button className="btn btn-gold-sm" onClick={addKeyword}>➕ Agregar Keyword</button>

                <div className="dialogs-list" style={{ marginTop: '20px' }}>
                  {npc.keywords.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">💬</span>
                      <p>No hay keywords configuradas</p>
                    </div>
                  ) : (
                    npc.keywords.map((kw) => (
                      <div key={kw.uid} className="dialog-card">
                        <div className="dialog-content-flat">
                          <strong>{kw.keyword}</strong>
                          <span>{kw.response}</span>
                        </div>
                        <button className="btn btn-danger-sm" onClick={() => removeKeyword(kw.uid)}>🗑️</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PREVIEW */}
          {activeTab === 'preview' && (
            <div className="tab-content">
              <div className="section">
                <div className="section-header">
                  <h2 className="section-title">Lua Script Preview (formato Canary)</h2>
                  <button className="btn btn-gold-sm" onClick={copyLuaToClipboard}>📋 Copiar</button>
                </div>
                <div className="preview-box lua-preview">
                  <pre className="lua-code">{luaCode}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
