// LUFS Meter - macOS app shell (Electron) around the meter page.
// The page itself is app/index.html (copied from ../index.html by build.sh). The samples come from the nano-meter
// helper (native/nano-meter.swift, the same as in the Nano Cortex Editor), because the page cannot read more than the
// first two channels of an audio input and the Nano sends its processed sound on USB channels 3/4.
const { app, BrowserWindow, ipcMain, Menu, session, shell, systemPreferences } = require('electron');
const fs = require('fs');
const path = require('path');
const { registerMeter } = require('./meter');

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
function readSettings() {
  try { return JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); } catch (err) { return {}; }
}
function writeSettings(settings) {
  try { fs.writeFileSync(settingsFile(), JSON.stringify(settings)); } catch (err) { /* not important enough to fail */ }
}

// Zoom like in Chrome: Cmd + / Cmd - step through these factors, Cmd 0 returns to 100 %. The zoom is kept for the next start.
const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
function nextZoom(current, direction) {
  if (direction === 0) return 1;
  const steps = direction > 0 ? ZOOM_STEPS : ZOOM_STEPS.slice().reverse();
  return steps.find(step => (direction > 0 ? step > current + 0.001 : step < current - 0.001)) || steps[steps.length - 1];
}
function zoom(win, direction) {
  if (!win) return;
  const factor = nextZoom(win.webContents.getZoomFactor(), direction);
  win.webContents.setZoomFactor(factor);
  writeSettings({ ...readSettings(), zoom: factor });
}

function buildMenu() {
  const focused = () => BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  const onTop = Boolean(readSettings().onTop);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    { label: 'File', submenu: [{ role: 'close' }] },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { label: 'Keep on Top', type: 'checkbox', checked: onTop,
          click: item => { writeSettings({ ...readSettings(), onTop: item.checked }); BrowserWindow.getAllWindows().forEach(win => win.setAlwaysOnTop(item.checked, 'floating')); } },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CommandOrControl+0', registerAccelerator: false, click: () => zoom(focused(), 0) },
        { label: 'Zoom In', accelerator: 'CommandOrControl+Plus', registerAccelerator: false, click: () => zoom(focused(), 1) },
        { label: 'Zoom Out', accelerator: 'CommandOrControl+-', registerAccelerator: false, click: () => zoom(focused(), -1) },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' }
      ]
    },
    { role: 'windowMenu' }
  ]));
}

const onScreen = bounds => Boolean(bounds) && require('electron').screen.getAllDisplays().some(({ workArea: a }) =>
  bounds.x < a.x + a.width - 80 && bounds.x + bounds.width > a.x + 80 && bounds.y >= a.y - 10 && bounds.y < a.y + a.height - 80);

function createWindow() {
  const settings = readSettings();
  const saved = onScreen(settings.bounds) ? settings.bounds : null;
  const win = new BrowserWindow({
    ...(saved || { width: 980, height: 820 }),
    minWidth: 620,
    minHeight: 560,
    title: 'LUFS Meter',
    backgroundColor: '#000000',
    // No title bar: the window buttons sit in the page's top bar, centred on it; the page leaves room for them and
    // lets the bar move the window.
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 27 },
    alwaysOnTop: Boolean(settings.onTop),
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,   // keeps measuring while the window is behind another one
      preload: path.join(__dirname, 'preload.js')
    }
  });
  if (settings.onTop) win.setAlwaysOnTop(true, 'floating');

  // Cmd + (also Cmd = and the keypad +), Cmd -, Cmd 0
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || !(input.meta || input.control) || input.alt) return;
    const direction = { '+': 1, '=': 1, '-': -1, '0': 0 }[input.key];
    if (direction === undefined) return;
    event.preventDefault();
    zoom(win, direction);
  });
  win.webContents.on('did-finish-load', () => {
    const zoomSaved = Number(readSettings().zoom);
    if (ZOOM_STEPS.includes(zoomSaved)) win.webContents.setZoomFactor(zoomSaved);
  });

  let saveTimer = null;
  const remember = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!win.isDestroyed() && !win.isFullScreen()) writeSettings({ ...readSettings(), bounds: win.getBounds() });
    }, 400);
  };
  win.on('move', remember);
  win.on('resize', remember);

  // In full screen the window buttons are hidden, so the bar needs no room for them.
  win.on('enter-full-screen', () => win.webContents.send('app:fullscreen', true));
  win.on('leave-full-screen', () => win.webContents.send('app:fullscreen', false));

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.on('closed', () => stopMeter());
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
}

// The Nano's USB audio is an audio input ("microphone") for macOS: macOS asks the user once.
function askForAudioInput() {
  if (process.platform !== 'darwin') return Promise.resolve(true);
  return systemPreferences.askForMediaAccess('microphone').catch(() => false);
}

// The helper sits next to the app's executable (in a development run: mac-app/native/).
let stopMeter = () => {};
const helper = name => (app.isPackaged ? path.join(path.dirname(process.execPath), name) : path.join(__dirname, 'native', name));

app.whenReady().then(() => {
  stopMeter = registerMeter({ ipcMain, helperPath: helper('nano-meter'), askAccess: askForAudioInput });
  // Should the page ask for an audio input itself, only audio is let through.
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    if (permission !== 'media') { callback(false); return; }
    if ((details.mediaTypes || []).includes('video')) { callback(false); return; }
    askForAudioInput().then(callback);
  });
  buildMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => stopMeter());
