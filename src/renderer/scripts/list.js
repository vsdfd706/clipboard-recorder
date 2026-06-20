// src/renderer/scripts/list.js
import { state } from './app.js';
import { showDetail } from './detail.js';
import { getFilters } from './search.js';

let selectedIds = new Set();

export function initList() {
  const listEl = document.getElementById('record-list');
  listEl.addEventListener('click', (e) => {
    const item = e.target.closest('.record-item');
    if (!item) return;

    const id = item.dataset.id;

    if (e.ctrlKey || e.metaKey) {
      // Multi-select toggle
      if (selectedIds.has(id)) {
        selectedIds.delete(id);
      } else {
        selectedIds.add(id);
      }
    } else {
      // Single select
      selectedIds.clear();
      selectedIds.add(id);
    }

    updateSelection();
    if (selectedIds.size === 1) {
      showDetail(id);
      state.selectedRecordId = id;
    }
  });

  // Right-click context menu
  listEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const item = e.target.closest('.record-item');
    if (!item) return;

    const id = item.dataset.id;
    if (!selectedIds.has(id)) {
      selectedIds.clear();
      selectedIds.add(id);
      updateSelection();
    }

    showContextMenu(e.clientX, e.clientY);
  });
}

function showContextMenu(x, y) {
  // Remove existing
  const existing = document.querySelector('.context-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:1000;`;
  menu.innerHTML = `
    <div class="context-menu-item" data-action="copy">📋 复制内容</div>
    <div class="context-menu-item" data-action="delete">🗑 删除</div>
  `;

  // Add styles dynamically if not present
  if (!document.getElementById('ctx-menu-style')) {
    const style = document.createElement('style');
    style.id = 'ctx-menu-style';
    style.textContent = `
      .context-menu {
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 4px;
        min-width: 160px;
      }
      .context-menu-item {
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 4px;
        font-size: 12px;
      }
      .context-menu-item:hover { background: var(--bg-hover); }
    `;
    document.head.appendChild(style);
  }

  menu.addEventListener('click', async (e) => {
    const action = e.target.dataset.action;
    menu.remove();

    if (action === 'copy') {
      for (const id of selectedIds) {
        await window.clipboardAPI.copyToClipboard(id);
        break; // Copy only the first for now
      }
    } else if (action === 'delete') {
      for (const id of selectedIds) {
        await window.clipboardAPI.deleteRecord(id);
      }
      selectedIds.clear();
      refreshList();
      const { refreshStats } = await import('./app.js');
      refreshStats();
      // Clear detail panel
      document.getElementById('detail-content').style.display = 'none';
      document.getElementById('detail-placeholder').style.display = 'flex';
    }
  });

  document.body.appendChild(menu);

  // Click elsewhere to close
  const closeHandler = () => {
    menu.remove();
    document.removeEventListener('click', closeHandler);
  };
  setTimeout(() => document.addEventListener('click', closeHandler, { once: true }), 0);
  // Also close on Escape key
  const escapeHandler = (ev) => {
    if (ev.key === 'Escape') {
      menu.remove();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

function updateSelection() {
  document.querySelectorAll('.record-item').forEach(el => {
    el.classList.toggle('active', selectedIds.has(el.dataset.id));
  });
}

function getPreview(record) {
  if (record.type === 'text') {
    return (record.content || '').replace(/\n/g, ' ').substring(0, 80);
  }
  if (record.type === 'image') {
    return `[图片] ${record.file_name || ''}`;
  }
  if (record.type === 'file') {
    return `[文件] ${record.file_name || ''}`;
  }
  return '';
}

function getTypeIcon(type) {
  if (type === 'text') return '📝';
  if (type === 'image') return '🖼️';
  if (type === 'file') return '📎';
  return '📄';
}

function formatTime(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  return `${d.getMonth() + 1}/${d.getDate()} ${time}`;
}

async function renderList() {
  const filters = getFilters();
  const records = await window.clipboardAPI.getRecords(filters);
  const listEl = document.getElementById('record-list');

  listEl.innerHTML = records.map(r => `
    <div class="record-item ${selectedIds.has(r.id) ? 'active' : ''}" data-id="${r.id}">
      <div class="item-preview">${escapeHtml(getPreview(r))}</div>
      <div class="item-meta">
        <span class="type-icon">${getTypeIcon(r.type)}</span>
        <span>${formatTime(r.created_at)}</span>
        ${r.note ? `<span>📌</span>` : ''}
      </div>
    </div>
  `).join('');

  if (records.length === 0) {
    listEl.innerHTML = `
      <div style="padding:24px;text-align:center;color:var(--text-muted)">
        <p>暂无记录</p>
      </div>
    `;
  }

  // Persist selection visibility
  updateSelection();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function refreshList() {
  renderList();
}

export function getSelectedIds() {
  return new Set(selectedIds);
}
