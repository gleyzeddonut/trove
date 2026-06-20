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
  // Becomes true once a fetch has actually started, so we don't treat the
  // not-yet-fetched frame (visible, but loading hasn't flipped) as "empty".
  const fetched = useRef(false);

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

  const { results, loading, error } = useGithubSearch(shelf.query, visible, shelf.sort);
  if (loading) fetched.current = true;
  const items = results.slice(0, PREVIEW);
  const settled = visible && fetched.current && !loading;

  // Hide a shelf that loaded with nothing to show (kept mounted, display:none,
  // so it collapses without leaving a gap and the observer stays valid).
  const hide = settled && (!!error || items.length === 0);

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
        {settled
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
