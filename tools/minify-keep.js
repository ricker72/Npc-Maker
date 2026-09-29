// Nombres que NO se pueden renombrar porque Electron o Node los resuelve por
// su cuenta al arrancar. Si se manglingaran, la app no arrancaria.
// electron-builder: no toca este archivo, solo lo usa el hook antes de
// empaquetar, y estos nombres se necesitan tambien en el build de produccion.
module.exports = [
  'app', 'BrowserWindow', 'Menu', 'shell', 'ipcMain', 'dialog', 'screen',
  'nativeImage', 'contextBridge', 'ipcRenderer', 'webFrame',
  'require', 'module', 'exports', '__dirname', '__filename', 'process',
  'Buffer', 'console', 'JSON', 'Math', 'Object', 'Array', 'String', 'Number',
  'Boolean', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Error', 'TypeError',
  'Uint8Array', 'Uint8ClampedArray', 'Int32Array', 'Float32Array', 'DataView',
  'ImageData', 'setImmediate', 'setTimeout', 'setInterval', 'clearTimeout',
  'clearInterval', 'fetch', 'URL', 'TextEncoder', 'TextDecoder', 'Proxy',
  'Reflect', 'Symbol', 'RegExp', 'Date', 'parseInt', 'parseFloat', 'isNaN',
];
