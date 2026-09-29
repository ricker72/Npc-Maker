import React, { useState, useMemo } from 'react';
import { callAI, extractLuaCode } from './aiClient';
import { DEFAULT_AI_ENDPOINT, DEFAULT_AI_MODEL } from './secureConfig';
import { CRYSTAL_SERVER_SYSTEM_PROMPT, SCRIPT_TYPES_KEYS } from './crystalServerKnowledge';
import colorsData from './data/colors.json';
import { useTranslation } from './i18n/LanguageContext';
import { useTibiaAssets } from './tibia/TibiaAssetsContext';
import TibiaOutfitCanvas, { AssetsMissingNotice } from './TibiaOutfitCanvas';

function buildNpcContextSummary(npc) {
  const o = npc.outfit;
  const shopList = npc.shop?.items?.length
    ? npc.shop.items.map((it) => `  - ${it.name} (id ${it.id})${it.buy ? `, buy=${it.buy}` : ''}${it.sell ? `, sell=${it.sell}` : ''}`).join('\n')
    : '  (sin items configurados)';
  const keywordList = npc.keywords?.length
    ? npc.keywords.map((k) => `  - "${k.keyword}" -> "${k.response}"`).join('\n')
    : '  (sin keywords configuradas)';

  return `Contexto real del NPC ya configurado en la aplicación (usa EXACTAMENTE estos datos, no inventes otros):
- Nombre: ${npc.name || '(sin nombre todavía)'}
- Health/MaxHealth: ${npc.health}/${npc.maxHealth}
- Outfit: lookType=${o.lookType}, lookHead=${o.lookHead}, lookBody=${o.lookBody}, lookLegs=${o.lookLegs}, lookFeet=${o.lookFeet}, addons=${o.lookAddons}
- Mount: ${o.lookMount > 0 ? o.lookMount : 'ninguno'}
- Mensajes: greet="${npc.messages.greet}", farewell="${npc.messages.farewell}", walkaway="${npc.messages.walkaway}"
- Shop:
${shopList}
- Keywords:
${keywordList}`;
}

const NpcContextPanel = ({ npc }) => {
  const { t } = useTranslation();
  const { status, selectFolder } = useTibiaAssets();
  const [lookMissing, setLookMissing] = useState(false);

  const colorOf = (id) => colorsData.find((c) => c.id === id) || colorsData[0];

  const hasShop = npc.shop?.items?.length > 0;
  const keywords = npc.keywords || [];

  return (
    <div className="npc-context-panel-compact">
      <div className="npc-context-header">
        <span className="npc-context-title">{t('scriptCreator.npcContextTitle')}</span>
        <span className="npc-context-hint">{t('scriptCreator.npcContextHint')}</span>
      </div>

      <div className="npc-context-sprite-centered">
        {status.loaded && !lookMissing ? (
          <TibiaOutfitCanvas outfit={npc.outfit} direction={2} size={140} onMissing={setLookMissing} />
        ) : (
          <AssetsMissingNotice compact reason={lookMissing ? t('assets.lookMissing') : undefined} onSelectFolder={selectFolder} />
        )}
      </div>

      <div className="npc-context-name npc-context-name-centered">
        {npc.name ? npc.name : <em>{t('scriptCreator.npcContextNoName')}</em>}
      </div>

      <div className="npc-context-pills npc-context-pills-centered">
        <span className="outfit-meta-pill">{t('appearance.look')}: {npc.outfit.lookType}</span>
        <span className="outfit-meta-pill">{t('appearance.addons')}: {npc.outfit.lookAddons}</span>
        {npc.outfit.lookMount > 0 && <span className="outfit-meta-pill">{t('appearance.mount')}: {npc.outfit.lookMount}</span>}
      </div>

      <div className="npc-context-pills npc-context-pills-centered">
        <span className="outfit-meta-pill color-pill">
          <i style={{ background: colorOf(npc.outfit.lookHead).hex }} /> {t('appearance.head')}
        </span>
        <span className="outfit-meta-pill color-pill">
          <i style={{ background: colorOf(npc.outfit.lookBody).hex }} /> {t('appearance.body')}
        </span>
        <span className="outfit-meta-pill color-pill">
          <i style={{ background: colorOf(npc.outfit.lookLegs).hex }} /> {t('appearance.legs')}
        </span>
        <span className="outfit-meta-pill color-pill">
          <i style={{ background: colorOf(npc.outfit.lookFeet).hex }} /> {t('appearance.feet')}
        </span>
      </div>

      <div className="npc-context-dialog-icons npc-context-dialog-icons-centered">
        <span className="dialog-icon-pill" title={t('scriptCreator.greetIcon')}>👋 {t('scriptCreator.greetIcon')}</span>
        {hasShop && <span className="dialog-icon-pill trade" title={t('scriptCreator.tradeIcon')}>💰 {t('scriptCreator.tradeIcon')}</span>}
        {keywords.map((k) => (
          <span key={k.uid} className="dialog-icon-pill keyword" title={k.response}>
            🗨️ {k.keyword}
          </span>
        ))}
        <span className="dialog-icon-pill" title={t('scriptCreator.byeIcon')}>👋 {t('scriptCreator.byeIcon')}</span>
      </div>
    </div>
  );
};

const AdvancedSettings = ({ settings, onChange }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="advanced-settings">
      <button className="advanced-toggle" onClick={() => setOpen((o) => !o)}>
        ⚙️ {t('scriptCreator.advancedSettings')} {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="advanced-body">
          <p className="section-hint">{t('scriptCreator.advancedHint')}</p>
          <div className="form-grid">
            <div className="form-group">
              <label>{t('scriptCreator.endpoint')}</label>
              <input
                type="text"
                className="form-input"
                value={settings.endpoint}
                onChange={(e) => onChange({ ...settings, endpoint: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>{t('scriptCreator.model')}</label>
              <input
                type="text"
                className="form-input"
                value={settings.model}
                onChange={(e) => onChange({ ...settings, model: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>{t('scriptCreator.ownApiKey')}</label>
              <input
                type="password"
                className="form-input"
                placeholder={t('scriptCreator.ownApiKeyPlaceholder')}
                value={settings.overrideApiKey}
                onChange={(e) => onChange({ ...settings, overrideApiKey: e.target.value })}
              />
            </div>
          </div>
          <button
            className="btn btn-gold-sm"
            onClick={() => onChange({ endpoint: DEFAULT_AI_ENDPOINT, model: DEFAULT_AI_MODEL, overrideApiKey: '' })}
          >
            ↺ {t('common.restore')}
          </button>
        </div>
      )}
    </div>
  );
};

const CreatePanel = ({ settings, npc }) => {
  const { t } = useTranslation();
  const [scriptType, setScriptType] = useState('npc');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [rawResponse, setRawResponse] = useState('');
  const [error, setError] = useState('');
  const [lastPromptArgs, setLastPromptArgs] = useState(null);

  const useNpcContext = scriptType === 'npc';

  const runGenerate = async ({ scriptTypeArg, descriptionArg }) => {
    setError('');
    setLoading(true);
    setResult('');
    try {
      const typeLabel = t(`scriptCreator.scriptType${scriptTypeArg.charAt(0).toUpperCase()}${scriptTypeArg.slice(1)}`);
      const contextBlock = scriptTypeArg === 'npc'
        ? `\n${buildNpcContextSummary(npc)}\n\nUsa este contexto real como base del NPC a generar.`
        : '';

      const prompt = `Crea un script de tipo "${typeLabel}" para CrystalServer (https://github.com/zimbadev/crystalserver).
${contextBlock}

Descripción adicional de lo que debe hacer el script:
"""
${descriptionArg}
"""

Responde con el código Lua completo dentro de un bloque \`\`\`lua, y antes del bloque una explicación breve (máximo 4 líneas) de cómo funciona y dónde colocar el archivo (ej: data/scripts/npc/, data/scripts/actions/, etc).`;

      const text = await callAI({
        system: CRYSTAL_SERVER_SYSTEM_PROMPT,
        prompt,
        endpoint: settings.endpoint,
        model: settings.model,
        overrideApiKey: settings.overrideApiKey
      });
      setRawResponse(text);
      setResult(extractLuaCode(text));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const generate = () => {
    if (!description.trim()) {
      setError(t('scriptCreator.describeMissing'));
      return;
    }
    const args = { scriptTypeArg: scriptType, descriptionArg: description };
    setLastPromptArgs(args);
    runGenerate(args);
  };

  const redo = () => {
    if (lastPromptArgs) {
      runGenerate(lastPromptArgs);
    } else {
      generate();
    }
  };

  const clearAll = () => {
    setDescription('');
    setResult('');
    setRawResponse('');
    setError('');
    setLastPromptArgs(null);
  };

  const copyResult = () => navigator.clipboard.writeText(result);

  const downloadResult = () => {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(result));
    element.setAttribute('download', `${scriptType}_script.lua`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="script-panel">
      <h3 className="script-panel-title">✨ {t('scriptCreator.createTitle')}</h3>
      <p className="section-hint">{t('scriptCreator.createHint')}</p>

      <div className="form-group">
        <label>{t('scriptCreator.scriptType')}</label>
        <select className="form-input" value={scriptType} onChange={(e) => setScriptType(e.target.value)}>
          {SCRIPT_TYPES_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(`scriptCreator.scriptType${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
            </option>
          ))}
        </select>
      </div>

      {}
      <div className="script-creator-two-col">
        <div className="script-creator-col-left">
          {useNpcContext ? (
            <NpcContextPanel npc={npc} />
          ) : (
            <div className="npc-context-panel-compact npc-context-placeholder">
              <span className="sprite-fallback-icon-lg">📝</span>
            </div>
          )}
        </div>

        <div className="script-creator-col-right">
          <div className="form-group script-creator-textarea-group">
            <label>
              {t('scriptCreator.describeScript')} {useNpcContext && t('scriptCreator.describeScriptOptional')}
            </label>
            <textarea
              className="form-textarea script-creator-textarea"
              placeholder={
                useNpcContext
                  ? t('scriptCreator.describeScriptPlaceholderNpc')
                  : t('scriptCreator.describeScriptPlaceholderOther')
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="script-actions-row">
            <button className="btn btn-gold" onClick={generate} disabled={loading}>
              {loading ? `⏳ ${t('scriptCreator.generating')}` : `🚀 ${t('scriptCreator.generateScript')}`}
            </button>
            <button className="btn btn-gold-sm" onClick={redo} disabled={loading || !lastPromptArgs}>
              🔄 {t('common.redo')}
            </button>
            <button className="btn btn-danger-sm" onClick={clearAll} disabled={loading}>
              🗑️ {t('common.clearAll')}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="prompt-error">⚠️ {error}</div>}

      {rawResponse && (
        <div className="ai-explanation">
          {rawResponse.split('```')[0].trim()}
        </div>
      )}

      {result && (
        <div className="result-block">
          <div className="result-header">
            <span>📄 {t('scriptCreator.generatedScript')}</span>
            <div className="result-actions">
              <button className="btn btn-gold-sm" onClick={copyResult}>📋 {t('common.copy')}</button>
              <button className="btn btn-gold-sm" onClick={downloadResult}>📥 {t('scriptCreator.downloadLua')}</button>
            </div>
          </div>
          <pre className="lua-code">{result}</pre>
        </div>
      )}
    </div>
  );
};

const ReviewPanel = ({ settings }) => {
  const { t } = useTranslation();
  const [inputScript, setInputScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState('');
  const fileRef = React.useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setInputScript(ev.target.result);
    reader.readAsText(file);
    e.target.value = '';
  };

  const runReview = async (scriptToReview) => {
    setError('');
    setLoading(true);
    setResult('');
    setExplanation('');
    try {
      const prompt = `Revisa el siguiente script Lua y corrígelo para que sea 100% compatible con
CrystalServer (https://github.com/zimbadev/crystalserver). Puede ser un script antiguo de
TFS 0.x/OTX, de Canary, o ya de CrystalServer con errores.

Script a revisar:
\`\`\`lua
${scriptToReview}
\`\`\`

Responde primero con una lista breve de los problemas encontrados y las correcciones aplicadas
(máximo 8 puntos), y luego el script COMPLETO ya corregido dentro de un bloque \`\`\`lua.`;

      const text = await callAI({
        system: CRYSTAL_SERVER_SYSTEM_PROMPT,
        prompt,
        maxTokens: 6000,
        endpoint: settings.endpoint,
        model: settings.model,
        overrideApiKey: settings.overrideApiKey
      });
      const code = extractLuaCode(text);
      const explanationText = text.split('```')[0].trim();
      setExplanation(explanationText);
      setResult(code);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const review = () => {
    if (!inputScript.trim()) {
      setError(t('scriptCreator.reviewMissing'));
      return;
    }
    runReview(inputScript);
  };

  const redo = () => {
    if (inputScript.trim()) {
      runReview(inputScript);
    }
  };

  const clearAll = () => {
    setInputScript('');
    setResult('');
    setExplanation('');
    setError('');
  };

  const copyResult = () => navigator.clipboard.writeText(result);

  const downloadResult = () => {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(result));
    element.setAttribute('download', 'script_corregido.lua');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="script-panel">
      <h3 className="script-panel-title">🛠️ {t('scriptCreator.reviewTitle')}</h3>
      <p className="section-hint">{t('scriptCreator.reviewHint')}</p>

      <div className="form-group">
        <label>{t('scriptCreator.scriptToReview')}</label>
        <textarea
          className="form-textarea code-textarea"
          rows="10"
          placeholder={t('scriptCreator.scriptToReviewPlaceholder')}
          value={inputScript}
          onChange={(e) => setInputScript(e.target.value)}
        />
      </div>

      <div className="script-actions-row">
        <button className="btn btn-gold-sm" onClick={() => fileRef.current?.click()}>📂 {t('scriptCreator.loadLuaFile')}</button>
        <input ref={fileRef} type="file" accept=".lua,.txt" onChange={handleFile} style={{ display: 'none' }} />
        <button className="btn btn-gold" onClick={review} disabled={loading}>
          {loading ? `⏳ ${t('scriptCreator.analyzing')}` : `🔍 ${t('scriptCreator.analyzeFix')}`}
        </button>
        <button className="btn btn-gold-sm" onClick={redo} disabled={loading || !inputScript.trim()}>
          🔄 {t('common.redo')}
        </button>
        <button className="btn btn-danger-sm" onClick={clearAll} disabled={loading}>
          🗑️ {t('common.clearAll')}
        </button>
      </div>

      {error && <div className="prompt-error">⚠️ {error}</div>}

      {explanation && (
        <div className="ai-explanation">
          <strong>{t('scriptCreator.fixesApplied')}</strong>
          <div>{explanation}</div>
        </div>
      )}

      {result && (
        <div className="result-block">
          <div className="result-header">
            <span>✅ {t('scriptCreator.fixedScript')}</span>
            <div className="result-actions">
              <button className="btn btn-gold-sm" onClick={copyResult}>📋 {t('common.copy')}</button>
              <button className="btn btn-gold-sm" onClick={downloadResult}>📥 {t('scriptCreator.downloadLua')}</button>
            </div>
          </div>
          <pre className="lua-code">{result}</pre>
        </div>
      )}
    </div>
  );
};

const ScriptCreator = ({ npc }) => {
  const { t } = useTranslation();
  const [activePanel, setActivePanel] = useState('create');
  const [settings, setSettings] = useState({
    endpoint: DEFAULT_AI_ENDPOINT,
    model: DEFAULT_AI_MODEL,
    overrideApiKey: ''
  });

  return (
    <div className="script-creator">
      <div className="apikey-status-pill">
        🔒 {t('scriptCreator.usingKey')} {settings.overrideApiKey ? t('scriptCreator.overridden') : t('scriptCreator.byDefault')}
      </div>

      <AdvancedSettings settings={settings} onChange={setSettings} />

      <div className="panel-tabs">
        <button
          className={`panel-tab ${activePanel === 'create' ? 'active' : ''}`}
          onClick={() => setActivePanel('create')}
        >
          ✨ {t('scriptCreator.tabCreate')}
        </button>
        <button
          className={`panel-tab ${activePanel === 'review' ? 'active' : ''}`}
          onClick={() => setActivePanel('review')}
        >
          🛠️ {t('scriptCreator.tabReview')}
        </button>
      </div>

      <div className="script-creator-body">
        <div style={{ display: activePanel === 'create' ? 'block' : 'none' }}>
          <CreatePanel settings={settings} npc={npc} />
        </div>
        <div style={{ display: activePanel === 'review' ? 'block' : 'none' }}>
          <ReviewPanel settings={settings} />
        </div>
      </div>
    </div>
  );
};

export default ScriptCreator;
