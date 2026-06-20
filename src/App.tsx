// App shell: routes + the persistent console dock. Page content gets bottom
// padding equal to the visible dock height so nothing is hidden behind it.

import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CONSOLE_COLLAPSED_H, TABBAR_H } from './tokens';
import { Storefront } from './pages/Storefront';
import { Detail } from './pages/Detail';
import { Feed } from './pages/Feed';
import { Creator } from './pages/Creator';
import { Settings } from './pages/Settings';
import { TerminalWindow } from './pages/TerminalWindow';
import { Console } from './components/console/Console';
import { MediaDock } from './components/MediaDock';
import { BrowserChrome } from './components/browser/BrowserChrome';
import { WebTabView } from './components/browser/WebTabView';
import { useTroveStore } from './store/useTroveStore';
import { applyTheme } from './lib/settings';
import { fetchRegistrySize } from './data/github';

export default function App() {
  const consoleOpen = useTroveStore((s) => s.consoleOpen);
  const consoleHeight = useTroveStore((s) => s.consoleHeight);
  const setConsoleOpen = useTroveStore((s) => s.setConsoleOpen);
  const toggleConsole = useTroveStore((s) => s.toggleConsole);
  const settings = useTroveStore((s) => s.settings);
  const themeTick = useTroveStore((s) => s.themeTick);
  const dockOpen = useTroveStore((s) => !!s.video);
  const dockWidth = useTroveStore((s) => s.dockWidth);
  const tabs = useTroveStore((s) => s.tabs);
  const activeTabId = useTroveStore((s) => s.activeTabId);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Apply the theme on boot, hydrate the GitHub account, and re-apply theme on
  // OS scheme changes while in "system" mode.
  useEffect(() => {
    applyTheme(useTroveStore.getState().settings);
    useTroveStore.getState().hydrateAccount();

    // Refresh the real registry size for the next launch's boot splash.
    fetchRegistrySize()
      .then((n) => {
        if (n > 0) localStorage.setItem('trove.registrySize', String(n));
      })
      .catch(() => {
        /* offline / rate-limited — keep last value */
      });

    // Sync theme across windows (e.g. the popped-out terminal) — the other
    // window changing settings fires a `storage` event here.
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'trove.settings.v1') useTroveStore.getState().reloadSettings();
    };
    window.addEventListener('storage', onStorage);

    // Re-apply theme on OS scheme changes while in "system" mode.
    const mq = window.matchMedia?.('(prefers-color-scheme: light)');
    const onChange = () => {
      const st = useTroveStore.getState();
      if (st.settings.theme === 'system') {
        applyTheme(st.settings);
        st.bumpTheme();
      }
    };
    mq?.addEventListener('change', onChange);

    return () => {
      window.removeEventListener('storage', onStorage);
      mq?.removeEventListener('change', onChange);
    };
  }, []);

  // Mirror pop-out state from the main process into the store.
  useEffect(() => {
    const t = window.troveTerminal;
    if (!t) return;
    return t.onPopState((v) => useTroveStore.getState().setPoppedOut(v));
  }, []);

  // Links inside a web tab that try to open a new window become new tabs.
  useEffect(() => {
    const b = window.troveBrowser;
    if (!b) return;
    return b.onNewTab((url) => useTroveStore.getState().openTab(url));
  }, []);

  // Auto-update: mirror main-process status into the store, and once a
  // user-requested download finishes, install + relaunch.
  useEffect(() => {
    const u = window.troveUpdater;
    if (!u) return;
    return u.onStatus((s) => {
      useTroveStore.getState().setUpdate(s);
      if (s.status === 'downloaded' && useTroveStore.getState().installOnReady) u.install();
    });
  }, []);

  // Global keyboard shortcuts:
  //   ⌘/Ctrl+J or ` → toggle console · ⌘/Ctrl+K → focus search · Esc → minimize
  useEffect(() => {
    const isTyping = () => {
      const a = document.activeElement;
      return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA');
    };
    const onKey = (e: KeyboardEvent) => {
      // A web tab is its own context — don't let these drive the hidden app.
      if (useTroveStore.getState().activeTabId !== null) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        toggleConsole();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('trove-search')?.focus();
      } else if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        // ⌘, → Settings (the macOS Preferences shortcut). Not in the popout.
        e.preventDefault();
        if (window.location.hash !== '#/__terminal') navigate('/settings');
      } else if (e.key === 'Escape' && !isTyping()) {
        // Don't swallow Esc while the shell or a field is focused — it's
        // meaningful inside the terminal (vim, prompts, etc.).
        setConsoleOpen(false);
      } else if (e.key === '`' && !isTyping()) {
        e.preventDefault();
        toggleConsole();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setConsoleOpen, toggleConsole, navigate]);

  // The popped-out window renders only the terminal — no chrome, nav, or dock.
  if (pathname === '/__terminal') return <TerminalWindow />;

  return (
    <>
      <BrowserChrome />

      {/* The Trove app — the pinned tab. Stays mounted under the web tabs so
          its scroll/console/route survive tab switches; the web-tab overlays
          (z-index 80) cover it when one is active. */}
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--tv-bg)',
          paddingTop: TABBAR_H,
          paddingBottom: consoleOpen ? consoleHeight : CONSOLE_COLLAPSED_H,
          // Make room for the right video dock so content isn't hidden behind it.
          paddingRight: dockOpen ? dockWidth : 0,
          transition: 'padding-bottom .28s cubic-bezier(.4,0,.1,1), padding-right .2s cubic-bezier(.4,0,.1,1)',
        }}
      >
        {/* Remount the routed tree on theme/accent change so inline var()-based
            styles re-resolve (see handoff §12). Density is CSS-only (no remount). */}
        <div className="tv-main" key={`${settings.theme}:${settings.accent}:${themeTick}`}>
          <Routes>
            <Route path="/" element={<Storefront mode="discover" />} />
            <Route path="/library" element={<Storefront mode="library" />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/c/:handle" element={<Creator />} />
            <Route path="/p/:owner/:repo" element={<Detail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Console />
        <MediaDock />
      </div>

      {/* Web tabs: mounted while open (preserving their pages), shown when active. */}
      {tabs.map((t) => (
        <WebTabView key={t.id} tab={t} active={t.id === activeTabId} />
      ))}
    </>
  );
}
