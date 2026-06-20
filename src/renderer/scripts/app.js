// src/renderer/scripts/app.js
import { initList, refreshList } from './list.js';
import { initDetail } from './detail.js';
import { initSearch } from './search.js';
import { initTrash, initTrashView } from './trash.js';
import { initSettings, loadSettings } from './settings.js';
import { initKeys } from './keys.js';

// ── Global State ──
export const state = {
  activeTab: 'records',        // 'records' | 'trash' | 'settings'
  selectedRecordId: null,
  monitorRunning: true,
};

// ── Tab Switching ──
function switchTab(tabName) {
  state.activeTab = tabName;

  // Update tab buttons
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });

  // Show/hide views
  document.getElementById('view-records-detail').classList.toggle('active', tabName === 'records');
  document.getElementById('view-trash').classList.toggle('active', tabName === 'trash');
  document.getElementById('view-settings').classList.toggle('active', tabName === 'settings');

  // Show/hide left panel (only for records tab)
  document.getElementById('left-panel').style.display = tabName === 'records' ? 'flex' : 'none';

  // Load data for tab
  if (tabName === 'trash') initTrashView();
  if (tabName === 'settings') loadSettings();

  // Reset selection when switching away from records
  if (tabName !== 'records') {
    state.selectedRecordId = null;
  }
}

// ── Stats Badge Updates ──
async function refreshStats() {
  const stats = await window.clipboardAPI.getStats();
  document.getElementById('badge-records').textContent = stats.records;
  document.getElementById('badge-trash').textContent = stats.trash;
}

// ── Monitor Status ──
function updateMonitorBadge(isRunning) {
  state.monitorRunning = isRunning;
  const badge = document.getElementById('monitor-badge');
  badge.textContent = isRunning ? '● 监控中' : '○ 已暂停';
  badge.className = `badge ${isRunning ? 'badge-active' : 'badge-paused'}`;
}

// ── Initialize ──
async function init() {
  // Tab click handlers
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Monitor status
  const isRunning = await window.clipboardAPI.getMonitorStatus();
  updateMonitorBadge(isRunning);

  window.clipboardAPI.onMonitorStatusChanged((status) => {
    updateMonitorBadge(status);
  });

  // New record notifications
  window.clipboardAPI.onNewRecord(() => {
    if (state.activeTab === 'records') {
      refreshList();
    }
    refreshStats();
  });

  // Initial load
  await refreshStats();
  initList();
  initDetail();
  initSearch();
  initTrash();
  initSettings();
  initKeys();
  refreshList();
}

// ── Panel resize ──
function initPanelResizer() {
  const resizer = document.getElementById('panel-resizer');
  const leftPanel = document.getElementById('left-panel');
  let startX = 0;
  let startWidth = 0;

  resizer.addEventListener('mousedown', (e) => {
    startX = e.clientX;
    startWidth = leftPanel.offsetWidth;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  function onMouseMove(e) {
    const delta = e.clientX - startX;
    const newWidth = Math.max(180, Math.min(startWidth + delta, window.innerWidth * 0.5));
    leftPanel.style.width = `${newWidth}px`;
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
}

// ── Boot ──
document.addEventListener('DOMContentLoaded', () => {
  init();
  initPanelResizer();
});
