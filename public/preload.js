const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs seguras a la aplicación
contextBridge.exposeInMainWorld('electron', {
  // Funciones del IPC
  ipcRenderer: {
    send: (channel, ...args) => {
      // Whitelist de canales permitidos
      const validChannels = [];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, ...args);
      }
    },
    on: (channel, func) => {
      // Whitelist de canales permitidos
      const validChannels = [];
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    once: (channel, func) => {
      // Whitelist de canales permitidos
      const validChannels = [];
      if (validChannels.includes(channel)) {
        ipcRenderer.once(channel, (event, ...args) => func(...args));
      }
    }
  }
});

// API para cargar/consultar los assets reales del cliente Tibia (outfits y
// monturas con sus sprites originales, en vez de depender de un servicio
// externo). Solo expone invocaciones puntuales (nunca fs/ipcRenderer crudo).
contextBridge.exposeInMainWorld('tibiaAssets', {
  selectFolder: () => ipcRenderer.invoke('tibia-assets:select-folder'),
  getSavedPath: () => ipcRenderer.invoke('tibia-assets:get-saved-path'),
  loadSaved: () => ipcRenderer.invoke('tibia-assets:load-saved'),
  // options: { group: 'idle'|'moving', direction: 0-3, patternY: 0-2, z: 0|1, phase: number }
  getFrame: (lookType, options) => ipcRenderer.invoke('tibia-assets:get-frame', lookType, options),
});
