const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const dbModule = require('./database');
const { ClipboardMonitor } = require('./clipboard');
const { registerIpcHandlers } = require('./ipc-handlers');
const { createTray } = require('./tray');

let win = null;
let tray = null;
let monitor = null;
let db = null;
let settings = {};

const DATA_DIR = path.join(app.getPath('appData'), 'clipboard-recorder');

function loadSettings() {
  const settingsPath = path.join(DATA_DIR, 'settings.json');
  const defaults = {
    launchOnStartup: false,
    minimizeToTray: true,
    monitoringEnabled: true,
    notifyNewRecord: false,
    maxRecords: 0,
    customDataDir: '',
    _dataDir: DATA_DIR,
  };

  try {
    if (fs.existsSync(settingsPath)) {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      return { ...defaults, ...data, _dataDir: DATA_DIR };
    }
  } catch (e) {
    // Use defaults on parse failure
  }
  return defaults;
}

function saveSettings() {
  const settingsPath = path.join(DATA_DIR, 'settings.json');
  const toSave = { ...settings };
  delete toSave._dataDir;
  fs.writeFileSync(settingsPath, JSON.stringify(toSave, null, 2));
}

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    title: 'Clipboard Recorder',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // Minimize to tray instead of closing
  win.on('close', (event) => {
    if (!app.isQuitting && settings.minimizeToTray) {
      event.preventDefault();
      win.hide();
    }
  });
}

app.whenReady().then(() => {
  // Init database
  const { db: database, imagesDir, filesDir } = dbModule.initDatabase(DATA_DIR);
  db = database;

  // Load settings
  settings = loadSettings();
  saveSettings(); // Ensure file exists

  // Init clipboard monitor
  monitor = new ClipboardMonitor(db, imagesDir, filesDir, (record) => {
    dbModule.addRecord(db, record);

    // Enforce max records limit
    if (settings.maxRecords > 0) {
      const count = dbModule.getRecordCount(db);
      if (count > settings.maxRecords) {
        const excess = count - settings.maxRecords;
        dbModule.deleteOldestRecords(db, excess);
      }
    }

    if (win) {
      const stats = dbModule.getStats(db);
      win.webContents.send('clipboard:new-record', record);
      win.webContents.send('stats:updated', stats);
    }
  });

  // Start monitoring if enabled
  if (settings.monitoringEnabled) {
    monitor.start();
  }

  // Register IPC handlers
  registerIpcHandlers({ db, imagesDir, filesDir, monitor, settings, getWin: () => win });

  // Create window
  createWindow();

  // Create tray
  tray = createTray({ monitor, getWin: () => win });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit; keep running in tray
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (monitor) monitor.stop();
  if (db) db.close();
});
