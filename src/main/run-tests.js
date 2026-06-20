const { app } = require('electron');

app.commandLine.appendSwitch('no-sandbox');

app.on('ready', () => {
  try {
    require('./database.test');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
});
