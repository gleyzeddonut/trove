// Persistent top navigation. Tabs filter Discover by type; Library shows a
// count badge of installed items and routes to /library.

import { useNavigate } from 'react-router-dom';
import { C, mono, sans, TABBAR_H } from '../tokens';
import { UpdateButton } from './UpdateButton';
import { useTroveStore } from '../store/useTroveStore';
import { useHistoryNav } from '../lib/useHistoryNav';

// Type filtering (App/Tool/Creative) lives in the chips under the search bar,
// so the top nav is just the three top-level destinations.
export type NavItem = 'Discover' | 'Feed' | 'Library';

const ITEMS: NavItem[] = ['Discover', 'Feed', 'Library'];

interface NavProps {
  active: NavItem | null;
  libraryCount: number;
  onNav: (item: NavItem) => void;
}

function NavArrow({ dir, disabled, onClick }: { dir: 'back' | 'forward'; disabled: boolean; onClick: () => void }) {
  return (
    <button
      className="hs-navlink"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'back' ? 'Back' : 'Forward'}
      title={dir === 'back' ? 'Back' : 'Forward'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30,
        borderRadius: 8, border: 'none', background: 'transparent',
        color: disabled ? C.faint : C.sub, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
      }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir === 'back' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
      </svg>
    </button>
  );
}

export function Nav({ active, libraryCount, onNav }: NavProps) {
  const navigate = useNavigate();
  const account = useTroveStore((s) => s.account);
  const { canBack, canForward, back, forward } = useHistoryNav();
  return (
    <div
      style={{
        position: 'sticky', top: TABBAR_H, zIndex: 20, height: 60,
        borderBottom: `1px solid ${C.line2}`, background: 'var(--tv-navbg)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', padding: '0 28px', gap: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: -6 }}>
        <NavArrow dir="back" disabled={!canBack} onClick={back} />
        <NavArrow dir="forward" disabled={!canForward} onClick={forward} />
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
