// src/renderer/scripts/detail.js
import { state } from './app.js';
import { refreshList } from './list.js';

let autoSaveTimer = null;
let currentRecord = null;

export function initDetail() {
  const textEditor = document.getElementById('detail-text-editor');
  const noteEditor = document.getElementById('detail-note-editor');

  // Auto-save on input (debounced 1 second)
  const onInput = () => {
    const saveStatus = document.getElementById('detail-save-status');
    saveStatus.textContent = 'Unsaved changes...';
    saveStatus.style.color = '#f0c040';

    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => saveCurrent(), 1000);
  };

  textEditor.addEventListener('input', onInput);
  noteEditor.addEventListener('input', onInput);

  // Manual save on Ctrl+S
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      clearTimeout(autoSaveTimer);
      saveCurrent();
    }
  });

  // Delete button
  document.getElementById('btn-delete-record').addEventListener('click', async () => {
    if (!currentRecord) return;
    await window.clipboardAPI.deleteRecord(currentRecord.id);
    currentRecord = null;
    hideDetail();
    refreshList();
    const { refreshStats } = await import('./app.js');
    refreshStats();
  });

  // Copy to clipboard button
  document.getElementById('btn-copy-to-clipboard').addEventListener('click', async () => {
    if (!currentRecord) return;
    await window.clipboardAPI.copyToClipboard(currentRecord.id);
    const saveStatus = document.getElementById('detail-save-status');
    saveStatus.textContent = 'Copied!';
    saveStatus.style.color = 'var(--success)';
    setTimeout(() => { saveStatus.textContent = ''; }, 1500);
  });
}

export async function showDetail(id) {
  const record = await window.clipboardAPI.getRecord(id);
  if (!record) return;

  currentRecord = record;
  document.getElementById('detail-content').style.display = 'flex';
  document.getElementById('detail-placeholder').style.display = 'none';

  // Type badge
  const typeBadge = document.getElementById('detail-type-badge');
  typeBadge.textContent = record.type;
  typeBadge.className = `type-badge type-${record.type}`;

  // Time
  document.getElementById('detail-time').textContent = new Date(record.created_at).toLocaleString();

  // Show/hide elements based on type
  const textEditor = document.getElementById('detail-text-editor');
  const imagePreview = document.getElementById('detail-image-preview');
  const fileInfo = document.getElementById('detail-file-info');
  const noteGroup = document.getElementById('detail-note-group');

  textEditor.style.display = 'none';
  imagePreview.style.display = 'none';
  fileInfo.style.display = 'none';
  noteGroup.style.display = 'none';

  if (record.type === 'text') {
    textEditor.style.display = 'block';
    textEditor.value = record.content || '';
    noteGroup.style.display = 'block'; // Allow notes on text too
    document.getElementById('detail-note-editor').value = record.note || '';
  } else if (record.type === 'image') {
    imagePreview.style.display = 'block';
    if (record.file_path) {
      document.getElementById('detail-image').src = `file://${record.file_path}`;
    }
    noteGroup.style.display = 'block';
    document.getElementById('detail-note-editor').value = record.note || '';
  } else if (record.type === 'file') {
    fileInfo.style.display = 'block';
    document.getElementById('detail-file-name').textContent = record.file_name || 'Unknown file';
    noteGroup.style.display = 'block';
    document.getElementById('detail-note-editor').value = record.note || '';
  }

  // Clear save status
  document.getElementById('detail-save-status').textContent = '';
}

function hideDetail() {
  document.getElementById('detail-content').style.display = 'none';
  document.getElementById('detail-placeholder').style.display = 'flex';
}

async function saveCurrent() {
  if (!currentRecord) return;

  const textEditor = document.getElementById('detail-text-editor');
  const noteEditor = document.getElementById('detail-note-editor');

  const data = {};
  if (currentRecord.type === 'text') {
    data.content = textEditor.value;
  }
  data.note = noteEditor.value;

  await window.clipboardAPI.updateRecord(currentRecord.id, data);

  const saveStatus = document.getElementById('detail-save-status');
  saveStatus.textContent = '✓ Saved';
  saveStatus.style.color = 'var(--success)';
  setTimeout(() => { saveStatus.textContent = ''; }, 2000);

  // Update local copy
  if (data.content !== undefined) currentRecord.content = data.content;
  if (data.note !== undefined) currentRecord.note = data.note;

  refreshList();
}
