const { ipcMain, clipboard } = require('electron');
const dbModule = require('./database');

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
    dbModule.moveToTrash(db, id);
    return { ok: true };
  });

  ipcMain.handle('records:copy-to-clipboard', (_event, id) => {
    const record = dbModule.getRecordById(db, id);
    if (!record) return { ok: false, error: 'Not found' };

    if (record.type === 'text') {
      clipboard.writeText(record.content);
    } else if (record.type === 'image' && record.file_path) {
      const { nativeImage } = require('electron');
      const img = nativeImage.createFromPath(record.file_path);
      clipboard.writeImage(img);
    }
    return { ok: true };
  });

  // ── Trash ──

  ipcMain.handle('trash:list', () => {
    return dbModule.getTrashRecords(db);
  });

  ipcMain.handle('trash:restore', (_event, id) => {
    dbModule.restoreFromTrash(db, id);
    return { ok: true };
  });

  ipcMain.handle('trash:delete-permanent', (_event, id) => {
    const result = dbModule.permanentDelete(db, id);
    return { ok: true, ...result };
  });

  ipcMain.handle('trash:empty', () => {
    const result = dbModule.emptyTrash(db);
    return { ok: true, ...result };
  });

  // ── Settings ──

  ipcMain.handle('settings:get', () => {
    return { ...settings };
  });

  ipcMain.handle('settings:set', (_event, key, value) => {
    settings[key] = value;
    // Persist settings to disk
    const fs = require('fs');
    const path = require('path');
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
    getWin().webContents.send('monitor:status-changed', status);
    return status;
  });

  ipcMain.handle('monitor:status', () => {
    return monitor.isRunning();
  });

  // ── Stats ──

  ipcMain.handle('stats:get', () => {
    return dbModule.getStats(db);
  });
}

module.exports = { registerIpcHandlers };
