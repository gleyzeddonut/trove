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
  /** Ask the main process to replay recent output into this window. */
  requestBacklog() {
    ipcRenderer.send('terminal:backlog');
  },
  /** Open the terminal in its own window. */
  popOut() {
    ipcRenderer.send('terminal:popout');
  },
  /** Close the popped-out window and return the terminal to the dock. */
  popIn() {
    ipcRenderer.send('terminal:popin');
  },
  /** Subscribe to pop-out state changes (main window). Returns unsubscribe. */
  onPopState(cb: (poppedOut: boolean) => void) {
    const listener = (_e: IpcRendererEvent, v: boolean) => cb(v);
    ipcRenderer.on('terminal:popped', listener);
    return () => ipcRenderer.removeListener('terminal:popped', listener);
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
  getVersion(): Promise<string> {
    return ipcRenderer.invoke('app:version');
  },
};

contextBridge.exposeInMainWorld('troveUpdater', updater);

// Fetch YouTube oEmbed metadata in the main process — the public endpoint sends
// no CORS header, so a renderer fetch would be blocked.
const youtube = {
  meta(watchUrl: string): Promise<{ title: string; author: string } | null> {
    return ipcRenderer.invoke('youtube:meta', watchUrl);
  },
};

contextBridge.exposeInMainWorld('troveYouTube', youtube);

// Browser bridge: the main process asks the renderer to open a new tab when a
// web tab tries to spawn a window (target=_blank / window.open).
const browser = {
  onNewTab(cb: (url: string) => void) {
    const listener = (_e: IpcRendererEvent, url: string) => cb(url);
    ipcRenderer.on('browser:new-tab', listener);
    return () => ipcRenderer.removeListener('browser:new-tab', listener);
  },
};

contextBridge.exposeInMainWorld('troveBrowser', browser);

// Find-in-page bridge (⌘F) — native findInPage + result counts.
const find = {
  query(opts: { text: string; forward?: boolean; findNext?: boolean }) {
    ipcRenderer.send('find:query', opts);
  },
  stop() {
    ipcRenderer.send('find:stop');
  },
  onResult(cb: (r: { matches: number; active: number }) => void) {
    const listener = (_e: IpcRendererEvent, r: { matches: number; active: number }) => cb(r);
    ipcRenderer.on('find:result', listener);
    return () => ipcRenderer.removeListener('find:result', listener);
  },
};

contextBridge.exposeInMainWorld('troveFind', find);

// Pop the video out into its own floating window.
const videoWindow = {
  popOut(url: string) {
    ipcRenderer.send('video:popout', url);
  },
};

contextBridge.exposeInMainWorld('troveVideo', videoWindow);

export type TroveTerminalApi = typeof api;
export type TroveVideoApi = typeof videoWindow;
export type TroveUpdaterApi = typeof updater;
export type TroveYouTubeApi = typeof youtube;
export type TroveBrowserApi = typeof browser;
export type TroveFindApi = typeof find;
