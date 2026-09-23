import './styles/main.css';
import { PomodoroTimer } from './services/pomodoro.js';
import { MusicPlayer, DEMO_PLAYLIST } from './services/player.js';

console.log('[DeskForge] Workspace initialized.');

const STORAGE_KEY_CONTENT = 'deskforge_notepad_content';
const STORAGE_KEY_PATH = 'deskforge_notepad_filepath';

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

  // 6. E4: BeatSync Music Player Logic
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
  const queueListEl = document.getElementById('player-queue-list');

  const formatAudioTime = (sec) => {
    if (isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  const renderQueueList = (playlist, activeIndex) => {
    if (!queueListEl) return;
    queueListEl.innerHTML = '';
    playlist.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = `queue-item ${index === activeIndex ? 'active' : ''}`;
      div.innerHTML = `
        <span>${index + 1}. <strong>${item.title}</strong> — ${item.artist}</span>
        <span>${formatAudioTime(item.duration)}</span>
      `;
      div.addEventListener('click', () => {
        player.loadTrack(index, true);
      });
      queueListEl.appendChild(div);
    });
  };

  const player = new MusicPlayer({
    playlist: DEMO_PLAYLIST,
    onTrackChange: (track, index) => {
      if (playerTitle) playerTitle.textContent = track.title;
      if (playerArtist) playerArtist.textContent = track.artist;
      if (playerAlbum) playerAlbum.textContent = track.album;
      if (albumCover) {
        albumCover.style.background = track.coverGradient || 'var(--accent-gradient)';
      }
      renderQueueList(DEMO_PLAYLIST, index);
    },
    onPlayStateChange: (isPlaying) => {
      if (playIcon) playIcon.textContent = isPlaying ? '⏸️' : '▶️';
      if (albumCover) {
        if (isPlaying) {
          albumCover.classList.add('playing');
        } else {
          albumCover.classList.remove('playing');
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
          repeatBtn.textContent = '🔁';
          repeatBtn.title = 'Repetir: Desactivado';
        } else if (repeatMode === 'all') {
          repeatBtn.classList.add('active');
          repeatBtn.textContent = '🔁';
          repeatBtn.title = 'Repetir: Toda la lista';
        } else if (repeatMode === 'one') {
          repeatBtn.classList.add('active');
          repeatBtn.textContent = '🔂';
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
      if (muteBtn) {
        muteBtn.textContent = val === 0 ? '🔇' : '🔊';
      }
    });
  }

  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      const isMuted = player.toggleMute();
      muteBtn.textContent = isMuted ? '🔇' : '🔊';
    });
  }

  // Load initial track metadata
  player.loadTrack(0, false);
});
