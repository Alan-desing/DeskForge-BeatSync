const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script exposing a safe, controlled API bridge to renderer context.
 * Strictly maintains contextIsolation: true and nodeIntegration: false.
 */
contextBridge.exposeInMainWorld('deskforgeAPI', {
  ping: () => 'pong',
  showAbout: () => ipcRenderer.invoke('app:showAbout'),
  minimizeToTray: () => ipcRenderer.invoke('app:minimizeToTray'),

  // E2: Bloc de Notas (Notepad) APIs
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (data) => ipcRenderer.invoke('file:save', data),
  saveFileAs: (data) => ipcRenderer.invoke('file:saveAs', data),

  // E3: Pomodoro & Native Notifications
  notify: (data) => ipcRenderer.invoke('notify', data)
});
