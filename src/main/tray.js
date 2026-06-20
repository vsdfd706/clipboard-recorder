const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');

function createTray({ monitor, getWin }) {
  // Create a simple 16x16 tray icon programmatically (no external file needed)
  const icon = nativeImage.createEmpty();
  const tray = new Tray(icon);  // We'll use a simple colored icon

  // Build a proper tray icon
  updateTrayIcon(tray, monitor.isRunning());

  const buildMenu = () => {
    const isMonitoring = monitor.isRunning();
    return Menu.buildFromTemplate([
      {
        label: isMonitoring ? 'Pause Monitoring' : 'Resume Monitoring',
        click: () => {
          if (monitor.isRunning()) {
            monitor.stop();
          } else {
            monitor.start();
          }
          updateTrayIcon(tray, monitor.isRunning());
          const win = getWin();
          if (win) {
            win.webContents.send('monitor:status-changed', monitor.isRunning());
          }
        },
      },
      {
        label: 'Show/Hide Window',
        click: () => {
          const win = getWin();
          if (!win) return;
          if (win.isVisible()) {
            win.hide();
          } else {
            win.show();
            win.focus();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          const app = require('electron').app;
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);
  };

  tray.setToolTip('Clipboard Recorder');
  tray.setContextMenu(buildMenu());

  tray.on('right-click', () => {
    tray.setContextMenu(buildMenu());
  });

  // Double-click tray icon to show window
  tray.on('double-click', () => {
    const win = getWin();
    if (win) {
      win.show();
      win.focus();
    }
  });

  return tray;

  function updateTrayIcon(tray, isMonitoring) {
    // Create a 16x16 icon: green when monitoring, gray when paused
    const size = 16;
    const canvas = Buffer.alloc(size * size * 4);
    const color = isMonitoring ? [0, 200, 100, 255] : [128, 128, 128, 255];

    for (let i = 0; i < size * size; i++) {
      const x = i % size;
      const y = Math.floor(i / size);
      const dist = Math.sqrt((x - 8) ** 2 + (y - 8) ** 2);
      if (dist < 7) {
        const offset = i * 4;
        canvas[offset] = color[0];
        canvas[offset + 1] = color[1];
        canvas[offset + 2] = color[2];
        canvas[offset + 3] = color[3];
      }
    }

    const img = nativeImage.createFromBuffer(canvas, { width: size, height: size });
    tray.setImage(img);
  }
}

module.exports = { createTray };
