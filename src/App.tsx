// App shell: routes + the persistent console dock. Page content gets bottom
// padding equal to the visible dock height so nothing is hidden behind it.

import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CONSOLE_COLLAPSED_H, CONSOLE_OPEN_H } from './tokens';
import { Storefront } from './pages/Storefront';
import { Detail } from './pages/Detail';
import { Feed } from './pages/Feed';
import { Creator } from './pages/Creator';
import { Console } from './components/console/Console';
import { useTroveStore } from './store/useTroveStore';

export default function App() {
  const consoleOpen = useTroveStore((s) => s.consoleOpen);
  const setConsoleOpen = useTroveStore((s) => s.setConsoleOpen);
  const toggleConsole = useTroveStore((s) => s.toggleConsole);

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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        toggleConsole();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('trove-search')?.focus();
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
  }, [setConsoleOpen, toggleConsole]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0A0C10',
        paddingBottom: consoleOpen ? CONSOLE_OPEN_H : CONSOLE_COLLAPSED_H,
        transition: 'padding-bottom .28s cubic-bezier(.4,0,.1,1)',
      }}
    >
      <Routes>
        <Route path="/" element={<Storefront mode="discover" />} />
        <Route path="/library" element={<Storefront mode="library" />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/c/:handle" element={<Creator />} />
        <Route path="/p/:owner/:repo" element={<Detail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Console />
    </div>
  );
}
