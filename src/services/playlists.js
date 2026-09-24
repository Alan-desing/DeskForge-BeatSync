/**
 * Playlist Manager Service
 * Manages custom playlists, track ordering, drag & drop reordering, and localStorage persistence.
 */
const STORAGE_KEY = 'deskforge_user_playlists';

export class PlaylistManager {
  constructor() {
    this.playlists = [];
    this.activePlaylistId = null; // null = Default Loaded Queue
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.playlists = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not load custom playlists:', e);
      this.playlists = [];
    }

    if (!Array.isArray(this.playlists) || this.playlists.length === 0) {
      // Default initial custom playlist
      this.playlists = [
        {
          id: 'pl-default-1',
          name: 'Favoritos de Código',
          tracks: []
        }
      ];
      this.save();
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.playlists));
    } catch (e) {
      console.error('Could not save playlists:', e);
    }
  }

  getPlaylists() {
    return this.playlists;
  }

  getPlaylist(id) {
    return this.playlists.find((pl) => pl.id === id) || null;
  }

  createPlaylist(name) {
    const cleanName = name.trim() || 'Nueva Playlist';
    const newPl = {
      id: `pl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      tracks: []
    };
    this.playlists.push(newPl);
    this.save();
    return newPl;
  }

  renamePlaylist(id, newName) {
    const pl = this.getPlaylist(id);
    if (pl && newName.trim()) {
      pl.name = newName.trim();
      this.save();
    }
  }

  deletePlaylist(id) {
    this.playlists = this.playlists.filter((pl) => pl.id !== id);
    if (this.activePlaylistId === id) {
      this.activePlaylistId = null;
    }
    this.save();
  }

  addTrackToPlaylist(playlistId, track) {
    const pl = this.getPlaylist(playlistId);
    if (!pl) return false;

    // Check duplicate
    const exists = pl.tracks.some((t) => t.id === track.id || t.path === track.path);
    if (!exists) {
      pl.tracks.push(track);
      this.save();
      return true;
    }
    return false;
  }

  removeTrackFromPlaylist(playlistId, trackIndex) {
    const pl = this.getPlaylist(playlistId);
    if (!pl) return;

    if (trackIndex >= 0 && trackIndex < pl.tracks.length) {
      pl.tracks.splice(trackIndex, 1);
      this.save();
    }
  }

  reorderTrack(playlistId, fromIndex, toIndex) {
    const pl = this.getPlaylist(playlistId);
    if (!pl) return;

    if (
      fromIndex >= 0 &&
      fromIndex < pl.tracks.length &&
      toIndex >= 0 &&
      toIndex < pl.tracks.length
    ) {
      const [moved] = pl.tracks.splice(fromIndex, 1);
      pl.tracks.splice(toIndex, 0, moved);
      this.save();
    }
  }

  reorderQueue(queueArray, fromIndex, toIndex) {
    if (
      fromIndex >= 0 &&
      fromIndex < queueArray.length &&
      toIndex >= 0 &&
      toIndex < queueArray.length
    ) {
      const [moved] = queueArray.splice(fromIndex, 1);
      queueArray.splice(toIndex, 0, moved);
    }
  }
}
