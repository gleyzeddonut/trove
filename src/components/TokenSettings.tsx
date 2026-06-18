// Account/token popover behind the nav avatar. Persists a GitHub token to
// localStorage (survives restarts); github.ts reads it with priority over the
// env var. Saving reloads so every open hook refetches with the new token.

import { useEffect, useRef, useState } from 'react';
import { C, mono, sans } from '../tokens';

const LS = 'trove.ghtoken';

const localToken = (): string => {
  try {
    return localStorage.getItem(LS) || '';
  } catch {
    return '';
  }
};

const anyToken = (): string => localToken() || window.troveEnv?.githubToken || '';

export function TokenSettings() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  const hasLocal = !!localToken();
  const authed = !!anyToken();
  const fromEnvOnly = authed && !hasLocal;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const save = () => {
    const v = value.trim();
    if (!v) return;
    try {
      localStorage.setItem(LS, v);
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  const clear = () => {
    try {
      localStorage.removeItem(LS);
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="GitHub token settings"
        aria-expanded={open}
        title={authed ? 'Authenticated — GitHub token set' : 'Set a GitHub token'}
        style={{
          width: 31, height: 31, borderRadius: 31, border: 'none', padding: 0, cursor: 'pointer',
          background: 'linear-gradient(135deg,#16a34a,#0d9488)',
          boxShadow: authed
            ? `inset 0 0 0 1px rgba(255,255,255,.2), 0 0 0 2px ${C.bg}, 0 0 0 3.5px ${C.green}`
            : 'inset 0 0 0 1px rgba(255,255,255,.2)',
        }}
      />

      {open && (
        <div
          style={{
            position: 'absolute', top: 44, right: 0, width: 300, zIndex: 60,
            background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14,
            boxShadow: '0 18px 50px rgba(0,0,0,.45)', padding: 14, fontFamily: sans,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>GitHub token</span>
            <button onClick={() => setOpen(false)} aria-label="Close" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: C.faint, fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, fontFamily: mono, fontSize: 11.5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 7, background: authed ? C.green : C.faint, boxShadow: authed ? `0 0 7px ${C.green}` : 'none', flexShrink: 0 }} />
            <span style={{ color: authed ? C.green : C.faint }}>
              {authed ? 'Authenticated · 5,000 req/hr' : 'Anonymous · 60 req/hr'}
            </span>
          </div>

          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={hasLocal ? '•••••••• saved — paste to replace' : 'github_pat_… or ghp_…'}
            spellCheck={false}
            autoComplete="off"
            onKeyDown={(e) => e.key === 'Enter' && save()}
            style={{ width: '100%', boxSizing: 'border-box', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: 9, padding: '8px 10px', color: C.ink, fontFamily: mono, fontSize: 12, outline: 'none' }}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              onClick={save}
              disabled={!value.trim()}
              style={{ flex: 1, border: 'none', background: C.accent, color: '#fff', fontFamily: sans, fontWeight: 700, fontSize: 13, padding: '8px', borderRadius: 9, cursor: value.trim() ? 'pointer' : 'default', opacity: value.trim() ? 1 : 0.5 }}
            >
              Save & reload
            </button>
            {hasLocal && (
              <button onClick={clear} style={{ border: `1px solid ${C.line}`, background: 'transparent', color: C.sub, fontFamily: sans, fontWeight: 600, fontSize: 13, padding: '8px 14px', borderRadius: 9, cursor: 'pointer' }}>
                Clear
              </button>
            )}
          </div>

          <div style={{ marginTop: 10, fontSize: 11.5, lineHeight: 1.5, color: C.faint }}>
            {fromEnvOnly
              ? 'Using the token from your terminal session. Paste it here to keep it across restarts.'
              : 'Stored locally on this device, used only to call GitHub. A read-only public token is enough.'}
          </div>
        </div>
      )}
    </div>
  );
}
