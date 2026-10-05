const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script exposing a safe, controlled API bridge to renderer context.
 * Strictly maintains contextIsolation: true and nodeIntegration: false.
 */
contextBridge.exposeInMainWorld('deskforgeAPI', {
  ping: () => 'pong',
  showAbout: () => ipcRenderer.invoke('app:showAbout'),
  minimizeToTray: () => ipcRenderer.invoke('app:minimizeToTray'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  onTogglePlayerShortcut: (callback) => {
    ipcRenderer.on('shortcut:toggle-player', () => callback());
  },
  onTogglePomodoroShortcut: (callback) => {
    ipcRenderer.on('shortcut:toggle-pomodoro', () => callback());
  },

  // E2: Bloc de Notas (Notepad) APIs
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (data) => ipcRenderer.invoke('file:save', data),
  saveFileAs: (data) => ipcRenderer.invoke('file:saveAs', data),

  // E3: Pomodoro & Native Notifications
  notify: (data) => ipcRenderer.invoke('notify', data),

  // E5: Local Music Folder Loading
  selectMusicFolder: () => ipcRenderer.invoke('music:selectFolder'),

  // E8: Spotify OAuth callback
  onSpotifyAuthCode: (callback) => {
    ipcRenderer.on('spotify:auth-code', (_, code) => callback(code));
  },

  onSpotifyAuthError: (callback) => {
    ipcRenderer.on('spotify:auth-error', (_, error) => callback(error));
  }
});