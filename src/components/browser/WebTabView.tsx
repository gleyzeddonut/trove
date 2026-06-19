// A single web tab: an address toolbar (back/forward/reload + editable URL)
// over an Electron <webview>. Blank tabs show a start page until you enter a
// URL. The webview is process-isolated (no preload), so pages can't reach the
// app's shell bridges. Inactive tabs stay mounted but hidden, like a browser.

import { createElement, useEffect, useRef, useState } from 'react';
import { C, sans, mono, TABBAR_H } from '../../tokens';
import { normalizeAddress } from '../../lib/url';
import { useTroveStore, type BrowserTab } from '../../store/useTroveStore';

type WebviewEl = HTMLElement & {
  canGoBack(): boolean;
  canGoForward(): boolean;
  goBack(): void;
  goForward(): void;
  reload(): void;
  stop(): void;
  loadURL(url: string): void;
  getURL(): string;
};

interface FaviconEvent extends Event {
  favicons?: string[];
}

function ToolbarBtn({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      className="hv-gbtn"
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30, borderRadius: 8, border: 'none',
        background: 'transparent', color: C.sub, cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1, flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function StartPage({ onGo }: { onGo: (url: string) => void }) {
  const [v, setV] = useState('');
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, background: 'var(--tv-bg)' }}>
      <div style={{ fontFamily: sans, fontSize: 22, fontWeight: 800, letterSpacing: -0.6, color: C.ink }}>
        Open a page
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const u = normalizeAddress(v);
          if (u) onGo(u);
        }}
        style={{ display: 'flex', width: 'min(560px, 80%)', gap: 8 }}
      >
        <input
          autoFocus
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="Enter a URL or search…"
          style={{ flex: 1, fontFamily: sans, fontSize: 14, color: C.ink, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: '11px 15px', outline: 'none' }}
        />
        <button
          type="submit"
          style={{ fontFamily: sans, fontWeight: 700, fontSize: 13.5, color: '#fff', background: C.accent, border: 'none', borderRadius: 11, padding: '0 18px', cursor: 'pointer' }}
        >
          Go
        </button>
      </form>
    </div>
  );
}

export function WebTabView({ tab, active }: { tab: BrowserTab; active: boolean }) {
  const navigateTab = useTroveStore((s) => s.navigateTab);
  const setTabMeta = useTroveStore((s) => s.setTabMeta);
  const ref = useRef<WebviewEl | null>(null);
  const [addr, setAddr] = useState(tab.url);
  const [editing, setEditing] = useState(false);
  const [nav, setNav] = useState({ back: false, fwd: false, loading: false });

  // Reflect the live location into the address bar (unless the user is editing).
  useEffect(() => {
    if (!editing) setAddr(tab.url);
  }, [tab.url, editing]);

  // Wire webview lifecycle → store metadata + local nav state.
  useEffect(() => {
    const el = ref.current;
    if (!el || !tab.src) return;
    const onNavigate = () => {
      try {
        setTabMeta(tab.id, { url: el.getURL() });
        setNav({ back: el.canGoBack(), fwd: el.canGoForward(), loading: false });
      } catch {
        /* not ready */
      }
    };
    const onStart = () => setNav((n) => ({ ...n, loading: true }));
    const onTitle = (e: Event) => setTabMeta(tab.id, { title: (e as unknown as { title: string }).title });
    const onFav = (e: Event) => {
      const f = (e as FaviconEvent).favicons;
      if (f && f[0]) setTabMeta(tab.id, { favicon: f[0] });
    };
    el.addEventListener('did-navigate', onNavigate);
    el.addEventListener('did-navigate-in-page', onNavigate);
    el.addEventListener('did-start-loading', onStart);
    el.addEventListener('did-stop-loading', onNavigate);
    el.addEventListener('page-title-updated', onTitle);
    el.addEventListener('page-favicon-updated', onFav);
    return () => {
      el.removeEventListener('did-navigate', onNavigate);
      el.removeEventListener('did-navigate-in-page', onNavigate);
      el.removeEventListener('did-start-loading', onStart);
      el.removeEventListener('did-stop-loading', onNavigate);
      el.removeEventListener('page-title-updated', onTitle);
      el.removeEventListener('page-favicon-updated', onFav);
    };
  }, [tab.id, tab.src, setTabMeta]);

  const go = (raw: string) => {
    const url = normalizeAddress(raw);
    if (!url) return;
    setEditing(false);
    if (ref.current && tab.src) ref.current.loadURL(url);
    else navigateTab(tab.id, url); // first navigation from a blank tab → mounts the webview
  };

  return (
    <div
      style={{
        position: 'fixed', top: TABBAR_H, left: 0, right: 0, bottom: 0, zIndex: 80,
        display: active ? 'flex' : 'none', flexDirection: 'column', background: 'var(--tv-bg)',
      }}
    >
      {/* address toolbar */}
      <div style={{ height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px', borderBottom: `1px solid ${C.line2}` }}>
        <ToolbarBtn title="Back" disabled={!nav.back} onClick={() => ref.current?.goBack()}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </ToolbarBtn>
        <ToolbarBtn title="Forward" disabled={!nav.fwd} onClick={() => ref.current?.goForward()}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </ToolbarBtn>
        <ToolbarBtn title={nav.loading ? 'Stop' : 'Reload'} onClick={() => (nav.loading ? ref.current?.stop() : ref.current?.reload())}>
          {nav.loading
            ? <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5" /></svg>}
        </ToolbarBtn>
        <form
          onSubmit={(e) => { e.preventDefault(); go(addr); }}
          style={{ flex: 1, display: 'flex' }}
        >
          <input
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            onFocus={(e) => { setEditing(true); e.target.select(); }}
            onBlur={() => setEditing(false)}
            placeholder="Search or enter address"
            spellCheck={false}
            style={{ flex: 1, fontFamily: mono, fontSize: 12.5, color: C.ink, background: C.sunk, border: `1px solid ${C.line}`, borderRadius: 9, padding: '7px 13px', outline: 'none' }}
          />
        </form>
      </div>

      {tab.src
        ? createElement('webview', {
            ref,
            src: tab.src,
            partition: 'persist:trove-browser',
            style: { flex: 1, minHeight: 0, width: '100%', background: '#fff' },
          })
        : <StartPage onGo={go} />}
    </div>
  );
}
