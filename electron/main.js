const { app, BrowserWindow, Menu, Tray, dialog, nativeImage, ipcMain, Notification, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

// Register custom media scheme for secure local audio streaming in Howler.js
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true
    }
  }
]);

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
    detail: 'Suite de productividad con reproductor musical interactivo.\n\nE1: Ventana principal, menú nativo y tray.\nE2: Bloc de Notas con autoguardado.\nE3: Temporizador Pomodoro con notificaciones.\nE4: Reproductor musical Howler.js.\nE5: Carga de música local (MP3, OGG, WAV).\nPlataforma: Windows (Electron + Desktop APIs).',
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
          label: 'Documentación de DeskForge',
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

// IPC Handlers for E2 - Bloc de Notas
ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Abrir archivo de texto',
    properties: ['openFile'],
    filters: [
      { name: 'Archivos de texto', extensions: ['txt', 'md', 'json', 'js', 'css', 'html'] },
      { name: 'Todos los archivos', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { path: filePath, content };
  } catch (err) {
    console.error('Error leyendo archivo:', err);
    throw new Error('No se pudo leer el archivo seleccionado.');
  }
});

ipcMain.handle('file:save', async (_, { filePath, content }) => {
  let targetPath = filePath;

  if (!targetPath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Guardar nota',
      defaultPath: 'nota.txt',
      filters: [
        { name: 'Archivos de texto (*.txt)', extensions: ['txt'] },
        { name: 'Markdown (*.md)', extensions: ['md'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return null;
    }
    targetPath = result.filePath;
  }

  try {
    fs.writeFileSync(targetPath, content, 'utf-8');
    
    if (Notification.isSupported()) {
      new Notification({
        title: 'DeskForge — Bloc de Notas',
        body: `Nota guardada con éxito en ${path.basename(targetPath)}`
      }).show();
    }
    
    return { path: targetPath };
  } catch (err) {
    console.error('Error guardando archivo:', err);
    throw new Error('No se pudo guardar el archivo.');
  }
});

ipcMain.handle('file:saveAs', async (_, { content }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Guardar nota como...',
    defaultPath: 'nota.txt',
    filters: [
      { name: 'Archivos de texto (*.txt)', extensions: ['txt'] },
      { name: 'Markdown (*.md)', extensions: ['md'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  try {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    
    if (Notification.isSupported()) {
      new Notification({
        title: 'DeskForge — Bloc de Notas',
        body: `Nota guardada como ${path.basename(result.filePath)}`
      }).show();
    }
    
    return { path: result.filePath };
  } catch (err) {
    console.error('Error guardando archivo como:', err);
    throw new Error('No se pudo guardar el archivo.');
  }
});

// IPC Handler for E3 - Notifications
ipcMain.handle('notify', async (_, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title || 'DeskForge — Pomodoro',
      body: body || '¡Temporizador finalizado!'
    }).show();
    return true;
  }
  return false;
});

// IPC Handler for E5 - Local Music Folder Selection & Scan (MP3, OGG, WAV)
ipcMain.handle('music:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar carpeta de música local',
    properties: ['openDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const folderPath = result.filePaths[0];
  try {
    const fileNames = fs.readdirSync(folderPath);
    const audioFiles = fileNames
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return ext === '.mp3' || ext === '.ogg' || ext === '.wav';
      })
      .map((file) => {
        const fullPath = path.join(folderPath, file);
        const ext = path.extname(file).toLowerCase().replace('.', '');
        const baseTitle = path.basename(file, '.' + ext);

        // Build robust media protocol URL: media://C:/path/to/file.mp3
        const formattedPath = fullPath.replace(/\\/g, '/');
        const mediaSrc = `media:///${formattedPath}`;

        return {
          id: `local-${Math.random().toString(36).substring(2, 9)}`,
          title: baseTitle,
          artist: 'Música Local',
          album: path.basename(folderPath),
          format: ext.toUpperCase(),
          duration: 0,
          path: fullPath,
          src: mediaSrc,
          coverGradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)'
        };
      });

    return {
      folderPath,
      folderName: path.basename(folderPath),
      tracks: audioFiles
    };
  } catch (err) {
    console.error('Error leyendo carpeta de música:', err);
    throw new Error('No se pudo abrir la carpeta seleccionada.');
  }
});

app.whenReady().then(() => {
  // Handle custom media:// protocol to serve local audio files directly from disk
  protocol.handle('media', (request) => {
    try {
      let pathPart = request.url.replace(/^media:\/*/, '');
      pathPart = decodeURIComponent(pathPart);

      // On Windows: fix drive letter if Chromium stripped colon (e.g. "c/Users..." -> "c:/Users...")
      if (/^\/?[a-zA-Z]\//.test(pathPart)) {
        pathPart = pathPart.replace(/^\/?([a-zA-Z])\//, '$1:/');
      } else if (/^\/[a-zA-Z]:/.test(pathPart)) {
        pathPart = pathPart.substring(1);
      }

      const normalizedPath = path.normalize(pathPart);

      if (!fs.existsSync(normalizedPath)) {
        console.warn('[MediaProtocol] File not found:', normalizedPath);
        return new Response('File not found', { status: 404 });
      }

      const fileBuffer = fs.readFileSync(normalizedPath);
      const ext = path.extname(normalizedPath).toLowerCase();
      let mimeType = 'audio/mpeg';
      if (ext === '.wav') mimeType = 'audio/wav';
      if (ext === '.ogg') mimeType = 'audio/ogg';

      return new Response(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': fileBuffer.length.toString(),
          'Accept-Ranges': 'bytes'
        }
      });
    } catch (err) {
      console.error('[MediaProtocol] Error:', err);
      return new Response('Protocol error', { status: 500 });
    }
  });

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
