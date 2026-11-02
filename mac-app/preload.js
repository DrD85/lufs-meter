// Bridge between the meter page and the app (meter.js, native/nano-meter.swift). The page gets these functions and
// nothing else of Electron; without them (in Chrome) it opens the audio input itself and gets only channels 1/2.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nanoMeter', {
  list: () => ipcRenderer.invoke('meter:list'),                  // { devices: [{ uid, name, channels, rate, default }] } or { error }
  start: options => ipcRenderer.invoke('meter:start', options),  // { uid, first } -> { name, channels, rate, first, count } or { error }
  stop: () => ipcRenderer.invoke('meter:stop'),
  onData: handler => {                                           // { p: [left, right], e, n } every 25 ms, or { error }
    ipcRenderer.removeAllListeners('meter:data');
    ipcRenderer.on('meter:data', (event, data) => handler(data));
  }
});

contextBridge.exposeInMainWorld('lufsApp', {
  onFullscreen: handler => {                                     // true / false: the window buttons are hidden / back
    ipcRenderer.removeAllListeners('app:fullscreen');
    ipcRenderer.on('app:fullscreen', (event, on) => handler(on));
  }
});
