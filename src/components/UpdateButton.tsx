// Shows up in the nav only when there's an app update. One click downloads it
// and relaunches into the new version. Driven by the store's update slice,
// which mirrors the main process's electron-updater events.

import { C, mono, sans } from '../tokens';
import { useTroveStore } from '../store/useTroveStore';

export function UpdateButton() {
  const update = useTroveStore((s) => s.update);
  const startUpdate = useTroveStore((s) => s.startUpdate);

  // No updater in the browser/dev build.
  if (typeof window === 'undefined' || !window.troveUpdater) return null;

  const { status, version, percent } = update;

  if (status === 'available') {
    return (
      <button
        onClick={startUpdate}
        title={version ? `Update to v${version} and restart` : 'Update and restart'}
        style={{
          display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
          background: C.accent, color: '#fff', border: 'none', borderRadius: 10,
          padding: '8px 13px', fontFamily: sans, fontSize: 13, fontWeight: 700,
        }}
      >
        <Spark />
        Update{version ? ` to v${version}` : ''}
      </button>
    );
  }

  if (status === 'downloading') {
    return (
      <span
        style={{
          display: 'flex', alignItems: 'center', gap: 8, background: C.panel,
          border: `1px solid ${C.line}`, borderRadius: 10, padding: '8px 13px',
          fontFamily: mono, fontSize: 12.5, color: C.sub, fontWeight: 600,
        }}
      >
        <span className="hs-spin" style={{ width: 11, height: 11, border: `1.6px solid ${C.line}`, borderTopColor: C.accent, borderRadius: 11, display: 'inline-block' }} />
        Updating… {percent ?? 0}%
      </span>
    );
  }

  if (status === 'downloaded') {
    return (
      <button
        onClick={() => window.troveUpdater?.install()}
        title="Restart to finish updating"
        style={{
          display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
          background: C.green, color: '#06210E', border: 'none', borderRadius: 10,
          padding: '8px 13px', fontFamily: sans, fontSize: 13, fontWeight: 700,
        }}
      >
        Restart to update
      </button>
    );
  }

  return null;
}

const Spark = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2.5v4M8 9.5v4M3.5 8h4M9.5 8h3" />
    <path d="M5 5l1.5 1.5M11 11L9.5 9.5M11 5L9.5 6.5M5 11l1.5-1.5" />
  </svg>
);
