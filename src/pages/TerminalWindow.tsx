// The popped-out terminal — the entire UI of the secondary window (route
// /__terminal). Just a slim title bar + the shared terminal view, attached to
// the same shell as the dock via the preload bridge.

import { T, mono } from '../tokens';
import { TerminalView } from '../components/console/TerminalView';

export function TerminalWindow() {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: T.bg, display: 'flex', flexDirection: 'column', fontFamily: mono }}>
      <div style={{ height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', borderBottom: `1px solid ${T.line2}`, WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <span style={{ width: 8, height: 8, borderRadius: 8, background: T.green, boxShadow: `0 0 8px ${T.green}` }} />
        <span style={{ fontSize: 12.5, color: T.text, fontWeight: 600 }}>
          trove<span style={{ color: T.green }}>//</span>terminal
        </span>
        <div style={{ flex: 1 }} />
        <button
          className="hc-tabtn"
          onClick={() => window.troveTerminal?.popIn()}
          title="Return the terminal to the main window"
          style={{ border: 'none', background: 'transparent', color: T.dim, fontSize: 11.5, cursor: 'pointer', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          dock ↓
        </button>
      </div>
      <TerminalView className="hc-term" style={{ flex: 1, minHeight: 0, padding: '8px 10px' }} />
    </div>
  );
}
