const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clipboardAPI', {
  // Records
  getRecords: (filters) => ipcRenderer.invoke('records:list', filters),
  getRecord: (id) => ipcRenderer.invoke('records:get', id),
  updateRecord: (id, data) => ipcRenderer.invoke('records:update', id, data),
  deleteRecord: (id) => ipcRenderer.invoke('records:delete', id),
  copyToClipboard: (id) => ipcRenderer.invoke('records:copy-to-clipboard', id),

  // Trash
  getTrashRecords: () => ipcRenderer.invoke('trash:list'),
  restoreFromTrash: (id) => ipcRenderer.invoke('trash:restore', id),
  permanentDelete: (id) => ipcRenderer.invoke('trash:delete-permanent', id),
  emptyTrash: () => ipcRenderer.invoke('trash:empty'),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),

  // Monitor
  toggleMonitor: () => ipcRenderer.invoke('monitor:toggle'),
  getMonitorStatus: () => ipcRenderer.invoke('monitor:status'),

  // Stats
  getStats: () => ipcRenderer.invoke('stats:get'),

  // Events (main → renderer)
  onNewRecord: (callback) => {
    const listener = (_event, record) => callback(record);
    ipcRenderer.on('clipboard:new-record', listener);
    return () => ipcRenderer.removeListener('clipboard:new-record', listener);
  },
  onMonitorStatusChanged: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('monitor:status-changed', listener);
    return () => ipcRenderer.removeListener('monitor:status-changed', listener);
  },
});
