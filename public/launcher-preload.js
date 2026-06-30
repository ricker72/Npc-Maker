const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcherApi', {
  onProgress: (callback) => {
    ipcRenderer.on('setup-progress', (_event, percent, label) => {
      callback(percent, label);
    });
  }
});
