import './styles/main.css';

console.log('[DeskForge] Renderer initialized successfully.');

window.addEventListener('DOMContentLoaded', () => {
  const pingStatusEl = document.getElementById('ping-status');
  if (pingStatusEl) {
    if (window.deskforgeAPI && typeof window.deskforgeAPI.ping === 'function') {
      const response = window.deskforgeAPI.ping();
      pingStatusEl.textContent = `IPC seguro activo (Ping: ${response})`;
      pingStatusEl.classList.add('active');
    } else {
      pingStatusEl.textContent = 'IPC bridge no detectado.';
      pingStatusEl.classList.add('error');
    }
  }
});
