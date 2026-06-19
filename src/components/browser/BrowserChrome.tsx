// The browser-chrome tab strip pinned at the top of the window (the place a
// browser's tabs live). The Trove "app zone" is pinned on the left — it wraps
// the macOS traffic lights (frameless window) + the brand lockup and reads as
// "this window IS Trove"; it can't be closed. After it come web tabs and a +
// to open a new one. The whole strip is the window drag region; interactive
// bits opt out with -webkit-app-region: no-drag.

import { C, sans, TABBAR_H } from '../../tokens';
import { useTroveStore } from '../../store/useTroveStore';
import { useNavActions } from '../../lib/useNavActions';

const drag = { WebkitAppRegion: 'drag' } as React.CSSProperties;
const noDrag = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

// Leaves room for the native traffic lights (positioned at x≈16 in main.ts).
const LIGHTS_W = 82;

function AppZone({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      title="Trove — your installed app"
      style={{
        ...noDrag,
        alignSelf: 'stretch', display: 'flex', alignItems: 'center', gap: 9,
        paddingLeft: LIGHTS_W, paddingRight: 16, cursor: 'pointer',
        borderRadius: '0 12px 12px 0',
        background: active ? 'var(--tv-accentSoft)' : 'transparent',
        boxShadow: active ? `inset 0 -2.5px 0 ${C.accent}` : 'none',
        borderRight: `1px solid ${C.line2}`,
      }}
    >
      {/* Same lockup as the nav used to show: the real app icon + wordmark. */}
      <img src="./trove-icon.png" alt="" width={25} height={25} style={{ width: 25, height: 25, borderRadius: 7, display: 'block' }} />
      <span style={{ fontFamily: sans, fontWeight: 800, fontSize: 18, letterSpacing: -0.5, color: C.ink }}>Trove</span>
      <span title="running" style={{ width: 6, height: 6, borderRadius: 6, background: C.green, boxShadow: `0 0 6px ${C.green}`, marginLeft: 1 }} />
    </div>
  );
}

function WebTab({
  title,
  favicon,
  active,
  onClick,
  onClose,
}: {
  title: string;
  favicon: string;
  active: boolean;
  onClick: () => void;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClick}
      title={title}
      style={{
        ...noDrag,
        position: 'relative', height: 34, alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 10px 0 12px', minWidth: 130, maxWidth: 220, cursor: 'pointer',
        background: active ? 'var(--tv-bg)' : 'transparent',
        border: active ? `1px solid ${C.line}` : '1px solid transparent',
        borderBottom: 'none', borderRadius: '10px 10px 0 0',
      }}
    >
      {favicon
        ? <img src={favicon} alt="" width={15} height={15} style={{ borderRadius: 4, flexShrink: 0 }} />
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.faint} strokeWidth="1.8" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" /></svg>}
      <span style={{ flex: 1, fontFamily: sans, fontSize: 12.5, fontWeight: active ? 600 : 500, color: active ? C.ink : C.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {title || 'New Tab'}
      </span>
      <span
        className="hv-gbtn"
        title="Close tab"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 5, color: C.faint, flexShrink: 0 }}
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
      </span>
    </div>
  );
}

export function BrowserChrome() {
  const tabs = useTroveStore((s) => s.tabs);
  const activeTabId = useTroveStore((s) => s.activeTabId);
  const activateTab = useTroveStore((s) => s.activateTab);
  const closeTab = useTroveStore((s) => s.closeTab);
  const openTab = useTroveStore((s) => s.openTab);
  const { onHome } = useNavActions();

  // Clicking the brand returns to the Trove tab; if already there, it goes home.
  const onAppZone = () => {
    if (activeTabId !== null) activateTab(null);
    else onHome();
  };

  return (
    <div
      style={{
        ...drag,
        position: 'fixed', top: 0, left: 0, right: 0, height: TABBAR_H, zIndex: 90,
        display: 'flex', alignItems: 'flex-end', gap: 2,
        background: 'var(--tv-navbg)', backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${C.line2}`, paddingRight: 10,
      }}
    >
      <AppZone active={activeTabId === null} onClick={onAppZone} />
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, paddingLeft: 8, paddingBottom: 0, height: '100%', flex: 1, overflow: 'hidden' }}>
        {tabs.map((t) => (
          <WebTab
            key={t.id}
            title={t.title}
            favicon={t.favicon}
            active={t.id === activeTabId}
            onClick={() => activateTab(t.id)}
            onClose={() => closeTab(t.id)}
          />
        ))}
        <button
          className="hv-gbtn"
          title="New tab"
          onClick={() => openTab()}
          style={{ ...noDrag, alignSelf: 'center', marginLeft: 6, width: 28, height: 28, borderRadius: 28, border: 'none', background: 'transparent', color: C.sub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <span style={{ ...drag, flex: 1, alignSelf: 'stretch' }} />
      </div>
    </div>
  );
}
