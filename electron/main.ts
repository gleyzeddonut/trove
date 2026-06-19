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
let popoutWin: BrowserWindow | null = null;
let ptyProcess: pty.IPty | null = null;
let updaterReady = false;

// Recent shell output, replayed to a window when it (re)attaches the terminal —
// so popping the terminal in/out (or first paint) isn't blank.
let ptyBuffer = '';
const PTY_BUFFER_CAP = 100_000;

/** The window currently showing the terminal (popout takes priority). */
function ptyTarget(): BrowserWindow | null {
  if (popoutWin && !popoutWin.isDestroyed()) return popoutWin;
  return win && !win.isDestroyed() ? win : null;
}

/** Send to a window only if it's still alive (avoids "Object has been destroyed"). */
function safeSend(target: BrowserWindow | null, channel: string, payload?: unknown) {
  if (target && !target.isDestroyed()) target.webContents.send(channel, payload);
}

function defaultShell(): string {
  if (process.platform === 'win32') return process.env.COMSPEC || 'powershell.exe';
  return process.env.SHELL || '/bin/zsh';
}

function startPty() {
  if (ptyProcess) return;
  // Launch as a LOGIN shell so it sources the user's profile (.zprofile,
  // Homebrew shellenv, nvm, etc.). A GUI app gets a minimal PATH from launchd,
  // so without this `npm`, `brew`, `cargo`, … are "command not found".
  const args = process.platform === 'win32' ? [] : ['-l'];
  ptyProcess = pty.spawn(defaultShell(), args, {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: os.homedir(),
    env: { ...process.env, TERM: 'xterm-256color', TROVE: '1' },
  });

  ptyProcess.onData((data) => {
    ptyBuffer = (ptyBuffer + data).slice(-PTY_BUFFER_CAP);
    ptyTarget()?.webContents.send('pty:data', data);
  });

  ptyProcess.onExit(() => {
    ptyProcess = null;
    // Respawn so the terminal stays usable for the life of the app.
    if (win && !win.isDestroyed()) startPty();
  });
}

// --- Auto-update (electron-updater + GitHub Releases) ---------------------
function sendUpdate(status: string, extra: Record<string, unknown> = {}) {
  safeSend(win, 'updater:status', { status, ...extra });
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
    // Frameless title bar so the renderer's tab strip "owns" the top of the
    // window; the native traffic lights are positioned to sit inside the Trove
    // app zone (see BrowserChrome LIGHTS_W).
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 15 },
    webPreferences: {
      preload: path.join(app.getAppPath(), 'dist-electron/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Enables the in-app browser dock (<webview>). The webview itself runs
      // with no preload / no node integration, so embedded pages can't reach
      // the shell bridges.
      webviewTag: true,
    },
  });

  // Open real external links in the OS browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Harden the in-app browser dock: webviews must never receive a preload or
  // node access (so embedded pages stay sandboxed from the shell bridges).
  win.webContents.on('will-attach-webview', (_e, webPreferences) => {
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
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

// --- Pop-out terminal window ---------------------------------------------
function openPopout() {
  if (popoutWin && !popoutWin.isDestroyed()) {
    popoutWin.focus();
    return;
  }
  popoutWin = new BrowserWindow({
    width: 760,
    height: 480,
    minWidth: 420,
    minHeight: 240,
    backgroundColor: '#0A0B0E',
    title: 'Trove Terminal',
    webPreferences: {
      preload: path.join(app.getAppPath(), 'dist-electron/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  popoutWin.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  if (DEV_URL) {
    popoutWin.loadURL(`${DEV_URL}#/__terminal`);
  } else {
    popoutWin.loadFile(path.join(app.getAppPath(), 'dist/index.html'), { hash: '/__terminal' });
  }
  popoutWin.on('closed', () => {
    popoutWin = null;
    safeSend(win, 'terminal:popped', false);
  });
  safeSend(win, 'terminal:popped', true);
}

// --- IPC: renderer <-> pty ------------------------------------------------
ipcMain.on('pty:input', (_e, data: string) => {
  ptyProcess?.write(data);
});

ipcMain.on('terminal:backlog', (e) => {
  if (ptyBuffer) e.sender.send('pty:data', ptyBuffer);
});

ipcMain.on('terminal:popout', () => openPopout());
ipcMain.on('terminal:popin', () => {
  if (popoutWin && !popoutWin.isDestroyed()) popoutWin.close();
});

ipcMain.handle('app:version', () => app.getVersion());

// YouTube oEmbed (no CORS in the main process) — title + channel for the dock's
// video meta + "Up next" queue. Returns null on any failure.
ipcMain.handle('youtube:meta', async (_e, watchUrl: string) => {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`);
    if (!res.ok) return null;
    const j = (await res.json()) as { title?: string; author_name?: string };
    return { title: j.title || '', author: j.author_name || '' };
  } catch {
    return null;
  }
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

// Links inside a web tab that try to open a new window (target=_blank,
// window.open) become new Trove browser tabs instead of unmanaged windows.
app.on('web-contents-created', (_e, contents) => {
  if (contents.getType() === 'webview') {
    contents.setWindowOpenHandler(({ url }) => {
      const host = contents.hostWebContents;
      if (host && !host.isDestroyed()) host.send('browser:new-tab', url);
      else shell.openExternal(url);
      return { action: 'deny' };
    });
  }
});

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  // On macOS the app stays alive when its windows close — keep the shell
  // running so the session survives reopening the window. Other platforms
  // quit, which kills the pty via before-quit.
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  ptyProcess?.kill();
  ptyProcess = null;
});
