// The terminal bridge exposed by the Electron preload. Optional because the
// renderer can also run in a plain browser (where there's no real shell).

export interface TroveTerminalApi {
  onData(cb: (data: string) => void): () => void;
  sendInput(data: string): void;
  resize(cols: number, rows: number): void;
  run(command: string): void;
  requestBacklog(): void;
  popOut(): void;
  popIn(): void;
  onPopState(cb: (poppedOut: boolean) => void): () => void;
}

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface UpdateState {
  status: UpdateStatus;
  version?: string;
  percent?: number;
  error?: string;
}

export interface TroveUpdaterApi {
  onStatus(cb: (s: UpdateState) => void): () => void;
  check(): void;
  download(): void;
  install(): void;
  getVersion(): Promise<string>;
}

export interface TroveYouTubeApi {
  meta(watchUrl: string): Promise<{ title: string; author: string } | null>;
}

export interface TroveBrowserApi {
  onNewTab(cb: (url: string) => void): () => void;
}

export interface TroveFindApi {
  query(opts: { text: string; forward?: boolean; findNext?: boolean }): void;
  stop(): void;
  onResult(cb: (r: { matches: number; active: number }) => void): () => void;
}

export interface TroveVideoApi {
  popOut(url: string): void;
}

declare global {
  interface Window {
    troveTerminal?: TroveTerminalApi;
    troveEnv?: { githubToken: string };
    troveUpdater?: TroveUpdaterApi;
    troveYouTube?: TroveYouTubeApi;
    troveBrowser?: TroveBrowserApi;
    troveFind?: TroveFindApi;
    troveVideo?: TroveVideoApi;
    /** Dismiss the boot splash (defined inline in index.html). */
    __troveBootReady?: () => void;
  }
}

export {};
