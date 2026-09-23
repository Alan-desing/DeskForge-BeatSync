const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script exposing a safe, controlled API bridge to renderer context.
 * Strictly maintains contextIsolation: true and nodeIntegration: false.
 */
contextBridge.exposeInMainWorld('deskforgeAPI', {
  ping: () => 'pong',
  showAbout: () => ipcRenderer.invoke('app:showAbout'),
  minimizeToTray: () => ipcRenderer.invoke('app:minimizeToTray')
});
