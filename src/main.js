import './styles/main.css';

console.log('[DeskForge] Workspace initialized.');

const STORAGE_KEY_CONTENT = 'deskforge_notepad_content';
const STORAGE_KEY_PATH = 'deskforge_notepad_filepath';

let currentFilePath = null;
let isUnsaved = false;

window.addEventListener('DOMContentLoaded', () => {
  // IPC Connectivity Dot Indicator
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  
  if (window.deskforgeAPI && typeof window.deskforgeAPI.ping === 'function') {
    if (statusDot) statusDot.style.backgroundColor = '#10b981';
    if (statusText) statusText.textContent = 'En línea';
  } else {
    if (statusDot) statusDot.style.backgroundColor = '#ef4444';
    if (statusText) statusText.textContent = 'IPC Desconectado';
  }

  // Sidebar Actions (E1 APIs)
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

  // Notepad Logic (E2)
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
});
