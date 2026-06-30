// aiClient.js
// Cliente para llamar al proveedor de IA configurado (por defecto api.paxsenix.org).
//
// NOTA: api.paxsenix.org no es un servicio oficial de Anthropic ni está documentado
// en este entorno (no se pudo verificar su esquema exacto de request/response al
// construir esta integración). Por eso:
//   1) El parsing de la respuesta intenta varios formatos comunes (estilo OpenAI,
//      estilo genérico { content }/{ result }/{ response }/{ text }, etc.)
//   2) El endpoint y el modelo son editables desde "⚙️ Configuración avanzada" en
//      el Script Creator, sin tocar código, en caso de que el formato real difiera.
//
// Si tienes la documentación oficial de api.paxsenix.org, ajusta buildRequestBody()
// y parseResponse() para que coincidan exactamente.

import { getEmbeddedApiKey, DEFAULT_AI_ENDPOINT, DEFAULT_AI_MODEL } from './secureConfig';

function buildRequestBody({ model, system, prompt, maxTokens }) {
  // Formato estilo OpenAI Chat Completions (el más común entre agregadores/proxies de IA)
  return {
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt }
    ]
  };
}

function parseResponseText(data) {
  // Intenta varios formatos de respuesta conocidos, en orden de probabilidad.
  if (typeof data === 'string') return data;

  const tryPaths = [
    () => data?.choices?.[0]?.message?.content,
    () => data?.choices?.[0]?.text,
    () => data?.message?.content,
    () => data?.content,
    () => data?.result,
    () => data?.response,
    () => data?.text,
    () => data?.data?.content,
    () => data?.data?.message
  ];

  for (const tryPath of tryPaths) {
    try {
      const value = tryPath();
      if (typeof value === 'string' && value.trim()) return value;
    } catch {
      // sigue intentando con el siguiente formato
    }
  }

  return null;
}

export async function callAI({
  system,
  prompt,
  maxTokens = 4000,
  endpoint,
  model,
  overrideApiKey
}) {
  const apiKey = (overrideApiKey && overrideApiKey.trim()) || getEmbeddedApiKey();
  const finalEndpoint = endpoint || DEFAULT_AI_ENDPOINT;
  const finalModel = model || DEFAULT_AI_MODEL;

  if (!apiKey) {
    throw new Error('No hay API key disponible (ni embebida ni configurada manualmente).');
  }

  const response = await fetch(finalEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(buildRequestBody({ model: finalModel, system, prompt, maxTokens }))
  });

  const rawText = await response.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = rawText;
  }

  if (!response.ok) {
    const detail = typeof data === 'object' ? (data?.error?.message || JSON.stringify(data)) : data;
    throw new Error(`Error de la API (${response.status}): ${detail}`);
  }

  const text = parseResponseText(data);
  if (!text) {
    throw new Error(
      'La API respondió pero no se pudo interpretar el formato de la respuesta. ' +
      'Revisa "⚙️ Configuración avanzada" y ajusta el endpoint/modelo, o reporta el formato real ' +
      'de api.paxsenix.org para adaptar el parser.\n\nRespuesta cruda: ' +
      (typeof data === 'string' ? data.slice(0, 500) : JSON.stringify(data).slice(0, 500))
    );
  }

  return text;
}

// Extrae el primer bloque de código Lua de una respuesta en markdown.
export function extractLuaCode(responseText) {
  const luaBlockMatch = responseText.match(/```lua\s*([\s\S]*?)```/i);
  if (luaBlockMatch) return luaBlockMatch[1].trim();

  const genericBlockMatch = responseText.match(/```\s*([\s\S]*?)```/);
  if (genericBlockMatch) return genericBlockMatch[1].trim();

  return responseText.trim();
}
