// Persistent top navigation. Tabs filter Discover by type; Library shows a
// count badge of installed items and routes to /library.

import { useNavigate } from 'react-router-dom';
import { C, mono, sans } from '../tokens';
import { UpdateButton } from './UpdateButton';
import { useTroveStore } from '../store/useTroveStore';

export type NavItem = 'Discover' | 'Feed' | 'Apps' | 'Tools' | 'Creative' | 'Library';

const ITEMS: NavItem[] = ['Discover', 'Feed', 'Apps', 'Tools', 'Creative', 'Library'];

interface NavProps {
  active: NavItem | null;
  consoleOpen: boolean;
  libraryCount: number;
  onToggleConsole: () => void;
  onHome: () => void;
  onNav: (item: NavItem) => void;
}

export function Nav({ active, consoleOpen, libraryCount, onToggleConsole, onHome, onNav }: NavProps) {
  const navigate = useNavigate();
  const account = useTroveStore((s) => s.account);
  return (
    <div
      style={{
        position: 'sticky', top: 0, zIndex: 20, height: 60,
        borderBottom: `1px solid ${C.line2}`, background: 'var(--tv-navbg)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', padding: '0 28px', gap: 24,
      }}
    >
      <div
        role="link"
        tabIndex={0}
        onClick={onHome}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onHome())}
        style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}
      >
        <img src="./trove-icon.png" alt="" width={25} height={25} style={{ width: 25, height: 25, borderRadius: 7, display: 'block' }} />
        <span style={{ fontFamily: sans, fontWeight: 800, fontSize: 18, letterSpacing: -0.5, color: C.ink }}>Trove</span>
      </div>

      <div style={{ display: 'flex', gap: 2 }}>
        {ITEMS.map((n) => {
          const isActive = n === active;
          return (
            <button
              key={n}
              className="hs-navlink"
              onClick={() => onNav(n)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, fontFamily: sans, fontSize: 13.5,
                fontWeight: isActive ? 700 : 500, color: isActive ? C.ink : C.sub,
                padding: '7px 12px', borderRadius: 9, border: 'none',
                background: isActive ? C.panel : 'transparent',
              }}
            >
              {n}
              {n === 'Library' && libraryCount > 0 && (
                <span
                  style={{
                    fontFamily: mono, fontSize: 10.5, fontWeight: 700,
                    color: isActive ? C.ink : C.green,
                    background: isActive ? C.bg : 'rgba(63,185,80,.14)',
                    borderRadius: 20, padding: '1px 7px',
                  }}
                >
                  {libraryCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />

      <UpdateButton />

      <button
        className="hs-chip"
        onClick={onToggleConsole}
        aria-pressed={consoleOpen}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: consoleOpen ? '#000' : C.panel,
          border: `1px solid ${consoleOpen ? '#2B3340' : C.line}`,
          borderRadius: 10, padding: '8px 13px', fontFamily: mono, fontSize: 12.5,
          color: C.green, fontWeight: 600, cursor: 'pointer',
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: 7, background: C.green, boxShadow: `0 0 7px ${C.green}` }} />
        console
        <span style={{ fontFamily: mono, fontSize: 11, color: C.faint, border: `1px solid ${C.line}`, borderRadius: 5, padding: '1px 5px' }}>⌘J</span>
      </button>

      <button
        onClick={() => navigate('/settings')}
        aria-label="Settings & account"
        title={account ? `@${account.login} — Settings` : 'Connect GitHub · Settings'}
        style={{ position: 'relative', width: 31, height: 31, borderRadius: 31, border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, overflow: 'visible', background: 'transparent' }}
      >
        {account ? (
          <img src={account.avatarUrl} alt="" width={31} height={31} style={{ width: 31, height: 31, borderRadius: 31, objectFit: 'cover', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.2)' }} />
        ) : (
          <>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 31, height: 31, borderRadius: 31, background: C.panel, border: `1px solid ${C.line}` }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={C.sub} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="6" r="2.6" />
                <path d="M3 13c0-2.2 2.2-3.6 5-3.6s5 1.4 5 3.6" />
              </svg>
            </span>
            <span style={{ position: 'absolute', top: -1, right: -1, width: 9, height: 9, borderRadius: 9, background: C.amber, boxShadow: `0 0 0 2px ${C.bg}` }} />
          </>
        )}
      </button>
    </div>
  );
}
