// Open a URL in the OS browser. In Electron, window.open is intercepted by the
// main process's setWindowOpenHandler and routed to shell.openExternal; in a
// plain browser it just opens a new tab.
export function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}
