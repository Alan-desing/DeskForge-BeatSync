const { app, BrowserWindow, Menu, Tray, dialog, nativeImage, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

/**
 * Obtain or generate the tray icon for Windows.
 */
function getTrayIcon() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  try {
    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) {
      return icon;
    }
  } catch (err) {
    console.error('Error loading tray icon from file:', err);
  }

  // Fallback data URL icon
  const fallbackDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSU5EUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAADhJREFUWIXtzDENADAMwLCk/qWn4eioC/SAggRerpmZWbfg122+AQAAAAAAAAAAAAAAAADAa8AGxVwAAd2z+eQAAAAASUVORK5CYII=';
  return nativeImage.createFromDataURL(fallbackDataUrl);
}

/**
 * Create and configure System Tray.
 */
function createTray() {
  const icon = getTrayIcon();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'DeskForge + BeatSync',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Mostrar / Ocultar Ventana',
      click: () => {
        if (!mainWindow) return;
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Acerca de DeskForge',
      click: () => showAboutDialog()
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('DeskForge + BeatSync - Suite de Productividad');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

/**
 * Display native About dialog.
 */
function showAboutDialog() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Acerca de DeskForge + BeatSync',
    message: 'DeskForge + BeatSync v1.0.0',
    detail: 'Suite de productividad con reproductor musical interactivo.\n\nE1: Ventana principal redimensionable, menú nativo y bandeja del sistema (System Tray).\nPlataforma: Windows (Electron + Desktop APIs).',
    buttons: ['Aceptar']
  });
}

/**
 * Configure native Application Menu.
 */
function createApplicationMenu() {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Acerca de DeskForge',
          click: () => showAboutDialog()
        },
        { type: 'separator' },
        {
          label: 'Minimizar a la Bandeja (Tray)',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            if (mainWindow) mainWindow.hide();
          }
        },
        { type: 'separator' },
        {
          label: 'Salir',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Recargar', role: 'reload' },
        { label: 'Forzar recarga', role: 'forceReload' },
        { label: 'Herramientas de desarrollo', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Restablecer zoom', role: 'resetZoom' },
        { label: 'Acercar zoom', role: 'zoomIn' },
        { label: 'Alejar zoom', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Pantalla completa', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Ventana',
      submenu: [
        { label: 'Minimizar', role: 'minimize' },
        { label: 'Zoom / Maximizar', role: 'zoom' },
        { type: 'separator' },
        { label: 'Cerrar', role: 'close' }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Documentación E1',
          click: () => showAboutDialog()
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Create main BrowserWindow.
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    resizable: true,
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for E1
ipcMain.handle('app:showAbout', () => {
  showAboutDialog();
});

ipcMain.handle('app:minimizeToTray', () => {
  if (mainWindow) mainWindow.hide();
});

app.whenReady().then(() => {
  createApplicationMenu();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
