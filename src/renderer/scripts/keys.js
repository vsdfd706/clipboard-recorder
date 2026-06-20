// src/renderer/scripts/keys.js
import { state } from './app.js';

export function initKeys() {
  document.addEventListener('keydown', (e) => {
    // Delete key: soft delete selected records
    if (e.key === 'Delete' && !e.ctrlKey && !e.shiftKey) {
      // Only if not editing text
      if (isEditingInput(e.target)) return;

      e.preventDefault();
      if (state.activeTab === 'records') {
        deleteSelectedRecords();
      } else if (state.activeTab === 'trash') {
        // In trash, plain Delete does nothing (safety)
      }
    }

    // Ctrl+Shift+Delete: permanent delete (only in trash view)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Delete') {
      e.preventDefault();
      // This is handled by the trash view directly
    }

    // Ctrl+N: switch to records tab
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      document.querySelector('.tab[data-tab="records"]').click();
    }

    // Ctrl+H: toggle window visibility
    if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
      e.preventDefault();
      // Send to main process — we'll add a simple IPC for this
      // For now, minimize the window via Electron's API
      window.postMessage({ type: 'minimize-window' }, '*');
    }
  });
}

function isEditingInput(el) {
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

async function deleteSelectedRecords() {
  const { getSelectedIds, refreshList } = await import('./list.js');
  const ids = getSelectedIds();
  if (ids.size === 0) return;

  for (const id of ids) {
    await window.clipboardAPI.deleteRecord(id);
  }

  refreshList();
  const { refreshStats } = await import('./app.js');
  refreshStats();

  // Clear detail panel
  document.getElementById('detail-content').style.display = 'none';
  document.getElementById('detail-placeholder').style.display = 'flex';
}
