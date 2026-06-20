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

    // Ctrl+Shift+Delete: empty trash with confirmation (only in trash view)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Delete') {
      if (isEditingInput(e.target)) return;
      e.preventDefault();
      if (state.activeTab === 'trash') {
        // In trash tab, permanently delete the most recently focused trash item
        // (the trash view's button click handler manages the confirm dialog)
        const confirmed = confirm('Permanently delete all selected items? This cannot be undone.');
        if (!confirmed) return;
        window.clipboardAPI.emptyTrash().then(() => {
          document.querySelector('.tab[data-tab="trash"]').click();
        });
      }
    }

    // Ctrl+N: switch to records tab
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      document.querySelector('.tab[data-tab="records"]').click();
    }

    // Ctrl+H: hide window to tray
    if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
      e.preventDefault();
      window.clipboardAPI.hideWindow();
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
