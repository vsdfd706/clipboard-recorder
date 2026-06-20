// src/renderer/scripts/settings.js

const SETTING_IDS = {
  launchOnStartup: 'setting-launch-startup',
  minimizeToTray: 'setting-minimize-tray',
  monitoringEnabled: 'setting-monitor-enabled',
  notifyNewRecord: 'setting-notify',
  maxRecords: 'setting-max-records',
};

export function initSettings() {
  // Theme toggle
  const btnLight = document.getElementById('theme-light');
  const btnDark = document.getElementById('theme-dark');

  function setThemeUI(theme) {
    const isLight = theme === 'light';
    btnLight.classList.toggle('active', isLight);
    btnDark.classList.toggle('active', !isLight);
    document.documentElement.setAttribute('data-theme', isLight ? '' : 'dark');
  }

  btnLight.addEventListener('click', async () => {
    setThemeUI('light');
    await window.clipboardAPI.setSetting('theme', 'light');
  });

  btnDark.addEventListener('click', async () => {
    setThemeUI('dark');
    await window.clipboardAPI.setSetting('theme', 'dark');
  });

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

  // Apply theme
  const theme = settings.theme || 'light';
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '');
  document.getElementById('theme-light').classList.toggle('active', theme === 'light');
  document.getElementById('theme-dark').classList.toggle('active', theme === 'dark');
}
