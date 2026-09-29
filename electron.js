const { app, BrowserWindow, Menu, shell, ipcMain, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const tibiaAssets = require('./tibiaAssetLoader');
const updateChecker = require('./updateChecker');

const isDev = !app.isPackaged;

const ASSETS_DOWNLOAD_URL =
  'https://github.com/ricker72/ricker72.github.io/releases/download/Clients/Cliente.15.33.assets.zip';

const openExternalOriginal = shell.openExternal.bind(shell);

let splashWindow;
let mainWindow;

let resolveMainReady;
const mainReadyPromise = new Promise((resolve) => { resolveMainReady = resolve; });

function hardenWindow(win) {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  win.webContents.on('will-navigate', (event, url) => {
    const isAppUrl =
      url.startsWith('file://') ||
      url.startsWith('http://localhost:3000');
    if (!isAppUrl) {
      event.preventDefault();
    }
  });

  win.webContents.on('devtools-opened', () => {
    win.webContents.closeDevTools();
  });

  win.webContents.on('before-input-event', (event, input) => {
    const key = (input.key || '').toLowerCase();
    const isF12 = key === 'f12';
    const isCtrlShiftI = input.control && input.shift && (key === 'i' || key === 'j' || key === 'c');
    const isCmdOptI = input.meta && input.alt && (key === 'i' || key === 'j' || key === 'c');
    if (isF12 || isCtrlShiftI || isCmdOptI) {
      event.preventDefault();
    }
  });
}

function reportProgress(percent, label) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('setup-progress', percent, label);
  }
}

async function runFirstRunSetup() {
  const userDataPath = app.getPath('userData');
  const exportsPath = path.join(userDataPath, 'npc-exports');
  const configPath = path.join(userDataPath, 'config.json');

  reportProgress(10, 'Verificando instalación');
  await delay(150);

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  reportProgress(35, 'Preparando carpetas de datos');
  await delay(150);

  if (!fs.existsSync(exportsPath)) {
    fs.mkdirSync(exportsPath, { recursive: true });
  }
  reportProgress(55, 'Configurando entorno');
  await delay(150);

  if (!fs.existsSync(configPath)) {
    const defaultConfig = {
      version: app.getVersion(),
      firstRunAt: new Date().toISOString(),
      exportsPath
    };
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
  }
  reportProgress(75, 'Cargando módulos de la aplicación');
  await delay(150);

  reportProgress(90, 'Preparando interfaz');
  await delay(150);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function readConfig() {
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeConfigField(key, value) {
  const config = readConfig();
  config[key] = value;
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
}




function getWorkArea(win) {
  
  
  const display = win && !win.isDestroyed()
    ? screen.getDisplayMatching(win.getBounds())
    : screen.getPrimaryDisplay();
  return display.workArea;
}

function fitToWorkArea(win, preferred) {
  if (!win || win.isDestroyed()) return;

  const area = getWorkArea(win);
  const prefW = preferred.width || 1400;
  const prefH = preferred.height || 900;

  
  const width = Math.max(480, Math.min(prefW, area.width));
  const height = Math.max(360, Math.min(prefH, area.height));

  
  
  win.setMinimumSize(
    Math.min(preferred.minWidth || 1000, width),
    Math.min(preferred.minHeight || 700, height)
  );

  
  
  win.setBounds({
    x: Math.round(area.x + (area.width - width) / 2),
    y: Math.round(area.y + (area.height - height) / 2),
    width,
    height
  });
}


function fillWorkArea(win) {
  if (!win || win.isDestroyed()) return;
  const area = getWorkArea(win);
  const [minW, minH] = win.getMinimumSize();

  
  
  
  
  const width = area.width;
  const height = area.height;

  win.setMinimumSize(
    Math.min(minW, width),
    Math.min(minH, height)
  );

  win.setBounds({
    x: area.x,
    y: area.y,
    width,
    height
  });
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 900,
    height: 600,
    frame: false,
    resizable: false,
    movable: true,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
      preload: path.join(__dirname, 'launcher-preload.js')
    }
  });

  
  
  fitToWorkArea(splashWindow, { width: 900, height: 600 });

  hardenWindow(splashWindow);
  splashWindow.loadFile(path.join(__dirname, 'launcher.html'));
  splashWindow.on('closed', () => { splashWindow = null; });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    
    
    show: false,
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      devTools: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.ico')
  });

  fitToWorkArea(mainWindow, { width: 1400, height: 900, minWidth: 1000, minHeight: 700 });

  
  
  const refit = () => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isMaximized()) {
      fitToWorkArea(mainWindow, mainWindow.getBounds());
    }
  };
  screen.on('display-metrics-changed', refit);
  screen.on('display-added', refit);
  screen.on('display-removed', refit);

  
  
  
  
  
  
  
  let maximizing = false;

  mainWindow.on('maximize', () => {
    if (maximizing) return;
    maximizing = true;
    setImmediate(() => {
      
      
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.unmaximize();
        fillWorkArea(mainWindow);
      }
      maximizing = false;
    });
  });

  
  mainWindow.on('unmaximize', () => {
    if (maximizing || !mainWindow || mainWindow.isDestroyed()) return;
    fitToWorkArea(mainWindow, { width: 1400, height: 900, minWidth: 1000, minHeight: 700 });
  });

  hardenWindow(mainWindow);

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    resolveMainReady();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function bootApp() {
  createSplashWindow();
  createMainWindow();

  const minSplashTime = delay(2200);
  await Promise.all([runFirstRunSetup(), minSplashTime, mainReadyPromise]);
  reportProgress(100, 'Listo');
  await delay(400);

  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }

  
  
  
  
  
  mainWindow.show();
  fillWorkArea(mainWindow);
}

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('updates:check', () => updateChecker.checkForUpdates(app.getVersion()));

ipcMain.handle('updates:open-release', async (_event, url) => {
  if (!updateChecker.isOfficialReleaseUrl(url)) {
    console.warn('updates:open-release bloqueado — URL fuera de la whitelist:', url);
    return false;
  }
  try {
    await openExternalOriginal(url);
    return true;
  } catch (err) {
    console.warn('updates:open-release falló:', err.message);
    return false;
  }
});

ipcMain.handle('tibia-assets:get-saved-path', () => {
  const config = readConfig();
  return config.tibiaAssetsPath || null;
});

ipcMain.handle('tibia-assets:load-saved', async () => {
  const config = readConfig();
  if (!config.tibiaAssetsPath) return { ok: false, error: 'No hay carpeta guardada.' };
  return tibiaAssets.loadAssets(config.tibiaAssetsPath);
});

ipcMain.handle('tibia-assets:auto-detect', async () => {
  const result = await tibiaAssets.loadAssets();
  if (result.ok) {
    writeConfigField('tibiaAssetsPath', result.path);
  }
  return result;
});

ipcMain.handle('tibia-assets:get-status', () => tibiaAssets.getLoadedInfo());

ipcMain.handle('tibia-assets:select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecciona la carpeta "assets" del cliente Tibia',
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { ok: false, canceled: true };
  }
  const chosen = result.filePaths[0];
  const loadResult = await tibiaAssets.loadAssets(chosen);
  if (loadResult.ok) {
    writeConfigField('tibiaAssetsPath', loadResult.path);
  }
  return loadResult;
});

ipcMain.handle('tibia-assets:get-frame', (_event, lookType, options) => {
  try {
    return tibiaAssets.getAppearanceFrame(lookType, options);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('tibia-assets:get-item-frame', (_event, objectId, options) => {
  try {
    return tibiaAssets.getItemFrame(objectId, options);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('tibia-assets:has-appearance', (_event, lookType) =>
  tibiaAssets.hasAppearance(lookType)
);

ipcMain.handle('tibia-assets:has-object', (_event, objectId) => tibiaAssets.hasObject(objectId));

ipcMain.handle('tibia-assets:download-assets', async () => {
  try {
    await openExternalOriginal(ASSETS_DOWNLOAD_URL);
    return true;
  } catch (err) {
    console.warn('tibia-assets:download-assets fallo:', err.message);
    return false;
  }
});

app.on('ready', bootApp);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

shell.openExternal = async () => {
  console.warn('Intento de abrir navegador externo bloqueado por configuración de NPC Maker Pro.');
  return false;
};

const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Exit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => app.quit()
      }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);