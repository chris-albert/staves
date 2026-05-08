import { app, BrowserWindow, dialog, ipcMain, shell, session, systemPreferences, nativeImage } from 'electron';
import { join } from 'path';
import fs from 'fs';
import path from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';

// Set the app name early so macOS menu bar and dock show "Staves"
app.name = 'Staves';

function getIcon(): Electron.NativeImage | undefined {
  const iconPath = join(__dirname, '../../resources/icon.png');
  try {
    return nativeImage.createFromPath(iconPath);
  } catch {
    return undefined;
  }
}

function createWindow(): BrowserWindow {
  const icon = getIcon();

  const mainWindow = new BrowserWindow({
    title: 'Staves',
    icon,
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#09090b',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // CSP: allow AudioWorklet blob URLs, unsafe-eval for Vite HMR in dev
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = is.dev
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss: http: https:; media-src 'self' blob:; img-src 'self' data: blob:; worker-src 'self' blob:"
      : "default-src 'self'; script-src 'self' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss: https:; media-src 'self' blob:; img-src 'self' data: blob:; worker-src 'self' blob:";

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });

  // Dev: load from Vite dev server. Prod: load built files.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}

// ─── IPC Handlers ────────────────────────────────────────────────────────

// Native save dialog — writes binary data to a user-chosen file
ipcMain.handle('dialog:save-file', async (_event, { data, defaultName, filters }) => {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters,
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  await fs.promises.writeFile(result.filePath, Buffer.from(data));
  return { canceled: false, filePath: result.filePath };
});

// Native open dialog — reads a file chosen by the user
ipcMain.handle('dialog:open-file', async (_event, { filters }) => {
  const result = await dialog.showOpenDialog({
    filters,
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };
  const data = await fs.promises.readFile(result.filePaths[0]!);
  return { canceled: false, data: data.buffer, name: path.basename(result.filePaths[0]!) };
});

// macOS microphone permission
ipcMain.handle('audio:request-mic-permission', async () => {
  if (process.platform === 'darwin') {
    return await systemPreferences.askForMediaAccess('microphone');
  }
  return true;
});

ipcMain.handle('audio:get-mic-status', () => {
  if (process.platform === 'darwin') {
    return systemPreferences.getMediaAccessStatus('microphone');
  }
  return 'granted';
});

// ─── App Lifecycle ───────────────────────────────────────────────────────

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.staves.app');

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Set dock icon on macOS
  if (process.platform === 'darwin') {
    const icon = getIcon();
    if (icon) app.dock.setIcon(icon);
  }

  createWindow();

  // macOS: re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// macOS: don't quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
