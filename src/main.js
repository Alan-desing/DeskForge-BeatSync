import './styles/main.css';
import { PomodoroTimer } from './services/pomodoro.js';
import { MusicPlayer, DEMO_PLAYLIST } from './services/player.js';
import { AudioVisualizer } from './services/visualizer.js';
import { PlaylistManager } from './services/playlists.js';

console.log('[DeskForge] Workspace initialized.');

const SVG_PLAY = `<svg class="icon-md" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>`;
const SVG_PAUSE = `<svg class="icon-md" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;

const SVG_POMO_PLAY = `<svg class="icon-sm" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
const SVG_POMO_PAUSE = `<svg class="icon-sm" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;

const SVG_VOL_HIGH = `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
const SVG_VOL_MUTE = `<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v6a2 2 0 0 0 2 2h4l5 5V4L15 9H9z"/></svg>`;

const STORAGE_KEY_CONTENT = 'deskforge_notepad_content';
const STORAGE_KEY_PATH = 'deskforge_notepad_filepath';
const STORAGE_KEY_LOCAL_PLAYLIST = 'deskforge_local_playlist';
const STORAGE_KEY_FOLDER_NAME = 'deskforge_local_foldername';

let currentFilePath = null;
let isUnsaved = false;

window.addEventListener('DOMContentLoaded', () => {
  // 1. Connectivity Status
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');

  if (window.deskforgeAPI && typeof window.deskforgeAPI.ping === 'function') {
    if (statusDot) statusDot.style.backgroundColor = '#10b981';
    if (statusText) statusText.textContent = 'En línea';
  } else {
    if (statusDot) statusDot.style.backgroundColor = '#ef4444';
    if (statusText) statusText.textContent = 'IPC Desconectado';
  }

  // 2. Navigation Tab Switching (Notes / Pomodoro / Player)
  const navItems = document.querySelectorAll('.nav-item[data-target]');
  const viewSections = document.querySelectorAll('.view-section');
  const topbarViewTitle = document.getElementById('topbar-view-title');

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      if (item.classList.contains('disabled')) return;

      navItems.forEach((i) => i.classList.remove('active'));
      item.classList.add('active');

      const targetId = item.getAttribute('data-target');
      viewSections.forEach((sec) => {
        if (sec.id === targetId) {
          sec.classList.add('active');
        } else {
          sec.classList.remove('active');
        }
      });

      if (topbarViewTitle) {
        if (targetId === 'view-notes') topbarViewTitle.textContent = 'Bloc de Notas';
        if (targetId === 'view-pomodoro') topbarViewTitle.textContent = 'Temporizador Pomodoro';
        if (targetId === 'view-player') topbarViewTitle.textContent = 'BeatSync Reproductor';
      }
    });
  });

  // 3. Sidebar Actions (E1 Native APIs)
  const btnAbout = document.getElementById('btn-about');
  if (btnAbout) {
    btnAbout.addEventListener('click', async () => {
      if (window.deskforgeAPI && window.deskforgeAPI.showAbout) {
        await window.deskforgeAPI.showAbout();
      }
    });
  }

  const btnMinimizeTray = document.getElementById('btn-minimize-tray');
  if (btnMinimizeTray) {
    btnMinimizeTray.addEventListener('click', async () => {
      if (window.deskforgeAPI && window.deskforgeAPI.minimizeToTray) {
        await window.deskforgeAPI.minimizeToTray();
      }
    });
  }

  // 4. E2: Notepad Component Logic
  const editor = document.getElementById('note-editor');
  const filePathEl = document.getElementById('note-file-path');
  const saveStatusEl = document.getElementById('note-save-status');
  const wordCountEl = document.getElementById('note-word-count');
  const charCountEl = document.getElementById('note-char-count');
  const statusMsgEl = document.getElementById('note-status-msg');

  const btnNew = document.getElementById('btn-note-new');
  const btnOpen = document.getElementById('btn-note-open');
  const btnSave = document.getElementById('btn-note-save');
  const btnSaveAs = document.getElementById('btn-note-save-as');

  const updateStats = () => {
    if (!editor) return;
    const text = editor.value;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    if (charCountEl) charCountEl.textContent = `${chars} caracteres`;
    if (wordCountEl) wordCountEl.textContent = `${words} palabras`;
  };

  const updateHeader = () => {
    if (filePathEl) {
      if (currentFilePath) {
        const fileName = currentFilePath.split(/[\\/]/).pop();
        filePathEl.textContent = `${fileName}${isUnsaved ? ' *' : ''}`;
        filePathEl.title = currentFilePath;
      } else {
        filePathEl.textContent = `Nota Sin Título${isUnsaved ? ' *' : ''}`;
        filePathEl.title = 'Nota Sin Título';
      }
    }

    if (saveStatusEl) {
      if (isUnsaved) {
        saveStatusEl.textContent = 'Cambios sin guardar';
        saveStatusEl.className = 'badge-status unsaved';
      } else if (currentFilePath) {
        saveStatusEl.textContent = 'Guardado en disco';
        saveStatusEl.className = 'badge-status saved';
      } else {
        saveStatusEl.textContent = 'Guardado localmente';
        saveStatusEl.className = 'badge-status saved';
      }
    }
  };

  const autoSaveLocal = () => {
    if (!editor) return;
    localStorage.setItem(STORAGE_KEY_CONTENT, editor.value);
    if (currentFilePath) {
      localStorage.setItem(STORAGE_KEY_PATH, currentFilePath);
    } else {
      localStorage.removeItem(STORAGE_KEY_PATH);
    }
  };

  const loadLocalDraft = () => {
    const savedContent = localStorage.getItem(STORAGE_KEY_CONTENT);
    const savedPath = localStorage.getItem(STORAGE_KEY_PATH);
    if (savedContent !== null && editor) {
      editor.value = savedContent;
    }
    if (savedPath) {
      currentFilePath = savedPath;
    }
    updateStats();
    updateHeader();
  };

  if (editor) {
    editor.addEventListener('input', () => {
      isUnsaved = true;
      autoSaveLocal();
      updateStats();
      updateHeader();
      if (statusMsgEl) statusMsgEl.textContent = 'Editando...';
    });
  }

  if (btnNew) {
    btnNew.addEventListener('click', () => {
      if (editor) editor.value = '';
      currentFilePath = null;
      isUnsaved = false;
      autoSaveLocal();
      updateStats();
      updateHeader();
      if (statusMsgEl) statusMsgEl.textContent = 'Nueva nota creada';
    });
  }

  if (btnOpen) {
    btnOpen.addEventListener('click', async () => {
      if (!window.deskforgeAPI || !window.deskforgeAPI.openFile) return;
      try {
        const fileData = await window.deskforgeAPI.openFile();
        if (fileData) {
          currentFilePath = fileData.path;
          if (editor) editor.value = fileData.content;
          isUnsaved = false;
          autoSaveLocal();
          updateStats();
          updateHeader();
          if (statusMsgEl) statusMsgEl.textContent = `Archivo abierto: ${fileData.path}`;
        }
      } catch (err) {
        console.error('Error abriendo archivo:', err);
        if (statusMsgEl) statusMsgEl.textContent = 'Error al abrir el archivo';
      }
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      if (!window.deskforgeAPI || !window.deskforgeAPI.saveFile || !editor) return;
      try {
        const result = await window.deskforgeAPI.saveFile({
          filePath: currentFilePath,
          content: editor.value
        });
        if (result && result.path) {
          currentFilePath = result.path;
          isUnsaved = false;
          autoSaveLocal();
          updateHeader();
          if (statusMsgEl) statusMsgEl.textContent = `Nota guardada en: ${result.path}`;
        }
      } catch (err) {
        console.error('Error guardando nota:', err);
        if (statusMsgEl) statusMsgEl.textContent = 'Error al guardar la nota';
      }
    });
  }

  if (btnSaveAs) {
    btnSaveAs.addEventListener('click', async () => {
      if (!window.deskforgeAPI || !window.deskforgeAPI.saveFileAs || !editor) return;
      try {
        const filePath = await window.deskforgeAPI.saveFileAs({
          content: editor.value
        });
        if (filePath) {
          currentFilePath = filePath;
          isUnsaved = false;
          autoSaveLocal();
          updateHeader();
          if (statusMsgEl) statusMsgEl.textContent = `Nota guardada como: ${filePath}`;
        }
      } catch (err) {
        console.error('Error guardando nota como:', err);
        if (statusMsgEl) statusMsgEl.textContent = 'Error al guardar como';
      }
    });
  }

  loadLocalDraft();

  // 5. E3: Pomodoro Timer Logic
  const pomoDisplay = document.getElementById('pomo-display');
  const pomoPhaseLabel = document.getElementById('pomo-phase-label');
  const pomoCircle = document.getElementById('pomo-circle');
  const pomoToggleBtn = document.getElementById('btn-pomo-toggle');
  const pomoToggleIcon = document.getElementById('pomo-toggle-icon');
  const pomoToggleLabel = document.getElementById('pomo-toggle-label');
  const pomoResetBtn = document.getElementById('btn-pomo-reset');
  const pomoSkipBtn = document.getElementById('btn-pomo-skip');
  const pomoWorkBtn = document.getElementById('btn-mode-work');
  const pomoBreakBtn = document.getElementById('btn-mode-break');
  const pomoCompletedCount = document.getElementById('pomo-completed-count');

  const presetStdBtn = document.getElementById('preset-std');
  const presetTestBtn = document.getElementById('preset-test');

  const pomodoro = new PomodoroTimer({
    workDuration: 25 * 60,
    breakDuration: 5 * 60,
    onTick: ({ formattedTime }) => {
      if (pomoDisplay) pomoDisplay.textContent = formattedTime;
    },
    onStateChange: ({ isRunning, mode, completedCycles }) => {
      if (pomoToggleLabel) pomoToggleLabel.textContent = isRunning ? 'Pausar' : 'Iniciar';
      if (pomoToggleIcon) pomoToggleIcon.innerHTML = isRunning ? SVG_POMO_PAUSE : SVG_POMO_PLAY;

      if (pomoCircle) {
        if (mode === 'break') {
          pomoCircle.classList.add('break');
        } else {
          pomoCircle.classList.remove('break');
        }
      }

      if (pomoWorkBtn && pomoBreakBtn) {
        if (mode === 'work') {
          pomoWorkBtn.className = 'btn-mode active work';
          pomoBreakBtn.className = 'btn-mode break';
          if (pomoPhaseLabel) pomoPhaseLabel.textContent = 'Sesión de Trabajo';
        } else {
          pomoWorkBtn.className = 'btn-mode work';
          pomoBreakBtn.className = 'btn-mode active break';
          if (pomoPhaseLabel) pomoPhaseLabel.textContent = 'Tiempo de Descanso';
        }
      }

      if (pomoCompletedCount) pomoCompletedCount.textContent = completedCycles;
    },
    onFinish: async (completedMode) => {
      const isWorkFinished = completedMode === 'work';
      const notificationTitle = isWorkFinished ? '¡Pomodoro Finalizado!' : '¡Descanso Finalizado!';
      const notificationBody = isWorkFinished
        ? 'Excelente trabajo. Es hora de tomar un descanso de 5 minutos.'
        : '¡Descanso terminado! Listo para empezar una nueva sesión de trabajo.';

      if (window.deskforgeAPI && window.deskforgeAPI.notify) {
        await window.deskforgeAPI.notify({
          title: notificationTitle,
          body: notificationBody
        });
      }
    }
  });

  if (pomoToggleBtn) {
    pomoToggleBtn.addEventListener('click', () => pomodoro.toggle());
  }

  if (pomoResetBtn) {
    pomoResetBtn.addEventListener('click', () => pomodoro.reset());
  }

  if (pomoSkipBtn) {
    pomoSkipBtn.addEventListener('click', () => {
      const nextMode = pomodoro.mode === 'work' ? 'break' : 'work';
      pomodoro.switchMode(nextMode);
    });
  }

  if (pomoWorkBtn) {
    pomoWorkBtn.addEventListener('click', () => pomodoro.switchMode('work'));
  }

  if (pomoBreakBtn) {
    pomoBreakBtn.addEventListener('click', () => pomodoro.switchMode('break'));
  }

  if (presetStdBtn) {
    presetStdBtn.addEventListener('click', () => {
      presetStdBtn.classList.add('active');
      if (presetTestBtn) presetTestBtn.classList.remove('active');
      pomodoro.setDurations(25 * 60, 5 * 60);
    });
  }

  if (presetTestBtn) {
    presetTestBtn.addEventListener('click', () => {
      presetTestBtn.classList.add('active');
      if (presetStdBtn) presetStdBtn.classList.remove('active');
      pomodoro.setDurations(10, 5);
    });
  }

  // 6. E6: Audio Visualizer Logic
  const visCanvas = document.getElementById('vis-canvas');
  let visualizer = null;
  if (visCanvas) {
    visualizer = new AudioVisualizer(visCanvas);
  }

  const btnVisBars = document.getElementById('btn-vis-bars');
  const btnVisWaveform = document.getElementById('btn-vis-waveform');
  const btnVisRadial = document.getElementById('btn-vis-radial');

  const setVisMode = (mode) => {
    if (visualizer) visualizer.setMode(mode);
    if (btnVisBars) btnVisBars.className = `btn-vis-mode ${mode === 'bars' ? 'active' : ''}`;
    if (btnVisWaveform) btnVisWaveform.className = `btn-vis-mode ${mode === 'waveform' ? 'active' : ''}`;
    if (btnVisRadial) btnVisRadial.className = `btn-vis-mode ${mode === 'radial' ? 'active' : ''}`;
  };

  if (btnVisBars) btnVisBars.addEventListener('click', () => setVisMode('bars'));
  if (btnVisWaveform) btnVisWaveform.addEventListener('click', () => setVisMode('waveform'));
  if (btnVisRadial) btnVisRadial.addEventListener('click', () => setVisMode('radial'));

  // 7. E4, E5, E7: BeatSync Music Player, Playlist Manager & Drag & Drop
  const playerTitle = document.getElementById('player-title');
  const playerArtist = document.getElementById('player-artist');
  const playerAlbum = document.getElementById('player-album');
  const albumCover = document.getElementById('album-cover');
  const playBtn = document.getElementById('btn-player-play');
  const playIcon = document.getElementById('play-icon');
  const prevBtn = document.getElementById('btn-player-prev');
  const nextBtn = document.getElementById('btn-player-next');
  const shuffleBtn = document.getElementById('btn-player-shuffle');
  const repeatBtn = document.getElementById('btn-player-repeat');
  const seekbar = document.getElementById('player-seekbar');
  const currentTimeEl = document.getElementById('player-current-time');
  const totalTimeEl = document.getElementById('player-total-time');
  const volumeSlider = document.getElementById('player-volume');
  const muteBtn = document.getElementById('btn-player-mute');
  const volumeIcon = document.getElementById('volume-icon');
  const queueListEl = document.getElementById('player-queue-list');
  const btnSelectFolder = document.getElementById('btn-select-folder');
  const folderStatusLabel = document.getElementById('folder-status-label');

  // E7 UI elements
  const playlistTabsContainer = document.getElementById('playlist-tabs-container');
  const inputNewPlaylist = document.getElementById('input-new-playlist');
  const btnCreatePlaylist = document.getElementById('btn-create-playlist');
  const btnDeletePlaylist = document.getElementById('btn-delete-playlist');
  const queueHeaderTitle = document.getElementById('queue-header-title');
  const queueDropzone = document.getElementById('queue-dropzone');

  const playlistManager = new PlaylistManager();
  let mainQueueTracks = DEMO_PLAYLIST;
  let activePlaylist = mainQueueTracks;
  let draggedItemIndex = null;

  const formatAudioTime = (sec) => {
    if (isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  const renderPlaylistTabs = () => {
    if (!playlistTabsContainer) return;
    playlistTabsContainer.innerHTML = '';

    // 1. Tab "Cola Principal"
    const mainTab = document.createElement('button');
    mainTab.className = `btn-playlist-tab ${playlistManager.activePlaylistId === null ? 'active' : ''}`;
    mainTab.textContent = 'Cola Principal';
    mainTab.addEventListener('click', () => {
      playlistManager.activePlaylistId = null;
      activePlaylist = mainQueueTracks;
      player.setPlaylist(activePlaylist, false);
      if (queueHeaderTitle) queueHeaderTitle.textContent = 'Cola de reproducción (Principal)';
      if (btnDeletePlaylist) btnDeletePlaylist.style.display = 'none';
      renderPlaylistTabs();
      renderQueueList(activePlaylist, player.currentIndex);
    });
    playlistTabsContainer.appendChild(mainTab);

    // 2. Custom Playlists tabs
    const playlists = playlistManager.getPlaylists();
    playlists.forEach((pl) => {
      const tab = document.createElement('button');
      tab.className = `btn-playlist-tab ${playlistManager.activePlaylistId === pl.id ? 'active' : ''}`;
      tab.textContent = `📋 ${pl.name}`;
      tab.addEventListener('click', () => {
        playlistManager.activePlaylistId = pl.id;
        activePlaylist = pl.tracks;
        player.setPlaylist(activePlaylist, false);
        if (queueHeaderTitle) queueHeaderTitle.textContent = `Lista: ${pl.name}`;
        if (btnDeletePlaylist) btnDeletePlaylist.style.display = 'inline-flex';
        renderPlaylistTabs();
        renderQueueList(activePlaylist, player.currentIndex);
      });
      playlistTabsContainer.appendChild(tab);
    });
  };

  const renderQueueList = (playlist, activeIndex) => {
    if (!queueListEl) return;
    queueListEl.innerHTML = '';

    if (!playlist || playlist.length === 0) {
      queueListEl.innerHTML = `<div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.825rem;">La lista está vacía. Arrastra archivos de audio MP3/OGG/WAV aquí o carga una carpeta local.</div>`;
      return;
    }

    playlist.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = `queue-item ${index === activeIndex ? 'active' : ''}`;
      div.draggable = true;
      div.dataset.index = index;

      div.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.4rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <svg class="icon-xs drag-handle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
          <span>${index + 1}. <strong>${item.title}</strong> ${item.format ? `<span style="font-size:0.675rem; padding:0.1rem 0.35rem; background:#334155; border-radius:4px; margin-left:0.3rem; color:#34d399;">${item.format}</span>` : ''} — <span style="color: var(--text-muted);">${item.artist}</span></span>
        </div>
        <div class="item-actions">
          <span style="font-size: 0.775rem; color: var(--text-muted); font-family: var(--font-mono);">${item.duration > 0 ? formatAudioTime(item.duration) : 'Local'}</span>
          <button class="btn-item-action delete" title="Eliminar de la lista">
            <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;

      // Track click (play track)
      div.addEventListener('click', (e) => {
        if (e.target.closest('.btn-item-action') || e.target.closest('.drag-handle')) return;
        player.loadTrack(index, true);
      });

      // Delete track button
      const btnDeleteTrack = div.querySelector('.btn-item-action.delete');
      if (btnDeleteTrack) {
        btnDeleteTrack.addEventListener('click', (e) => {
          e.stopPropagation();
          if (playlistManager.activePlaylistId === null) {
            mainQueueTracks.splice(index, 1);
            localStorage.setItem(STORAGE_KEY_LOCAL_PLAYLIST, JSON.stringify(mainQueueTracks));
            activePlaylist = mainQueueTracks;
          } else {
            playlistManager.removeTrackFromPlaylist(playlistManager.activePlaylistId, index);
            activePlaylist = playlistManager.getPlaylist(playlistManager.activePlaylistId).tracks;
          }
          player.setPlaylist(activePlaylist, false);
          renderQueueList(activePlaylist, player.currentIndex);
        });
      }

      // Drag & Drop reordering handlers
      div.addEventListener('dragstart', (e) => {
        draggedItemIndex = index;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index);
        div.style.opacity = '0.5';
      });

      div.addEventListener('dragend', () => {
        div.style.opacity = '1';
        draggedItemIndex = null;
        document.querySelectorAll('.queue-item').forEach(el => el.classList.remove('drag-over'));
      });

      div.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        div.classList.add('drag-over');
      });

      div.addEventListener('dragleave', () => {
        div.classList.remove('drag-over');
      });

      div.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        div.classList.remove('drag-over');

        const fromIdx = draggedItemIndex;
        const toIdx = index;

        if (fromIdx !== null && fromIdx !== toIdx) {
          if (playlistManager.activePlaylistId === null) {
            playlistManager.reorderQueue(mainQueueTracks, fromIdx, toIdx);
            localStorage.setItem(STORAGE_KEY_LOCAL_PLAYLIST, JSON.stringify(mainQueueTracks));
            activePlaylist = mainQueueTracks;
          } else {
            playlistManager.reorderTrack(playlistManager.activePlaylistId, fromIdx, toIdx);
            const pl = playlistManager.getPlaylist(playlistManager.activePlaylistId);
            if (pl) activePlaylist = pl.tracks;
          }
          player.setPlaylist(activePlaylist, false);
          renderQueueList(activePlaylist, player.currentIndex);
        }
      });

      queueListEl.appendChild(div);
    });
  };

  const player = new MusicPlayer({
    playlist: activePlaylist,
    onTrackChange: (track, index) => {
      if (playerTitle) playerTitle.textContent = track.title;
      if (playerArtist) playerArtist.textContent = track.artist;
      if (playerAlbum) playerAlbum.textContent = track.album;
      if (albumCover) {
        albumCover.style.background = track.coverGradient || 'var(--accent-gradient)';
      }
      renderQueueList(activePlaylist, index);
    },
    onPlayStateChange: (isPlaying) => {
      if (playIcon) playIcon.innerHTML = isPlaying ? SVG_PAUSE : SVG_PLAY;
      if (albumCover) {
        if (isPlaying) {
          albumCover.classList.add('playing');
        } else {
          albumCover.classList.remove('playing');
        }
      }

      // E6: Start/Stop Visualizer
      if (visualizer) {
        if (isPlaying) {
          visualizer.start(player.sound);
        } else {
          visualizer.stop();
        }
      }
    },
    onProgress: (currentSec, totalSec) => {
      if (currentTimeEl) currentTimeEl.textContent = formatAudioTime(currentSec);
      if (totalTimeEl) totalTimeEl.textContent = formatAudioTime(totalSec);
      if (seekbar && totalSec > 0) {
        seekbar.value = Math.round((currentSec / totalSec) * 100);
      }
    },
    onModeChange: ({ isShuffle, repeatMode }) => {
      if (shuffleBtn) {
        if (isShuffle) {
          shuffleBtn.classList.add('active');
        } else {
          shuffleBtn.classList.remove('active');
        }
      }

      if (repeatBtn) {
        if (repeatMode === 'off') {
          repeatBtn.classList.remove('active');
          repeatBtn.title = 'Repetir: Desactivado';
        } else if (repeatMode === 'all') {
          repeatBtn.classList.add('active');
          repeatBtn.title = 'Repetir: Toda la lista';
        } else if (repeatMode === 'one') {
          repeatBtn.classList.add('active');
          repeatBtn.title = 'Repetir: Canción actual';
        }
      }
    }
  });

  // Controls Event Listeners
  if (playBtn) {
    playBtn.addEventListener('click', () => player.togglePlay());
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => player.previous());
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => player.next());
  }

  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => player.toggleShuffle());
  }

  if (repeatBtn) {
    repeatBtn.addEventListener('click', () => player.toggleRepeat());
  }

  if (seekbar) {
    seekbar.addEventListener('input', (e) => {
      const pct = parseFloat(e.target.value);
      const track = player.getCurrentTrack();
      const totalSec = player.sound ? player.sound.duration() : (track ? track.duration : 0);
      if (totalSec > 0) {
        const targetSec = (pct / 100) * totalSec;
        player.seek(targetSec);
      }
    });
  }

  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) / 100;
      player.setVolume(val);
      if (volumeIcon) {
        volumeIcon.innerHTML = val === 0 ? SVG_VOL_MUTE : SVG_VOL_HIGH;
      }
    });
  }

  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      const isMuted = player.toggleMute();
      if (volumeIcon) {
        volumeIcon.innerHTML = isMuted ? SVG_VOL_MUTE : SVG_VOL_HIGH;
      }
    });
  }

  // Create Playlist listener
  if (btnCreatePlaylist && inputNewPlaylist) {
    const handleCreate = () => {
      const name = inputNewPlaylist.value.trim();
      if (name) {
        const newPl = playlistManager.createPlaylist(name);
        inputNewPlaylist.value = '';
        playlistManager.activePlaylistId = newPl.id;
        activePlaylist = newPl.tracks;
        player.setPlaylist(activePlaylist, false);
        if (queueHeaderTitle) queueHeaderTitle.textContent = `Lista: ${newPl.name}`;
        if (btnDeletePlaylist) btnDeletePlaylist.style.display = 'inline-flex';
        renderPlaylistTabs();
        renderQueueList(activePlaylist, player.currentIndex);
      }
    };

    btnCreatePlaylist.addEventListener('click', handleCreate);
    inputNewPlaylist.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleCreate();
    });
  }

  // Delete Playlist listener
  if (btnDeletePlaylist) {
    btnDeletePlaylist.addEventListener('click', () => {
      if (playlistManager.activePlaylistId) {
        const pl = playlistManager.getPlaylist(playlistManager.activePlaylistId);
        if (pl && confirm(`¿Estás seguro de eliminar la lista "${pl.name}"?`)) {
          playlistManager.deletePlaylist(playlistManager.activePlaylistId);
          playlistManager.activePlaylistId = null;
          activePlaylist = mainQueueTracks;
          player.setPlaylist(activePlaylist, false);
          if (queueHeaderTitle) queueHeaderTitle.textContent = 'Cola de reproducción (Principal)';
          if (btnDeletePlaylist) btnDeletePlaylist.style.display = 'none';
          renderPlaylistTabs();
          renderQueueList(activePlaylist, player.currentIndex);
        }
      }
    });
  }

  // External audio file drag & drop into app window / queue dropzone
  const handleFileDrop = (files) => {
    const audioExts = ['mp3', 'ogg', 'wav'];
    const addedTracks = [];

    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop().toLowerCase();
      if (audioExts.includes(ext)) {
        const filePath = file.path ? file.path : file.name;
        const mediaUrl = file.path ? `media:///${file.path.replace(/\\/g, '/')}` : URL.createObjectURL(file);
        addedTracks.push({
          id: `drag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: 'Archivo Importado',
          album: 'Drag & Drop',
          url: mediaUrl,
          path: filePath,
          format: ext.toUpperCase(),
          duration: 0
        });
      }
    });

    if (addedTracks.length > 0) {
      if (playlistManager.activePlaylistId === null) {
        mainQueueTracks.push(...addedTracks);
        localStorage.setItem(STORAGE_KEY_LOCAL_PLAYLIST, JSON.stringify(mainQueueTracks));
        activePlaylist = mainQueueTracks;
      } else {
        addedTracks.forEach((t) => playlistManager.addTrackToPlaylist(playlistManager.activePlaylistId, t));
        const pl = playlistManager.getPlaylist(playlistManager.activePlaylistId);
        if (pl) activePlaylist = pl.tracks;
      }

      player.setPlaylist(activePlaylist, false);
      renderQueueList(activePlaylist, player.currentIndex);
      if (folderStatusLabel) {
        folderStatusLabel.textContent = `✨ ${addedTracks.length} canción(es) agregada(s) por arrastre`;
      }
    }
  };

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    window.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  if (queueDropzone) {
    queueDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      queueDropzone.style.borderColor = 'var(--accent-light)';
    });

    queueDropzone.addEventListener('dragleave', () => {
      queueDropzone.style.borderColor = 'var(--border-color)';
    });

    queueDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      queueDropzone.style.borderColor = 'var(--border-color)';
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        if (draggedItemIndex === null) {
          handleFileDrop(e.dataTransfer.files);
        }
      }
    });
  }

  // E5: Select Local Music Folder Button
  if (btnSelectFolder) {
    btnSelectFolder.addEventListener('click', async () => {
      if (!window.deskforgeAPI || !window.deskforgeAPI.selectMusicFolder) return;
      try {
        const result = await window.deskforgeAPI.selectMusicFolder();
        if (result && result.tracks && result.tracks.length > 0) {
          mainQueueTracks = result.tracks;
          playlistManager.activePlaylistId = null;
          activePlaylist = mainQueueTracks;
          player.setPlaylist(activePlaylist, true);

          if (folderStatusLabel) {
            folderStatusLabel.textContent = `📁 ${result.folderName} (${result.tracks.length} canciones encontradas)`;
          }

          localStorage.setItem(STORAGE_KEY_LOCAL_PLAYLIST, JSON.stringify(result.tracks));
          localStorage.setItem(STORAGE_KEY_FOLDER_NAME, result.folderName);
          renderPlaylistTabs();
          renderQueueList(activePlaylist, player.currentIndex);
        } else if (result && result.tracks && result.tracks.length === 0) {
          if (folderStatusLabel) {
            folderStatusLabel.textContent = `⚠️ No se encontraron archivos MP3, OGG o WAV en la carpeta.`;
          }
        }
      } catch (err) {
        console.error('Error seleccionando carpeta de música:', err);
      }
    });
  }

  // Restore saved local playlist if present
  const restoreSavedPlaylist = () => {
    try {
      const savedTracksStr = localStorage.getItem(STORAGE_KEY_LOCAL_PLAYLIST);
      const savedFolderName = localStorage.getItem(STORAGE_KEY_FOLDER_NAME);

      if (savedTracksStr) {
        const savedTracks = JSON.parse(savedTracksStr);
        if (Array.isArray(savedTracks) && savedTracks.length > 0) {
          mainQueueTracks = savedTracks;
          activePlaylist = mainQueueTracks;
          player.setPlaylist(activePlaylist, false);
          if (folderStatusLabel && savedFolderName) {
            folderStatusLabel.textContent = `📁 ${savedFolderName} (${savedTracks.length} canciones)`;
          }
          renderPlaylistTabs();
          renderQueueList(activePlaylist, player.currentIndex);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not restore saved playlist:', e);
    }

    // Default load demo track 0 without autoplay
    mainQueueTracks = DEMO_PLAYLIST;
    activePlaylist = mainQueueTracks;
    player.setPlaylist(activePlaylist, false);
    renderPlaylistTabs();
    renderQueueList(activePlaylist, player.currentIndex);
  };

  restoreSavedPlaylist();
});
