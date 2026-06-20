// src/renderer/scripts/trash.js

export function initTrash() {
  // Empty trash button
  document.getElementById('btn-empty-trash').addEventListener('click', async () => {
    const confirmed = confirm('确定要清空回收站吗？此操作不可撤销。');
    if (!confirmed) return;

    await window.clipboardAPI.emptyTrash();
    await renderTrash();
    const { refreshStats } = await import('./app.js');
    refreshStats();
  });
}

export async function initTrashView() {
  await renderTrash();
}

async function renderTrash() {
  const trashItems = await window.clipboardAPI.getTrashRecords();
  const container = document.getElementById('trash-list');

  // Remove previous event listener to prevent leaks on re-render
  container.replaceWith(container.cloneNode(true));
  const freshContainer = document.getElementById('trash-list');

  if (trashItems.length === 0) {
    freshContainer.innerHTML = `
      <div style="padding:24px;text-align:center;color:var(--text-muted)">
        <p>回收站为空</p>
      </div>
    `;
    return;
  }

  freshContainer.innerHTML = trashItems.map(item => {
    const preview = getTrashPreview(item);
    const deletedDate = new Date(item.deleted_at).toLocaleString();
    const originalDate = new Date(item.original_created_at).toLocaleString();

    return `
      <div class="trash-item" data-id="${item.id}">
        <div class="trash-info">
          <div class="trash-preview">${escapeHtml(preview)}</div>
          <div class="trash-meta">
            <span>Type: ${item.type}</span>
            <span>Created: ${originalDate}</span>
            <span>Deleted: ${deletedDate}</span>
          </div>
        </div>
        <div class="trash-actions">
          <button class="btn btn-sm btn-restore" data-id="${item.id}">↩ Restore</button>
          <button class="btn btn-sm btn-danger btn-delete-forever" data-id="${item.id}">✕ Delete Forever</button>
        </div>
      </div>
    `;
  }).join('');

  // Event delegation for restore/permanent-delete buttons
  freshContainer.addEventListener('click', async (e) => {
    const restoreBtn = e.target.closest('.btn-restore');
    const deleteBtn = e.target.closest('.btn-delete-forever');

    if (restoreBtn) {
      const id = restoreBtn.dataset.id;
      await window.clipboardAPI.restoreFromTrash(id);
      await renderTrash();
      const { refreshStats } = await import('./app.js');
      refreshStats();
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      const confirmed = confirm('确定要永久删除这条记录吗？此操作不可撤销。');
      if (!confirmed) return;
      await window.clipboardAPI.permanentDelete(id);
      await renderTrash();
      const { refreshStats } = await import('./app.js');
      refreshStats();
    }
  });
}

function getTrashPreview(item) {
  if (item.type === 'text') {
    return (item.content || '').replace(/\n/g, ' ').substring(0, 100);
  }
  return `[${item.type}] ${item.file_name || ''}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
