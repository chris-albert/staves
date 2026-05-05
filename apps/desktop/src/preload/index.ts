import { contextBridge, ipcRenderer } from 'electron';

export interface StavesDesktopAPI {
  platform: NodeJS.Platform;
  isElectron: true;

  send(channel: string, ...args: unknown[]): void;
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  on(channel: string, listener: (...args: unknown[]) => void): () => void;
}

const SEND_CHANNELS = ['app:minimize', 'app:maximize', 'app:close'];

const INVOKE_CHANNELS = [
  'audio:get-devices',
  'audio:set-sample-rate',
  'dialog:save-file',
  'dialog:open-file',
];

const ON_CHANNELS = ['audio:device-changed'];

const api: StavesDesktopAPI = {
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
      const wrappedListener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
        listener(...args);
      ipcRenderer.on(channel, wrappedListener);
      return () => {
        ipcRenderer.removeListener(channel, wrappedListener);
      };
    }
    return () => {};
  },
};

contextBridge.exposeInMainWorld('staves', api);
