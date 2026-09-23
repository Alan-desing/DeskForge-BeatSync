import './styles/main.css';

console.log('[DeskForge] E1 Renderer initialized.');

window.addEventListener('DOMContentLoaded', () => {
  // Check IPC connection status
  const pingStatusEl = document.getElementById('ping-status');
  if (pingStatusEl) {
    if (window.deskforgeAPI && typeof window.deskforgeAPI.ping === 'function') {
      const response = window.deskforgeAPI.ping();
      pingStatusEl.textContent = `IPC seguro: ${response.toUpperCase()}`;
      pingStatusEl.classList.add('active');
    } else {
      pingStatusEl.textContent = 'IPC deshabilitado';
      pingStatusEl.classList.add('error');
    }
  }

  // Live Window Dimensions listener
  const dimensionsEl = document.getElementById('dimensions');
  const updateDimensions = () => {
    if (dimensionsEl) {
      dimensionsEl.textContent = `Dimensiones actuales: ${window.innerWidth} x ${window.innerHeight} px`;
    }
  };
  updateDimensions();
  window.addEventListener('resize', updateDimensions);

  // E1 Action Buttons
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
});
