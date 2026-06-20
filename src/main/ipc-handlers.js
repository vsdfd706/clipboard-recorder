const { ipcMain, clipboard, nativeImage } = require('electron');
const dbModule = require('./database');
const fs = require('fs');
const path = require('path');

function registerIpcHandlers({ db, monitor, settings, getWin }) {
  // ── Records ──

  ipcMain.handle('records:list', (_event, filters) => {
    return dbModule.getRecords(db, filters || {});
  });

  ipcMain.handle('records:get', (_event, id) => {
    return dbModule.getRecordById(db, id) || null;
  });

  ipcMain.handle('records:update', (_event, id, data) => {
    dbModule.updateRecord(db, id, data);
    return { ok: true };
  });

  ipcMain.handle('records:delete', (_event, id) => {
    try {
      dbModule.moveToTrash(db, id);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('records:copy-to-clipboard', (_event, id) => {
    const record = dbModule.getRecordById(db, id);
    if (!record) return { ok: false, error: 'Not found' };

    if (record.type === 'text') {
      clipboard.writeText(record.content);
    } else if (record.type === 'image' && record.file_path) {
      const img = nativeImage.createFromPath(record.file_path);
      clipboard.writeImage(img);
    } else if (record.type === 'file') {
      return { ok: false, error: 'File type not yet supported for clipboard copy' };
    }
    return { ok: true };
  });

  // ── Trash ──

  ipcMain.handle('trash:list', () => {
    return dbModule.getTrashRecords(db);
  });

  ipcMain.handle('trash:restore', (_event, id) => {
    try {
      dbModule.restoreFromTrash(db, id);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('trash:delete-permanent', (_event, id) => {
    try {
      const result = dbModule.permanentDelete(db, id);
      return { ok: true, ...result };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle('trash:empty', () => {
    try {
      const result = dbModule.emptyTrash(db);
      return { ok: true, ...result };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  });

  // ── Settings ──

  ipcMain.handle('settings:get', () => {
    return { ...settings };
  });

  ipcMain.handle('settings:set', (_event, key, value) => {
    settings[key] = value;
    // Persist settings to disk
    // _dataDir is set by main/index.js during settings initialization
    const settingsPath = path.join(settings._dataDir, 'settings.json');
    const toSave = { ...settings };
    delete toSave._dataDir;
    fs.writeFileSync(settingsPath, JSON.stringify(toSave, null, 2));
    return { ok: true };
  });

  // ── Monitor ──

  ipcMain.handle('monitor:toggle', () => {
    if (monitor.isRunning()) {
      monitor.stop();
    } else {
      monitor.start();
    }
    const status = monitor.isRunning();
    const win = getWin();
    if (win) {
      win.webContents.send('monitor:status-changed', status);
    }
    return status;
  });

  ipcMain.handle('monitor:status', () => {
    return monitor.isRunning();
  });

  // ── Window control ──

  ipcMain.handle('window:hide', () => {
    const win = getWin();
    if (win) win.hide();
    return { ok: true };
  });
}

module.exports = { registerIpcHandlers };
