// One Discover shelf: a header (icon + title + "see all →") over a horizontal,
// lazily-loaded row of repo cards. It only fetches once it scrolls near the
// viewport (so the landing doesn't fire every shelf's search at once and trip
// GitHub's rate limit), and reuses the shared session search cache — so "see
// all" and revisits are instant. A shelf that errors or comes back empty hides
// itself.

import { useEffect, useState } from 'react';
import { C, sans, mono } from '../tokens';
import { ShelfCard } from './ShelfCard';
import { useGithubSearch } from '../lib/useGithub';
import type { Shelf as ShelfDef, ShelfIconId } from '../data/shelves';
import type { Project } from '../types';

const PREVIEW = 20;

// Custom duotone icon set echoing the splash gradient: a purple primary
// (currentColor) + a cyan accent (var(--ic2)). On the gradient lead tile, the
// tile flips --ic2 to translucent white so the glyph stays legible.
const ICN: Record<ShelfIconId, React.ReactNode> = {
  gem: (
    <>
      <path d="M4 9.5 12 21l8-11.5" fill="currentColor" fillOpacity=".16" />
      <path d="M4 9.5 12 21l8-11.5M4 9.5h16M8.5 9.5 12 21l3.5-11.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7.5 4h9l3.5 5.5H4L7.5 4Z" fill="var(--ic2)" fillOpacity=".9" stroke="var(--ic2)" strokeWidth="1.4" strokeLinejoin="round" />
    </>
  ),
  ai: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="3.2" fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9.5 2.5v3M14.5 2.5v3M9.5 18.5v3M14.5 18.5v3M2.5 9.5h3M2.5 14.5h3M18.5 9.5h3M18.5 14.5h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.4" fill="var(--ic2)" />
    </>
  ),
  terminal: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="3" fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 9.5 10.5 12 7 14.5" stroke="var(--ic2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.5 15h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  server: (
    <>
      <rect x="3" y="4" width="18" height="7" rx="2" fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="13" width="18" height="7" rx="2" fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="7" cy="7.5" r="1.15" fill="var(--ic2)" />
      <circle cx="7" cy="16.5" r="1.15" fill="var(--ic2)" />
      <path d="M11 7.5h6M11 16.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".5" />
    </>
  ),
  game: (
    <>
      <rect x="2.5" y="7.5" width="19" height="11" rx="4.5" fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 11.5v3M5.5 13h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="15.5" cy="12" r="1.4" fill="var(--ic2)" />
      <circle cx="18" cy="14.5" r="1.4" fill="currentColor" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5c0 4.6-3 7.6-7 9-4-1.4-7-4.4-7-9V6l7-3Z" fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.8 11.6l2.2 2.2 4.2-4.2" stroke="var(--ic2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  creative: (
    <>
      <circle cx="9.5" cy="9.5" r="5.2" fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="1.6" />
      <rect x="10.5" y="10.5" width="9" height="9" rx="2.2" fill="var(--ic2)" fillOpacity=".22" stroke="var(--ic2)" strokeWidth="1.6" />
    </>
  ),
  swap: (
    <>
      <path d="M4 8.5h12M4 8.5l3-3M4 8.5l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 15.5H8M20 15.5l-3-3M20 15.5l-3 3" stroke="var(--ic2)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

function ShelfIcon({ id }: { id: ShelfIconId }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      {ICN[id]}
    </svg>
  );
}

function CardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="tv-skelcard"
      style={{ width: 268, flexShrink: 0, boxSizing: 'border-box', background: C.panel, border: `1px solid ${C.line}`, borderRadius: 13, padding: 13, display: 'flex', flexDirection: 'column', gap: 11, ['--d' as string]: `${delay}s` } as React.CSSProperties}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div className="tv-skel" style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div className="tv-skel" style={{ width: '60%', height: 12 }} />
          <div className="tv-skel" style={{ width: '40%', height: 10 }} />
        </div>
      </div>
      <div className="tv-skel" style={{ width: '100%', height: 11 }} />
      <div className="tv-skel" style={{ width: '70%', height: 11 }} />
      <div className="tv-skel" style={{ width: 90, height: 11 }} />
    </div>
  );
}

// Progressive scan: a terminal status line that steps through fetch stages +
// a forward-only progress bar. Mounted only while a shelf is loading (so its
// timers clean up on resolve). The bar position is intentionally faked — GitHub
// gives no real progress — the point is that it always moves forward.
const STAGE_PCT = [14, 32, 52, 70, 84];
const LONG = [
  'still scanning — deep in the long tail',
  'sifting low-star, high-quality repos',
  'cross-checking metadata',
  'almost — holding out for the good ones',
];

function ScanStatus({ title }: { title: string }) {
  const [step, setStep] = useState(0);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const t = window.setInterval(() => setSecs((performance.now() - start) / 1000), 300);
    const a = window.setInterval(() => setStep((s) => s + 1), 720);
    return () => {
      window.clearInterval(t);
      window.clearInterval(a);
    };
  }, []);

  let registry = 0;
  try {
    registry = parseInt(localStorage.getItem('trove.registrySize') || '', 10) || 0;
  } catch {
    /* ignore */
  }
  const stages = [
    registry ? `searching ${registry.toLocaleString()} repos` : 'searching repositories',
    `matching “${title}”`,
    'ranking by stars & activity',
    'fetching repo metadata',
    'resolving install commands',
  ];
  const inStages = step < stages.length;
  const msg = inStages ? stages[step] : LONG[(step - stages.length) % LONG.length];
  const pct = inStages ? STAGE_PCT[step] : Math.min(95, 84 + (step - stages.length + 1) * 2.5);

  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: mono, fontSize: 12, color: C.faint, marginBottom: 8 }}>
        <span style={{ color: C.green }}>❯</span>
        <span>{msg}</span>
        <span className="tv-cursor" />
        {secs > 1 && <span style={{ marginLeft: 'auto' }}>{secs.toFixed(1)}s</span>}
      </div>
      <div className="tv-loadbar">
        <div className="tv-loadfill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Shelf({
  shelf,
  lead = false,
  onSeeAll,
  onOpenDetail,
  installedIds,
}: {
  shelf: ShelfDef;
  lead?: boolean;
  onSeeAll: (shelf: ShelfDef) => void;
  onOpenDetail: (p: Project) => void;
  installedIds: Set<string>;
}) {
  // Fetch eagerly from mount (the data layer throttles concurrency), so even a
  // fast scroll finds shelves already loading/loaded — not starting on arrival.
  const [enabled, setEnabled] = useState(true);
  // Wait one frame so the data hook has run its effect (a cache hit resolves
  // synchronously without ever flipping `loading`); lets us tell "no results
  // yet" from "confirmed empty" without flashing.
  const [probed, setProbed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const id = requestAnimationFrame(() => setProbed(true));
    return () => cancelAnimationFrame(id);
  }, [enabled]);

  const { results, loading, error } = useGithubSearch(shelf.query, enabled, shelf.sort, true);
  const items = results.slice(0, PREVIEW);
  const showCards = items.length > 0;

  // "Resolved" = results arrived, an error occurred, or a fetch settled with
  // nothing (loading false after we've given it a frame). Until then we show
  // skeletons rather than hiding, so a cached revisit paints its cards.
  const resolved = showCards || !!error || (probed && !loading);
  // Hide only a shelf that genuinely resolved *empty* — never on a (usually
  // transient) error, which would make rows vanish. display:none keeps it
  // mounted so it collapses without leaving a gap.
  const hide = resolved && !error && items.length === 0;
  const showError = !loading && !!error && items.length === 0;

  // Re-run the fetch (errors aren't cached, so toggling enabled refetches).
  const retry = () => {
    setEnabled(false);
    requestAnimationFrame(() => setEnabled(true));
  };

  // The first shelf to show real content dismisses the boot splash — so it
  // holds until the storefront actually has cards behind it (the splash dedupes
  // and has its own min/max timing).
  useEffect(() => {
    if (showCards) window.__troveBootReady?.();
  }, [showCards]);

  return (
    <section style={{ display: hide ? 'none' : 'block', marginTop: 30 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13 }}>
        <span
          className="hs-tip hs-shelfhead"
          data-tip={shelf.description}
          role="link"
          tabIndex={0}
          aria-label={`See all ${shelf.title}`}
          onClick={() => onSeeAll(shelf)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSeeAll(shelf))}
          style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        >
          <span
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              ...(lead
                ? { background: 'linear-gradient(135deg,#8e7df1,#06b6d4)', color: '#fff', boxShadow: '0 4px 14px rgba(123,97,255,.32)', '--ic2': 'rgba(255,255,255,.78)' }
                : { background: C.accentSoft, color: C.accent, '--ic2': '#06b6d4' }),
            } as React.CSSProperties}
          >
            <ShelfIcon id={shelf.icon} />
          </span>
          <h2 style={{ margin: 0, fontFamily: sans, fontSize: 17, fontWeight: 700, letterSpacing: -0.3, color: C.ink }}>{shelf.title}</h2>
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => onSeeAll(shelf)}
          className="hs-seeall"
          style={{ border: 'none', background: 'transparent', color: C.accent, fontFamily: sans, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}
        >
          see all →
        </button>
      </div>

      {/* progressive scan status while loading (before any cards) */}
      {!showCards && !showError && <ScanStatus title={shelf.title} />}

      {/* horizontal row */}
      {showError ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: sans, fontSize: 13, color: C.faint, padding: '8px 2px' }}>
          Couldn't load this shelf.
          <button
            onClick={retry}
            className="hs-seeall"
            style={{ border: 'none', background: 'transparent', color: C.accent, fontFamily: sans, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="hv-scroll" style={{ display: 'flex', gap: 13, overflowX: 'auto', paddingBottom: 6, scrollSnapType: 'x proximity' }}>
          {showCards
            ? items.map((p, i) => (
                <div key={p.id} className="tv-cardin" style={{ scrollSnapAlign: 'start', animationDelay: `${Math.min(i, 10) * 0.05}s` }}>
                  <ShelfCard p={p} installed={installedIds.has(p.id)} onOpenDetail={onOpenDetail} />
                </div>
              ))
            : Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} delay={i * 0.16} />)}
        </div>
      )}
    </section>
  );
}
