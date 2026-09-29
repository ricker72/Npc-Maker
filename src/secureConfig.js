
const PAD = 'CNM-Pro-2024-CrystalServer-ScriptCreator-Secure-Pad';

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

export const DEFAULT_AI_ENDPOINT = 'https://api.paxsenix.org/v1/chat/completions';
export const DEFAULT_AI_MODEL = 'gpt-4o';
