import React, { useState, useRef, useMemo } from 'react';
import './App.css';
import OutfitSelector from './OutfitSelector';
import ItemPicker from './ItemPicker';
import ScriptCreator from './ScriptCreator';
import MonsterEditor from './MonsterEditor';
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

const TABS = [
  { key: 'basic', icon: '📋', label: 'Basic Info' },
  { key: 'outfit', icon: '👕', label: 'Appearance' },
  { key: 'messages', icon: '💬', label: 'Messages' },
  { key: 'shop', icon: '💰', label: 'Shop' },
  { key: 'keywords', icon: '🗨️', label: 'Keywords' },
  { key: 'preview', icon: '👁️', label: 'Preview Lua' },
  { key: 'scriptcreator', icon: '🤖', label: 'Script Creator' },
  { key: 'monstereditor', icon: '🐉', label: 'Monster Editor' }
];

// Pequeño aviso inline no bloqueante (reemplaza a window.alert()).
// En Electron, alert() puede dejar la ventana en un estado donde el foco del
// teclado no vuelve correctamente a los inputs de texto — por eso nunca se
// usa alert()/confirm() en esta app.
const InlineNotice = ({ notice }) => {
  if (!notice) return null;
  return <div className={`inline-notice ${notice.type}`}>{notice.text}</div>;
};

const App = () => {
  const [activeTab, setActiveTab] = useState('basic');
  const [npc, setNpc] = useState(DEFAULT_NPC);
  const fileInputRef = useRef(null);

  const [keywordInput, setKeywordInput] = useState('');
  const [responseInput, setResponseInput] = useState('');
  const [keywordNotice, setKeywordNotice] = useState(null);
  const [importNotice, setImportNotice] = useState(null);

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

    if (!keyword) {
      setKeywordNotice({ type: 'error', text: '⚠️ Ingresa una keyword.' });
      return;
    }
    if (!response) {
      setKeywordNotice({ type: 'error', text: '⚠️ Ingresa una respuesta.' });
      return;
    }
    if (npc.keywords.some((k) => k.keyword === keyword)) {
      setKeywordNotice({ type: 'error', text: '⚠️ Esa keyword ya existe.' });
      return;
    }

    setNpc((prev) => ({ ...prev, keywords: [...prev.keywords, { keyword, response, uid: Date.now() }] }));
    setKeywordInput('');
    setResponseInput('');
    setKeywordNotice({ type: 'success', text: '✅ Keyword agregada.' });
    setTimeout(() => setKeywordNotice(null), 2000);
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
        setImportNotice({ type: 'success', text: '✅ NPC importado correctamente.' });
      } catch (err) {
        setImportNotice({ type: 'error', text: '⚠️ Error al importar: ' + err.message });
      }
      setTimeout(() => setImportNotice(null), 3000);
    };
    reader.readAsText(file);
    // Permitir volver a seleccionar el mismo archivo más adelante
    event.target.value = '';
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
        <InlineNotice notice={importNotice} />
      </header>

      <div className="main-content">
        <nav className="sidebar">
          <div className="nav-group">
            <h3 className="nav-title">Configuration</h3>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`nav-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="nav-icon">{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Todos los paneles quedan SIEMPRE montados (solo se oculta con CSS el
            que no está activo). Esto evita que se pierda lo escrito en
            Script Creator (o en cualquier otra pestaña) al cambiar de menú. */}
        <div className="content-area">
          <div className="tab-content" style={{ display: activeTab === 'basic' ? 'flex' : 'none' }}>
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

          <div className="tab-content" style={{ display: activeTab === 'outfit' ? 'flex' : 'none' }}>
            <div className="section">
              <h2 className="section-title">Apariencia del NPC</h2>
              <OutfitSelector
                outfit={npc.outfit}
                onChange={(outfit) => update({ outfit })}
              />
            </div>
          </div>

          <div className="tab-content" style={{ display: activeTab === 'messages' ? 'flex' : 'none' }}>
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

          <div className="tab-content" style={{ display: activeTab === 'shop' ? 'flex' : 'none' }}>
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

          <div className="tab-content" style={{ display: activeTab === 'keywords' ? 'flex' : 'none' }}>
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

              <InlineNotice notice={keywordNotice} />

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

          <div className="tab-content" style={{ display: activeTab === 'preview' ? 'flex' : 'none' }}>
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

          <div className="tab-content" style={{ display: activeTab === 'scriptcreator' ? 'flex' : 'none' }}>
            <div className="section">
              <h2 className="section-title">🤖 Script Creator (CrystalServer)</h2>
              <ScriptCreator npc={npc} />
            </div>
          </div>

          <div className="tab-content" style={{ display: activeTab === 'monstereditor' ? 'flex' : 'none' }}>
            <div className="section">
              <h2 className="section-title">🐉 Monster Editor (CrystalServer)</h2>
              <MonsterEditor />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
