// The terminal bridge exposed by the Electron preload. Optional because the
// renderer can also run in a plain browser (where there's no real shell).

export interface TroveTerminalApi {
  onData(cb: (data: string) => void): () => void;
  sendInput(data: string): void;
  resize(cols: number, rows: number): void;
  run(command: string): void;
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
}

declare global {
  interface Window {
    troveTerminal?: TroveTerminalApi;
    troveEnv?: { githubToken: string };
    troveUpdater?: TroveUpdaterApi;
  }
}

export {};
