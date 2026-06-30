const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

let splashWindow;
let mainWindow;

let resolveMainReady;
const mainReadyPromise = new Promise((resolve) => { resolveMainReady = resolve; });

// ───────────────────────────────────────────────────────────────────────────
// Bloqueo total de navegadores externos.
// NPC Maker Pro nunca debe abrir Chrome/Edge/Firefox por fuera de la app:
// se deniega cualquier intento de abrir una ventana nueva o navegar a una URL
// externa desde cualquier BrowserWindow de la aplicación.
// ───────────────────────────────────────────────────────────────────────────
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

  // DevTools deshabilitado por completo: no debe poder abrirse de ninguna
  // forma (atajos de teclado, menú, ni programáticamente). Esto es una
  // defensa adicional a "devTools: false" en webPreferences.
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

// ───────────────────────────────────────────────────────────────────────────
// "Instalación"/inicialización real de primer arranque.
// No usamos navegadores ni procesos externos: todo ocurre dentro del propio
// proceso de Electron mientras se muestra el launcher. Esto prepara las
// carpetas de datos del usuario (configuración, NPCs exportados, etc.).
// ───────────────────────────────────────────────────────────────────────────
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

// ───────────────────────────────────────────────────────────────────────────
// Ventanas
// ───────────────────────────────────────────────────────────────────────────
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

  hardenWindow(splashWindow);
  splashWindow.loadFile(path.join(__dirname, 'launcher.html'));
  splashWindow.on('closed', () => { splashWindow = null; });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      devTools: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/icon.ico')
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

  const minSplashTime = delay(2200); // evita que el launcher se vea como un flash
  await Promise.all([runFirstRunSetup(), minSplashTime, mainReadyPromise]);
  reportProgress(100, 'Listo');
  await delay(400);

  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  mainWindow.show();
  mainWindow.maximize();
}

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

// Nunca abrir enlaces en el navegador externo del sistema, ni siquiera
// si en el futuro se agrega algún shell.openExternal por error: se anula
// la función a nivel de módulo dentro de este proceso.
shell.openExternal = async () => {
  console.warn('Intento de abrir navegador externo bloqueado por configuración de NPC Maker Pro.');
  return false;
};

// Menú de la aplicación
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
