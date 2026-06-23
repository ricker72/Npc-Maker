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
