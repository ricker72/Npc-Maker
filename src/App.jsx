import React, { useState, useRef, useMemo } from 'react';
import './App.css';
import OutfitSelector from './OutfitSelector';
import ItemPicker from './ItemPicker';
import ScriptCreator from './ScriptCreator';
import MonsterEditor from './MonsterEditor';
import PrivacyPolicy from './PrivacyPolicy';
import { generateNpcLua, getNpcFileName } from './luaGenerator';
import { useTranslation } from './i18n/LanguageContext';
import LanguageSelector from './i18n/LanguageSelector';
import LanguageSwitcher from './i18n/LanguageSwitcher';

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

// Pequeño aviso inline no bloqueante (reemplaza a window.alert()).
// En Electron, alert() puede dejar la ventana en un estado donde el foco del
// teclado no vuelve correctamente a los inputs de texto — por eso nunca se
// usa alert()/confirm() en esta app.
const InlineNotice = ({ notice }) => {
  if (!notice) return null;
  return <div className={`inline-notice ${notice.type}`}>{notice.text}</div>;
};

const App = () => {
  const { t, hasChosenLanguage } = useTranslation();

  const TABS = [
    { key: 'basic', icon: '📋', label: t('nav.basicInfo') },
    { key: 'outfit', icon: '👕', label: t('nav.appearance') },
    { key: 'messages', icon: '💬', label: t('nav.messages') },
    { key: 'shop', icon: '💰', label: t('nav.shop') },
    { key: 'keywords', icon: '🗨️', label: t('nav.keywords') },
    { key: 'preview', icon: '👁️', label: t('nav.previewLua') },
    { key: 'scriptcreator', icon: '🤖', label: t('nav.scriptCreator') },
    { key: 'monstereditor', icon: '🐉', label: t('nav.monsterEditor') },
    { key: 'privacy', icon: '🛡️', label: t('privacyNav') }
  ];

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
      setKeywordNotice({ type: 'error', text: '⚠️ ' + t('keywords.enterKeyword') });
      return;
    }
    if (!response) {
      setKeywordNotice({ type: 'error', text: '⚠️ ' + t('keywords.enterResponse') });
      return;
    }
    if (npc.keywords.some((k) => k.keyword === keyword)) {
      setKeywordNotice({ type: 'error', text: '⚠️ ' + t('keywords.alreadyExists') });
      return;
    }

    setNpc((prev) => ({ ...prev, keywords: [...prev.keywords, { keyword, response, uid: Date.now() }] }));
    setKeywordInput('');
    setResponseInput('');
    setKeywordNotice({ type: 'success', text: '✅ ' + t('keywords.added') });
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
        setImportNotice({ type: 'success', text: '✅ ' + t('header.npcImportedOk') });
      } catch (err) {
        setImportNotice({ type: 'error', text: '⚠️ ' + t('header.npcImportError') + err.message });
      }
      setTimeout(() => setImportNotice(null), 3000);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const copyLuaToClipboard = () => {
    navigator.clipboard.writeText(luaCode);
  };

  if (!hasChosenLanguage) {
    return <LanguageSelector />;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">⚔️</span>
            <h1>{t('common.appName')}</h1>
          </div>
          <div className="header-actions">
            <button className="btn btn-gold" onClick={exportLua}>📥 {t('header.exportLua')}</button>
            <button className="btn btn-gold" onClick={exportJSON}>📥 {t('header.exportJson')}</button>
            <button className="btn btn-gold" onClick={() => fileInputRef.current?.click()}>📤 {t('header.importJson')}</button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={importJSON} style={{ display: 'none' }} />
            <LanguageSwitcher />
          </div>
        </div>
        <InlineNotice notice={importNotice} />
      </header>

      <div className="main-content">
        <nav className="sidebar">
          <div className="nav-group">
            <h3 className="nav-title">{t('nav.configuration')}</h3>
            {TABS.filter((tb) => tb.key !== 'privacy').map((tab) => (
              <button
                key={tab.key}
                className={`nav-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="nav-icon">{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>
          <div className="nav-group nav-legal-group">
            <h3 className="nav-title">{t('navLegalTitle')}</h3>
            <button
              className={`nav-btn nav-btn-privacy ${activeTab === 'privacy' ? 'active' : ''}`}
              onClick={() => setActiveTab('privacy')}
            >
              <span className="nav-icon">🛡️</span> {t('privacyNav')}
            </button>
          </div>
        </nav>

        <div className="content-area">
          <div className="tab-content" style={{ display: activeTab === 'basic' ? 'flex' : 'none' }}>
            <div className="section">
              <h2 className="section-title">{t('basicInfo.title')}</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>{t('basicInfo.npcName')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={npc.name}
                    onChange={(e) => update({ name: e.target.value })}
                    placeholder={t('basicInfo.npcNamePlaceholder')}
                  />
                </div>
              </div>
            </div>

            <div className="section">
              <h2 className="section-title">{t('basicInfo.healthTitle')}</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>{t('basicInfo.health')}</label>
                  <input
                    type="number"
                    className="form-input"
                    value={npc.health}
                    min="1"
                    onChange={(e) => update({ health: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label>{t('basicInfo.maxHealth')}</label>
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
              <h2 className="section-title">{t('basicInfo.movementTitle')}</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>{t('basicInfo.walkInterval')}</label>
                  <input
                    type="number"
                    className="form-input"
                    value={npc.walkInterval}
                    onChange={(e) => update({ walkInterval: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label>{t('basicInfo.walkRadius')}</label>
                  <input
                    type="number"
                    className="form-input"
                    value={npc.walkRadius}
                    onChange={(e) => update({ walkRadius: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label>{t('basicInfo.speed')}</label>
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
                    {t('basicInfo.floorChange')}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="tab-content" style={{ display: activeTab === 'outfit' ? 'flex' : 'none' }}>
            <div className="section">
              <h2 className="section-title">{t('appearance.title')}</h2>
              <OutfitSelector
                outfit={npc.outfit}
                onChange={(outfit) => update({ outfit })}
              />
            </div>
          </div>

          <div className="tab-content" style={{ display: activeTab === 'messages' ? 'flex' : 'none' }}>
            <div className="section">
              <h2 className="section-title">{t('messages.title')}</h2>
              <div className="form-grid-1">
                <div className="form-group">
                  <label>{t('messages.greetLabel')}</label>
                  <textarea
                    className="form-textarea"
                    rows="2"
                    value={npc.messages.greet}
                    onChange={(e) => updateMessages({ greet: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>{t('messages.farewellLabel')}</label>
                  <textarea
                    className="form-textarea"
                    rows="2"
                    value={npc.messages.farewell}
                    onChange={(e) => updateMessages({ farewell: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>{t('messages.walkawayLabel')}</label>
                  <textarea
                    className="form-textarea"
                    rows="2"
                    value={npc.messages.walkaway}
                    onChange={(e) => updateMessages({ walkaway: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>{t('messages.sellLabel')}</label>
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
              <h2 className="section-title">{t('shop.title')}</h2>
              <p className="section-hint">{t('shop.hint')}</p>
              <ItemPicker onAdd={addShopItem} label={t('shop.addToShop')} />

              <div className="items-list" style={{ marginTop: '20px' }}>
                {npc.shop.items.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">📦</span>
                    <p>{t('shop.empty')}</p>
                  </div>
                ) : (
                  npc.shop.items.map((item) => (
                    <div key={item.uid} className="shop-item-row">
                      <span className="shop-item-name">{item.name}</span>
                      <span className="shop-item-id">#{item.id}</span>
                      {item.buy !== '' && <span className="shop-item-tag buy">{t('shop.buy')}: {item.buy}</span>}
                      {item.sell !== '' && <span className="shop-item-tag sell">{t('shop.sell')}: {item.sell}</span>}
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
              <h2 className="section-title">{t('keywords.title')}</h2>
              <p className="section-hint">{t('keywords.hint')}</p>
              <div className="form-grid">
                <div className="form-group">
                  <label>{t('keywords.keywordLabel')}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t('keywords.keywordPlaceholder')}
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>{t('keywords.responseLabel')}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t('keywords.responsePlaceholder')}
                    value={responseInput}
                    onChange={(e) => setResponseInput(e.target.value)}
                  />
                </div>
              </div>
              <button className="btn btn-gold-sm" onClick={addKeyword}>➕ {t('keywords.addKeyword')}</button>

              <InlineNotice notice={keywordNotice} />

              <div className="dialogs-list" style={{ marginTop: '20px' }}>
                {npc.keywords.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">💬</span>
                    <p>{t('keywords.empty')}</p>
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
                <h2 className="section-title">{t('preview.title')}</h2>
                <button className="btn btn-gold-sm" onClick={copyLuaToClipboard}>📋 {t('common.copy')}</button>
              </div>
              <div className="preview-box lua-preview">
                <pre className="lua-code">{luaCode}</pre>
              </div>
            </div>
          </div>

          <div className="tab-content" style={{ display: activeTab === 'scriptcreator' ? 'flex' : 'none' }}>
            <div className="section">
              <h2 className="section-title">{t('scriptCreator.title')}</h2>
              <ScriptCreator npc={npc} />
            </div>
          </div>

          <div className="tab-content" style={{ display: activeTab === 'monstereditor' ? 'flex' : 'none' }}>
            <div className="section">
              <h2 className="section-title">{t('monsterEditor.title')}</h2>
              <MonsterEditor />
            </div>
          </div>

          <div className="tab-content" style={{ display: activeTab === 'privacy' ? 'flex' : 'none' }}>
            <PrivacyPolicy />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
