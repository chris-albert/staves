import { contextBridge, ipcRenderer } from "electron";
const SEND_CHANNELS = ["app:minimize", "app:maximize", "app:close"];
const INVOKE_CHANNELS = [
  "audio:get-devices",
  "audio:set-sample-rate",
  "dialog:save-file",
  "dialog:open-file"
];
const ON_CHANNELS = ["audio:device-changed"];
const api = {
  platform: process.platform,
  isElectron: true,
  send(channel, ...args) {
    if (SEND_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
  invoke(channel, ...args) {
    if (INVOKE_CHANNELS.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Invalid channel: ${channel}`));
  },
  on(channel, listener) {
    if (ON_CHANNELS.includes(channel)) {
      const wrappedListener = (_event, ...args) => listener(...args);
      ipcRenderer.on(channel, wrappedListener);
      return () => {
        ipcRenderer.removeListener(channel, wrappedListener);
      };
    }
    return () => {
    };
  }
};
contextBridge.exposeInMainWorld("staves", api);
