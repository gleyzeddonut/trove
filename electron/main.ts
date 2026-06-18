// Electron main process. Owns the app window and a real PTY-backed shell that
// the embedded terminal in the renderer talks to over IPC. Clicking "run" in
// the UI ends up here as a real command written into that shell.

import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import os from 'node:os';
import * as pty from 'node-pty';
import electronUpdater from 'electron-updater';

const { autoUpdater } = electronUpdater;

// In dev, vite-plugin-electron injects the dev server URL.
const DEV_URL = process.env.VITE_DEV_SERVER_URL;

let win: BrowserWindow | null = null;
let ptyProcess: pty.IPty | null = null;
let updaterReady = false;

function defaultShell(): string {
  if (process.platform === 'win32') return process.env.COMSPEC || 'powershell.exe';
  return process.env.SHELL || '/bin/zsh';
}

function startPty() {
  if (ptyProcess) return;
  ptyProcess = pty.spawn(defaultShell(), [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: os.homedir(),
    env: { ...process.env, TERM: 'xterm-256color', TROVE: '1' },
  });

  ptyProcess.onData((data) => {
    win?.webContents.send('pty:data', data);
  });

  ptyProcess.onExit(() => {
    ptyProcess = null;
    // Respawn so the terminal stays usable for the life of the app.
    if (win && !win.isDestroyed()) startPty();
  });
}

// --- Auto-update (electron-updater + GitHub Releases) ---------------------
function sendUpdate(status: string, extra: Record<string, unknown> = {}) {
  win?.webContents.send('updater:status', { status, ...extra });
}

function setupUpdater() {
  // Only meaningful for a packaged, signed app pointed at a real feed.
  if (updaterReady || !app.isPackaged) return;
  updaterReady = true;

  autoUpdater.autoDownload = false; // wait for the user to click "Update"
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => sendUpdate('checking'));
  autoUpdater.on('update-available', (info) => sendUpdate('available', { version: info.version }));
  autoUpdater.on('update-not-available', () => sendUpdate('idle'));
  autoUpdater.on('download-progress', (p) => sendUpdate('downloading', { percent: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', (info) => sendUpdate('downloaded', { version: info.version }));
  autoUpdater.on('error', (e) => sendUpdate('error', { error: String((e as Error)?.message || e) }));

  const check = () => autoUpdater.checkForUpdates().catch(() => { /* offline / no release yet */ });
  check();
  // Re-check periodically for long-running sessions.
  setInterval(check, 6 * 60 * 60 * 1000);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1240,
    height: 880,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#0A0C10',
    title: 'Trove',
    webPreferences: {
      preload: path.join(app.getAppPath(), 'dist-electron/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Open real external links in the OS browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  startPty();

  if (DEV_URL) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  }

  // Start checking once the renderer can receive status events.
  win.webContents.once('did-finish-load', setupUpdater);

  win.on('closed', () => {
    win = null;
  });
}

// --- IPC: renderer <-> pty ------------------------------------------------
ipcMain.on('pty:input', (_e, data: string) => {
  ptyProcess?.write(data);
});

ipcMain.on('pty:resize', (_e, size: { cols: number; rows: number }) => {
  if (ptyProcess && size.cols > 0 && size.rows > 0) ptyProcess.resize(size.cols, size.rows);
});

// Run a command as if typed at the prompt (used by the UI "run" buttons).
ipcMain.on('pty:run', (_e, command: string) => {
  ptyProcess?.write(`${command}\r`);
});

// --- IPC: renderer <-> updater --------------------------------------------
ipcMain.on('updater:check', () => {
  if (app.isPackaged) autoUpdater.checkForUpdates().catch(() => { /* ignore */ });
});
ipcMain.on('updater:download', () => {
  autoUpdater.downloadUpdate().catch((e) => sendUpdate('error', { error: String((e as Error)?.message || e) }));
});
ipcMain.on('updater:install', () => {
  autoUpdater.quitAndInstall(false, true);
});

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  ptyProcess?.kill();
  ptyProcess = null;
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  ptyProcess?.kill();
  ptyProcess = null;
});
