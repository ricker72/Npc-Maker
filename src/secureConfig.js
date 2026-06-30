// secureConfig.js
//
// ════════════════════════════════════════════════════════════════════════
// ⚠️  AVISO DE SEGURIDAD IMPORTANTE — LEER ANTES DE DISTRIBUIR ESTA APP
// ════════════════════════════════════════════════════════════════════════
// Lo de abajo es OFUSCACIÓN (XOR + Base64), NO es cifrado criptográfico real.
//
// Esta es una app de escritorio (Electron) que se ejecuta en la máquina del
// propio usuario final. El proceso necesita poder leer la API key en algún
// momento para usarla — y si el proceso puede leerla, cualquier persona que
// tenga esta misma app TAMBIÉN puede, por ejemplo:
//   • Abriendo las DevTools de Electron (Ctrl+Shift+I) y escribiendo
//     getEmbeddedApiKey() en la consola.
//   • Leyendo el bundle JS empaquetado (build/static/js/*.js) con un editor
//     de texto.
//   • Interceptando la petición de red saliente hacia api.paxsenix.org
//     (la key va en el header Authorization en texto plano, como exige
//     cualquier API HTTP).
//
// No existe ninguna técnica (esta, AES con clave embebida, WASM, etc.) que
// evite esto — es una limitación fundamental de cualquier secreto colocado
// dentro de software que el usuario final ejecuta en su propia máquina.
//
// Esta ofuscación SOLO evita que la key aparezca como texto plano legible
// a simple vista al abrir el archivo fuente. Es razonable si esta app es de
// uso personal/privado. Si en algún momento planeas distribuir esta app a
// terceros y necesitas que la key sea realmente inaccesible para ellos, la
// única solución correcta es un pequeño servidor proxy propio que tú
// controles: la app llamaría a TU servidor, y TU servidor (no la app,
// que vive en la máquina de otra persona) guardaría la key y reenviaría la
// petición a la IA. Ver el README, sección "Seguridad de la API Key".
// ════════════════════════════════════════════════════════════════════════

const PAD = 'CNM-Pro-2024-CrystalServer-ScriptCreator-Secure-Pad';

// Clave ofuscada con XOR + Base64 (ver aviso arriba)
const ENCODED_KEY = 'MCVgXTEKHEhcWUoZG3IQNicjFyoGNQRBBxxLPygeAzxFOioAUTwpOVwfXQ4+AT0fIAgmLzh9Wig1XUBb';

function xorTransform(text, pad) {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    out += String.fromCharCode(text.charCodeAt(i) ^ pad.charCodeAt(i % pad.length));
  }
  return out;
}

export function getEmbeddedApiKey() {
  try {
    const xored = atob(ENCODED_KEY);
    return xorTransform(xored, PAD);
  } catch (e) {
    console.error('No se pudo decodificar la API key embebida', e);
    return '';
  }
}

// Configuración por defecto del proveedor de IA.
// Puedes ajustar estos valores desde el panel "⚙️ Configuración avanzada"
// del Script Creator sin tocar código.
export const DEFAULT_AI_ENDPOINT = 'https://api.paxsenix.org/v1/chat/completions';
export const DEFAULT_AI_MODEL = 'gpt-4o';
