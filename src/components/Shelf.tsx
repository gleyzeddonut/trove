// One Discover shelf: a header (icon + title + "see all →") over a horizontal,
// lazily-loaded row of repo cards. It only fetches once it scrolls near the
// viewport (so the landing doesn't fire every shelf's search at once and trip
// GitHub's rate limit), and reuses the shared session search cache — so "see
// all" and revisits are instant. A shelf that errors or comes back empty hides
// itself.

import { useEffect, useRef, useState } from 'react';
import { C, sans } from '../tokens';
import { ShelfCard } from './ShelfCard';
import { useGithubSearch } from '../lib/useGithub';
import type { Shelf as ShelfDef, ShelfIconId } from '../data/shelves';
import type { Project } from '../types';

const PREVIEW = 12;

// Stroke icons matching the app's icon language (Lucide-style), in place of
// emojis so the headers stay on-theme. Rendered in the accent color.
function ShelfIcon({ id }: { id: ShelfIconId }) {
  const p = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (id) {
    case 'gem':
      return <svg {...p}><path d="M6 3h12l4 6-10 13L2 9Z" /><path d="M11 3 8 9l4 13 4-13-3-6" /><path d="M2 9h20" /></svg>;
    case 'ai':
      return <svg {...p}><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>;
    case 'terminal':
      return <svg {...p}><path d="m4 17 6-6-6-6" /><path d="M12 19h8" /></svg>;
    case 'server':
      return <svg {...p}><rect width="20" height="8" x="2" y="2" rx="2" /><rect width="20" height="8" x="2" y="14" rx="2" /><path d="M6 6h.01" /><path d="M6 18h.01" /></svg>;
    case 'game':
      return <svg {...p}><line x1="6" x2="10" y1="12" y2="12" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="15" x2="15.01" y1="13" y2="13" /><line x1="18" x2="18.01" y1="11" y2="11" /><rect width="20" height="12" x="2" y="6" rx="2" /></svg>;
    case 'shield':
      return <svg {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></svg>;
    case 'creative':
      return <svg {...p}><path d="M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z" /><rect x="3" y="14" width="7" height="7" rx="1" /><circle cx="17.5" cy="17.5" r="3.5" /></svg>;
    case 'swap':
      return <svg {...p}><path d="m2 9 3-3 3 3" /><path d="M13 18H7a2 2 0 0 1-2-2V6" /><path d="m22 15-3 3-3-3" /><path d="M11 6h6a2 2 0 0 1 2 2v10" /></svg>;
    default:
      return null;
  }
}

function CardSkeleton() {
  return (
    <div style={{ width: 268, flexShrink: 0, boxSizing: 'border-box', background: C.panel, border: `1px solid ${C.line}`, borderRadius: 13, padding: 13, display: 'flex', flexDirection: 'column', gap: 11 }}>
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

export function Shelf({
  shelf,
  onSeeAll,
  onOpenDetail,
  installedIds,
}: {
  shelf: ShelfDef;
  onSeeAll: (shelf: ShelfDef) => void;
  onOpenDetail: (p: Project) => void;
  installedIds: Set<string>;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  // Once visible, wait one frame so the data hook has run its effect (a cache
  // hit resolves synchronously without ever flipping `loading`). This lets us
  // tell "no results yet" from "confirmed empty" without flashing.
  const [probed, setProbed] = useState(false);

  // Fetch only once the row scrolls near the viewport.
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const id = requestAnimationFrame(() => setProbed(true));
    return () => cancelAnimationFrame(id);
  }, [visible]);

  const { results, loading, error } = useGithubSearch(shelf.query, visible, shelf.sort);
  const items = results.slice(0, PREVIEW);
  const showCards = items.length > 0;

  // "Resolved" = results arrived, an error occurred, or a fetch settled with
  // nothing (loading false after we've given it a frame). Until then we show
  // skeletons rather than hiding, so a cached revisit paints its cards.
  const resolved = showCards || !!error || (probed && !loading);
  // Hide a shelf that resolved empty (kept mounted, display:none, so it
  // collapses without a gap and the observer stays valid).
  const hide = visible && resolved && items.length === 0;

  // The first shelf to show real content dismisses the boot splash — so it
  // holds until the storefront actually has cards behind it (the splash dedupes
  // and has its own min/max timing).
  useEffect(() => {
    if (showCards) window.__troveBootReady?.();
  }, [showCards]);

  return (
    <section ref={ref} style={{ display: hide ? 'none' : 'block', marginTop: 30 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13 }}>
        <span className="hs-tip" data-tip={shelf.description} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, cursor: 'default' }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: C.accentSoft, color: C.accent, flexShrink: 0 }}>
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

      {/* horizontal row */}
      <div className="hv-scroll" style={{ display: 'flex', gap: 13, overflowX: 'auto', paddingBottom: 6, scrollSnapType: 'x proximity' }}>
        {showCards
          ? items.map((p) => (
              <div key={p.id} style={{ scrollSnapAlign: 'start' }}>
                <ShelfCard p={p} installed={installedIds.has(p.id)} onOpenDetail={onOpenDetail} />
              </div>
            ))
          : Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </section>
  );
}
