// A small "Sort: <option> ▾" dropdown used on Discover / Library. Closes on
// outside-click or Escape.

import { useEffect, useRef, useState } from 'react';
import { C, sans } from '../tokens';

export interface SortOption<T extends string> {
  value: T;
  label: string;
}

export function SortMenu<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: SortOption<T>[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ fontFamily: sans, fontSize: 13, color: C.faint, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: 0 }}
      >
        Sort: <span style={{ color: C.sub }}>{current.label}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div
          role="menu"
          style={{ position: 'absolute', top: 'calc(100% + 7px)', right: 0, zIndex: 30, minWidth: 184, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11, padding: 5, boxShadow: '0 14px 40px rgba(0,0,0,.32)' }}
        >
          {options.map((o) => {
            const sel = o.value === value;
            return (
              <button
                key={o.value}
                role="menuitemradio"
                aria-checked={sel}
                className="tv-menuitem"
                onClick={() => { onChange(o.value); setOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%', textAlign: 'left', fontFamily: sans, fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? C.ink : C.sub, background: sel ? 'var(--tv-panelHover)' : 'transparent', border: 'none', borderRadius: 8, padding: '8px 11px', cursor: 'pointer' }}
              >
                {o.label}
                {sel && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
