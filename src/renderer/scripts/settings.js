// src/renderer/scripts/settings.js

const SETTING_IDS = {
  launchOnStartup: 'setting-launch-startup',
  minimizeToTray: 'setting-minimize-tray',
  monitoringEnabled: 'setting-monitor-enabled',
  notifyNewRecord: 'setting-notify',
  maxRecords: 'setting-max-records',
};

export function initSettings() {
  // Bind change handlers for each setting
  const bind = (key, id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const eventType = el.type === 'checkbox' ? 'change' : 'change';
    el.addEventListener(eventType, async () => {
      const value = el.type === 'checkbox' ? el.checked : parseInt(el.value, 10) || 0;
      await window.clipboardAPI.setSetting(key, value);

      // Immediate effect for monitoring toggle
      if (key === 'monitoringEnabled') {
        const isRunning = await window.clipboardAPI.getMonitorStatus();
        if (isRunning !== value) {
          await window.clipboardAPI.toggleMonitor();
        }
      }
    });
  };

  for (const [key, id] of Object.entries(SETTING_IDS)) {
    bind(key, id);
  }
}

export async function loadSettings() {
  const settings = await window.clipboardAPI.getSettings();

  document.getElementById('setting-launch-startup').checked = settings.launchOnStartup || false;
  document.getElementById('setting-minimize-tray').checked = settings.minimizeToTray !== false;
  document.getElementById('setting-monitor-enabled').checked = settings.monitoringEnabled !== false;
  document.getElementById('setting-notify').checked = settings.notifyNewRecord || false;
  document.getElementById('setting-max-records').value = settings.maxRecords || 0;
}
