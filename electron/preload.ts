// Bridges the embedded terminal to the real shell in the main process.
// Exposed on window.troveTerminal with a small, typed surface.

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

const api = {
  /** Subscribe to shell output. Returns an unsubscribe fn. */
  onData(cb: (data: string) => void) {
    const listener = (_e: IpcRendererEvent, data: string) => cb(data);
    ipcRenderer.on('pty:data', listener);
    return () => ipcRenderer.removeListener('pty:data', listener);
  },
  /** Send raw keystrokes to the shell. */
  sendInput(data: string) {
    ipcRenderer.send('pty:input', data);
  },
  /** Tell the shell its new viewport size. */
  resize(cols: number, rows: number) {
    ipcRenderer.send('pty:resize', { cols, rows });
  },
  /** Run a command as if typed at the prompt + Enter. */
  run(command: string) {
    ipcRenderer.send('pty:run', command);
  },
};

contextBridge.exposeInMainWorld('troveTerminal', api);

// Surface an optional GitHub token (from the app's environment) so the
// renderer can raise the API rate limit without the token living in UI code.
contextBridge.exposeInMainWorld('troveEnv', {
  githubToken: process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '',
});

// Auto-update bridge: subscribe to status, and trigger check/download/install.
const updater = {
  onStatus(cb: (s: unknown) => void) {
    const listener = (_e: IpcRendererEvent, s: unknown) => cb(s);
    ipcRenderer.on('updater:status', listener);
    return () => ipcRenderer.removeListener('updater:status', listener);
  },
  check() {
    ipcRenderer.send('updater:check');
  },
  download() {
    ipcRenderer.send('updater:download');
  },
  install() {
    ipcRenderer.send('updater:install');
  },
};

contextBridge.exposeInMainWorld('troveUpdater', updater);

export type TroveTerminalApi = typeof api;
export type TroveUpdaterApi = typeof updater;
