import React, { useState, useMemo } from 'react';
import { callAI, extractLuaCode } from './aiClient';
import { DEFAULT_AI_ENDPOINT, DEFAULT_AI_MODEL } from './secureConfig';
import { CRYSTAL_SERVER_SYSTEM_PROMPT, SCRIPT_TYPES } from './crystalServerKnowledge';
import { buildOutfitImageUrl } from './luaGenerator';
import colorsData from './data/colors.json';

// ─────────────────────────────────────────────────────────────────────────
// Construye un resumen en texto del NPC tal como está configurado en el
// resto de la app (Basic Info + Appearance), para que la IA lo use como
// datos reales en vez de tener que describirlo de nuevo desde cero.
// ─────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────
// Panel de contexto: muestra automáticamente el nombre, apariencia y
// monturas configuradas en Basic Info / Appearance, más los iconos de
// diálogo correspondientes (trade, keywords, saludo/despedida).
// ─────────────────────────────────────────────────────────────────────────
const NpcContextPanel = ({ npc }) => {
  const [imgError, setImgError] = useState(false);
  const imgUrl = useMemo(() => buildOutfitImageUrl(npc.outfit), [npc.outfit]);

  const colorOf = (id) => colorsData.find((c) => c.id === id) || colorsData[0];

  const hasShop = npc.shop?.items?.length > 0;
  const keywords = npc.keywords || [];

  return (
    <div className="npc-context-panel">
      <div className="npc-context-header">
        <span className="npc-context-title">🔎 NPC detectado automáticamente</span>
        <span className="npc-context-hint">(se sincroniza solo con Basic Info y Appearance)</span>
      </div>

      <div className="npc-context-body">
        <div className="npc-context-sprite">
          {!imgError ? (
            <img
              src={imgUrl}
              alt="preview"
              className="character-sprite-sm"
              onError={() => setImgError(true)}
              onLoad={() => setImgError(false)}
            />
          ) : (
            <span className="sprite-fallback-icon-sm">👤</span>
          )}
        </div>

        <div className="npc-context-info">
          <div className="npc-context-name">
            {npc.name ? npc.name : <em>(todavía sin nombre — ve a "Basic Info")</em>}
          </div>

          <div className="npc-context-pills">
            <span className="outfit-meta-pill">Look: {npc.outfit.lookType}</span>
            <span className="outfit-meta-pill">Addons: {npc.outfit.lookAddons}</span>
            {npc.outfit.lookMount > 0 && <span className="outfit-meta-pill">Mount: {npc.outfit.lookMount}</span>}
            <span className="outfit-meta-pill color-pill">
              <i style={{ background: colorOf(npc.outfit.lookHead).hex }} /> Head
            </span>
            <span className="outfit-meta-pill color-pill">
              <i style={{ background: colorOf(npc.outfit.lookBody).hex }} /> Body
            </span>
            <span className="outfit-meta-pill color-pill">
              <i style={{ background: colorOf(npc.outfit.lookLegs).hex }} /> Legs
            </span>
            <span className="outfit-meta-pill color-pill">
              <i style={{ background: colorOf(npc.outfit.lookFeet).hex }} /> Feet
            </span>
          </div>

          <div className="npc-context-dialog-icons">
            <span className="dialog-icon-pill" title="Saludo configurado">👋 Greet</span>
            {hasShop && <span className="dialog-icon-pill trade" title="Tiene shop configurado">💰 Trade</span>}
            {keywords.map((k) => (
              <span key={k.uid} className="dialog-icon-pill keyword" title={k.response}>
                🗨️ {k.keyword}
              </span>
            ))}
            <span className="dialog-icon-pill" title="Despedida configurada">👋 Bye</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdvancedSettings = ({ settings, onChange }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="advanced-settings">
      <button className="advanced-toggle" onClick={() => setOpen((o) => !o)}>
        ⚙️ Configuración avanzada {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="advanced-body">
          <p className="section-hint">
            Por defecto la app usa una API key integrada (ofuscada en el código) y el endpoint
            de api.paxsenix.org. Solo cambia esto si tienes tu propia key/endpoint o si el formato
            de respuesta de la API no coincide.
          </p>
          <div className="form-grid">
            <div className="form-group">
              <label>Endpoint</label>
              <input
                type="text"
                className="form-input"
                value={settings.endpoint}
                onChange={(e) => onChange({ ...settings, endpoint: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Modelo</label>
              <input
                type="text"
                className="form-input"
                value={settings.model}
                onChange={(e) => onChange({ ...settings, model: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>API Key propia (opcional, sobreescribe la integrada)</label>
              <input
                type="password"
                className="form-input"
                placeholder="dejar en blanco para usar la integrada"
                value={settings.overrideApiKey}
                onChange={(e) => onChange({ ...settings, overrideApiKey: e.target.value })}
              />
            </div>
          </div>
          <button
            className="btn btn-gold-sm"
            onClick={() => onChange({ endpoint: DEFAULT_AI_ENDPOINT, model: DEFAULT_AI_MODEL, overrideApiKey: '' })}
          >
            ↺ Restaurar valores por defecto
          </button>
        </div>
      )}
    </div>
  );
};

const CreatePanel = ({ settings, npc }) => {
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
      const typeLabel = SCRIPT_TYPES.find((t) => t.value === scriptTypeArg)?.label || scriptTypeArg;
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
      setError('Describe qué debe hacer el script.');
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
      <h3 className="script-panel-title">✨ Crear Script Lua</h3>
      <p className="section-hint">
        Describe en lenguaje natural qué quieres que haga el script. La IA generará código
        compatible con la API real de CrystalServer (NpcHandler, KeywordHandler, Game.createNpcType, etc.).
      </p>

      <div className="form-group">
        <label>Tipo de script</label>
        <select className="form-input" value={scriptType} onChange={(e) => setScriptType(e.target.value)}>
          {SCRIPT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {useNpcContext && <NpcContextPanel npc={npc} />}

      <div className="form-group">
        <label>Describe el script {useNpcContext && '(detalles adicionales, opcional)'}</label>
        <textarea
          className="form-textarea"
          rows="6"
          placeholder={
            useNpcContext
              ? 'ej: Que también ofrezca curar al jugador por 50 gold si dice "heal"'
              : 'ej: Un action que al usar una palanca abra una puerta en la posición X,Y,Z'
          }
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="script-actions-row">
        <button className="btn btn-gold" onClick={generate} disabled={loading}>
          {loading ? '⏳ Generando...' : '🚀 Generar Script'}
        </button>
        <button className="btn btn-gold-sm" onClick={redo} disabled={loading || !lastPromptArgs}>
          🔄 Rehacer
        </button>
        <button className="btn btn-danger-sm" onClick={clearAll} disabled={loading}>
          🗑️ Borrar todo
        </button>
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
            <span>📄 Script generado</span>
            <div className="result-actions">
              <button className="btn btn-gold-sm" onClick={copyResult}>📋 Copiar</button>
              <button className="btn btn-gold-sm" onClick={downloadResult}>📥 Descargar .lua</button>
            </div>
          </div>
          <pre className="lua-code">{result}</pre>
        </div>
      )}
    </div>
  );
};

const ReviewPanel = ({ settings }) => {
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
      setError('Pega o carga el script que quieres revisar.');
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
      <h3 className="script-panel-title">🛠️ Revisar y Corregir Script</h3>
      <p className="section-hint">
        Pega un script Lua antiguo o nuevo (de cualquier OT server) y la IA lo analizará y
        corregirá para que sea compatible con la API real de CrystalServer.
      </p>

      <div className="form-group">
        <label>Script a revisar</label>
        <textarea
          className="form-textarea code-textarea"
          rows="10"
          placeholder="Pega aquí tu script .lua..."
          value={inputScript}
          onChange={(e) => setInputScript(e.target.value)}
        />
      </div>

      <div className="script-actions-row">
        <button className="btn btn-gold-sm" onClick={() => fileRef.current?.click()}>📂 Cargar archivo .lua</button>
        <input ref={fileRef} type="file" accept=".lua,.txt" onChange={handleFile} style={{ display: 'none' }} />
        <button className="btn btn-gold" onClick={review} disabled={loading}>
          {loading ? '⏳ Analizando...' : '🔍 Analizar y Corregir'}
        </button>
        <button className="btn btn-gold-sm" onClick={redo} disabled={loading || !inputScript.trim()}>
          🔄 Rehacer
        </button>
        <button className="btn btn-danger-sm" onClick={clearAll} disabled={loading}>
          🗑️ Borrar todo
        </button>
      </div>

      {error && <div className="prompt-error">⚠️ {error}</div>}

      {explanation && (
        <div className="ai-explanation">
          <strong>Correcciones aplicadas:</strong>
          <div>{explanation}</div>
        </div>
      )}

      {result && (
        <div className="result-block">
          <div className="result-header">
            <span>✅ Script corregido</span>
            <div className="result-actions">
              <button className="btn btn-gold-sm" onClick={copyResult}>📋 Copiar</button>
              <button className="btn btn-gold-sm" onClick={downloadResult}>📥 Descargar .lua</button>
            </div>
          </div>
          <pre className="lua-code">{result}</pre>
        </div>
      )}
    </div>
  );
};

const ScriptCreator = ({ npc }) => {
  const [activePanel, setActivePanel] = useState('create');
  const [settings, setSettings] = useState({
    endpoint: DEFAULT_AI_ENDPOINT,
    model: DEFAULT_AI_MODEL,
    overrideApiKey: ''
  });

  return (
    <div className="script-creator">
      <div className="apikey-status-pill">
        🔒 Usando API key integrada {settings.overrideApiKey ? '(sobreescrita manualmente)' : '(por defecto)'}
      </div>

      <AdvancedSettings settings={settings} onChange={setSettings} />

      <div className="panel-tabs">
        <button
          className={`panel-tab ${activePanel === 'create' ? 'active' : ''}`}
          onClick={() => setActivePanel('create')}
        >
          ✨ Crear Script
        </button>
        <button
          className={`panel-tab ${activePanel === 'review' ? 'active' : ''}`}
          onClick={() => setActivePanel('review')}
        >
          🛠️ Revisar y Corregir
        </button>
      </div>

      {/* Ambos paneles quedan siempre montados para no perder lo escrito
          al alternar entre "Crear" y "Revisar". */}
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
