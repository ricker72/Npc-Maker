const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, ...args) => {
      const validChannels = [];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, ...args);
      }
    },
    on: (channel, func) => {
      const validChannels = [];
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    once: (channel, func) => {
      const validChannels = [];
      if (validChannels.includes(channel)) {
        ipcRenderer.once(channel, (event, ...args) => func(...args));
      }
    }
  }
});

contextBridge.exposeInMainWorld('tibiaAssets', {
  available: true,
  selectFolder: () => ipcRenderer.invoke('tibia-assets:select-folder'),
  autoDetect: () => ipcRenderer.invoke('tibia-assets:auto-detect'),
  getSavedPath: () => ipcRenderer.invoke('tibia-assets:get-saved-path'),
  loadSaved: () => ipcRenderer.invoke('tibia-assets:load-saved'),
  getStatus: () => ipcRenderer.invoke('tibia-assets:get-status'),
  getFrame: (lookType, options) => ipcRenderer.invoke('tibia-assets:get-frame', lookType, options),
  getItemFrame: (objectId, options) => ipcRenderer.invoke('tibia-assets:get-item-frame', objectId, options),
  hasAppearance: (lookType) => ipcRenderer.invoke('tibia-assets:has-appearance', lookType),
  hasObject: (objectId) => ipcRenderer.invoke('tibia-assets:has-object', objectId),
  downloadAssets: () => ipcRenderer.invoke('tibia-assets:download-assets')
});

contextBridge.exposeInMainWorld('npcUpdates', {
  check: () => ipcRenderer.invoke('updates:check'),
  openReleasePage: (url) => ipcRenderer.invoke('updates:open-release', url),
});

