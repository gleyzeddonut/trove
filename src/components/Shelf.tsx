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
import type { Shelf as ShelfDef } from '../data/shelves';
import type { Project } from '../types';

const PREVIEW = 12;

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
        <span style={{ fontSize: 18, lineHeight: 1 }}>{shelf.icon}</span>
        <h2 style={{ margin: 0, fontFamily: sans, fontSize: 17, fontWeight: 700, letterSpacing: -0.3, color: C.ink }}>{shelf.title}</h2>
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
