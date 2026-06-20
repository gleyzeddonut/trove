// The storefront surface — shared by Discover (`/`) and Library (`/library`).
// Discover pulls live repositories from GitHub; Library reads the persisted
// set of installed projects. Search, type chips, results, empty/loading/error.

import { useEffect } from 'react';
import { C, mono, sans } from '../tokens';
import { Nav, type NavItem } from '../components/Nav';
import { TypeChip } from '../components/TypeChip';
import { ProjectRow } from '../components/ProjectRow';
import { Shelf } from '../components/Shelf';
import { SortMenu } from '../components/SortMenu';
import { Box, SearchIcon } from '../components/icons';
import { TROVE_TYPES } from '../data/constants';
import { SHELVES, type Shelf as ShelfDef } from '../data/shelves';
import { troveMatch } from '../data/match';
import { useGithubSearch } from '../lib/useGithub';
import { useTroveStore } from '../store/useTroveStore';
import { useNavActions } from '../lib/useNavActions';
import type { Project, TypeFilter } from '../types';

const TYPES: TypeFilter[] = ['All', ...TROVE_TYPES];

// Library sorting is local. "Recent" = most-recently installed first (the
// installed array is append-ordered).
function sortLibrary(items: Project[], sort: 'recent' | 'stars' | 'name'): Project[] {
  if (sort === 'recent') return [...items].reverse();
  if (sort === 'stars') return [...items].sort((a, b) => b.starsNum - a.starsNum);
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

export function Storefront({ mode }: { mode: 'discover' | 'library' }) {
  const isLib = mode === 'library';

  const query = useTroveStore((s) => s.query);
  const setQuery = useTroveStore((s) => s.setQuery);
  const typeFilter = useTroveStore((s) => s.typeFilter);
  const setType = useTroveStore((s) => s.setType);
  const discoverSort = useTroveStore((s) => s.discoverSort);
  const setDiscoverSort = useTroveStore((s) => s.setDiscoverSort);
  const librarySort = useTroveStore((s) => s.librarySort);
  const setLibrarySort = useTroveStore((s) => s.setLibrarySort);
  const installed = useTroveStore((s) => s.installed);
  const install = useTroveStore((s) => s.install);
  const open = useTroveStore((s) => s.open);
  const uninstall = useTroveStore((s) => s.uninstall);

  const { onNav, onOpenDetail } = useNavActions();

  // Discover hits GitHub (server-side search); Library is purely local. The
  // flat-list search only runs for Discover *with a query* — the no-query
  // landing shows curated shelves (each its own search) instead.
  const q = query.trim();
  // "Best match" (GitHub relevance) only means something with a query; with no
  // search it'd just be ranking the default popular set, so fall back to stars.
  const effectiveSort = !q && discoverSort === 'best' ? 'stars' : discoverSort;
  const { results: remote, total, loading, loadingMore, error, hasMore, loadMore } = useGithubSearch(query, !isLib && !!q, effectiveSort);

  // Dismiss the boot splash once there's real content behind it. On Discover's
  // landing that's the shelves (each Shelf signals when its cards load); for
  // Library / a search, it's this flat list settling. (The splash dedupes and
  // has its own min/max timing, so multiple calls are fine.)
  useEffect(() => {
    // On Discover's landing (no query) the shelves signal readiness themselves.
    const onLanding = !isLib && !q;
    if (!onLanding && !loading) window.__troveBootReady?.();
  }, [isLib, q, loading]);

  const installedIds = new Set(installed.map((p) => p.id));

  // Discover searched server-side (no client-side category filter anymore);
  // Library filters locally by query+type, then sorts by the chosen key.
  const base: Project[] = isLib ? installed : remote;
  const results = isLib
    ? sortLibrary(base.filter((p) => troveMatch(p, query, typeFilter)), librarySort)
    : base;

  const typeCount = (t: TypeFilter) =>
    t === 'All' ? base.length : base.filter((p) => p.type === t).length;
  const installedCount = installed.length;

  // Discover's no-search landing shows curated shelves instead of a list.
  const showShelves = !isLib && !q;

  // "See all" on a shelf runs its query in the flat list (shared cache key, so
  // it paints instantly), then paginates the full category.
  const onSeeAll = (shelf: ShelfDef) => {
    setDiscoverSort(shelf.sort);
    setQuery(shelf.query);
    requestAnimationFrame(() => window.scrollTo(0, 0));
  };

  // Type is reflected by the chips now, so Discover stays highlighted for any
  // type filter.
  const activeNav: NavItem = isLib ? 'Library' : 'Discover';

  return (
    <div style={{ minHeight: '100%', background: C.bg, fontFamily: sans, color: C.ink }}>
      <Nav active={activeNav} libraryCount={installedCount} onNav={onNav} />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 28px 48px' }}>
        {/* HERO */}
        {isLib ? (
          <>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.05, color: C.ink }}>Your Library</h1>
            <p style={{ margin: '9px 0 20px', fontSize: 15, color: C.sub, fontWeight: 500 }}>
              {installedCount > 0
                ? `${installedCount} ${installedCount === 1 ? 'project' : 'projects'} installed and ready to run.`
                : 'Everything you install lives here.'}
            </p>
          </>
        ) : (
          <>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.05, color: C.ink }}>Find what's worth installing.</h1>
            <p style={{ margin: '9px 0 20px', fontSize: 15, color: C.sub, fontWeight: 500 }}>
              Real repositories from GitHub. Browse it like a store, install it like a terminal.
              {installedCount > 0 && <span style={{ color: C.green, fontWeight: 700 }}> · {installedCount} installed</span>}
            </p>
          </>
        )}

        {isLib && installedCount === 0 ? (
          // empty library — short-circuit before search/filters
          <div style={{ marginTop: 24, background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 16, padding: '64px 24px', textAlign: 'center' }}>
            <div style={{ width: 54, height: 54, borderRadius: 14, margin: '0 auto 18px', background: C.sunk, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box />
            </div>
            <div style={{ fontFamily: sans, fontSize: 19, fontWeight: 700, color: C.ink, letterSpacing: -0.3 }}>Your library is empty</div>
            <div style={{ fontFamily: sans, fontSize: 14.5, color: C.sub, margin: '8px 0 20px' }}>Install something and it'll show up here, ready to open.</div>
            <button onClick={() => onNav('Discover')} style={{ border: 'none', background: C.accent, color: '#fff', fontFamily: sans, fontWeight: 700, fontSize: 14, padding: '11px 22px', borderRadius: 11, cursor: 'pointer' }}>
              Browse Discover →
            </button>
          </div>
        ) : (
          <>
            {/* SEARCH */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 13, padding: '6px 6px 6px 16px' }}>
              <SearchIcon />
              <input
                id="trove-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isLib ? 'Search your library…' : 'Search GitHub — "offline maps", "react", "language:rust cli"…'}
                aria-label="Search projects"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: sans, fontSize: 15, color: C.ink, fontWeight: 500 }}
              />
              {query && (
                <button onClick={() => setQuery('')} aria-label="Clear search" style={{ border: 'none', background: 'transparent', color: C.faint, cursor: 'pointer', fontSize: 18, padding: '0 6px' }}>
                  ×
                </button>
              )}
              <span style={{ fontFamily: mono, fontSize: 12, color: C.faint, border: `1px solid ${C.line}`, borderRadius: 6, padding: '4px 7px' }}>⌘K</span>
            </div>

            {showShelves ? (
              /* DISCOVER LANDING — curated shelves (each its own GitHub search) */
              <div style={{ marginTop: 4 }}>
                {SHELVES.map((s) => (
                  <Shelf key={s.id} shelf={s} onSeeAll={onSeeAll} onOpenDetail={onOpenDetail} installedIds={installedIds} />
                ))}
              </div>
            ) : (
              <>
            {/* CONTROLS — type chips (Library only) + sort */}
            <div style={{ display: 'flex', gap: 9, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              {isLib &&
                TYPES.map((t) => (
                  <TypeChip key={t} label={t} active={typeFilter === t} count={typeCount(t)} onClick={() => setType(t)} />
                ))}
              <div style={{ flex: 1 }} />
              {isLib ? (
                <SortMenu
                  value={librarySort}
                  onChange={setLibrarySort}
                  options={[
                    { value: 'recent', label: 'Recent' },
                    { value: 'stars', label: 'Stars' },
                    { value: 'name', label: 'Name' },
                  ]}
                />
              ) : (
                <SortMenu
                  value={effectiveSort}
                  onChange={setDiscoverSort}
                  options={[
                    { value: 'stars', label: 'Stars' },
                    { value: 'forks', label: 'Forks' },
                    { value: 'updated', label: 'Recently updated' },
                    // Relevance ranking only applies to an actual search.
                    ...(q ? [{ value: 'best' as const, label: 'Best match' }] : []),
                  ]}
                />
              )}
            </div>

            {/* RESULTS HEADING */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '26px 0 14px' }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: -0.2, color: C.sub, whiteSpace: 'nowrap' }}>
                {isLib ? 'Installed' : typeFilter === 'All' ? 'Top repositories' : typeFilter}{' '}
                <span style={{ color: C.faint, fontWeight: 600 }}>
                  {!isLib && typeFilter === 'All' && total > results.length
                    ? `· ${results.length} of ${total.toLocaleString()}${total >= 1000 ? '+' : ''}`
                    : `· ${results.length} ${results.length === 1 ? 'result' : 'results'}`}
                  {q && ` for "${query}"`}
                </span>
              </h2>
            </div>

            {/* STATES */}
            {!isLib && loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 16px', background: C.panel, border: `1px solid ${C.line}`, borderRadius: 13 }}>
                    <div className="tv-skel" style={{ width: 50, height: 50, borderRadius: 11, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div className="tv-skel" style={{ width: '32%', height: 13 }} />
                      <div className="tv-skel" style={{ width: '62%', height: 11 }} />
                    </div>
                    <div className="tv-skel" style={{ width: 156, height: 32, borderRadius: 9, flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            ) : !isLib && error ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: C.sub, fontFamily: sans, fontSize: 14.5, lineHeight: 1.6 }}>
                <div style={{ color: C.red, fontFamily: mono, fontSize: 13, marginBottom: 8 }}>{error}</div>
                Set a <span style={{ fontFamily: mono, color: C.ink }}>GITHUB_TOKEN</span> in the app environment to raise the limit.
              </div>
            ) : results.length === 0 ? (
              <div style={{ padding: '56px 0', textAlign: 'center', color: C.faint, fontFamily: mono, fontSize: 14 }}>
                {isLib ? 'nothing in your library matches that filter.' : `no repositories match${q ? ` "${query}"` : ''}.`}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {results.map((p) => (
                    <ProjectRow
                      key={p.id}
                      p={p}
                      installed={installedIds.has(p.id)}
                      onOpenDetail={onOpenDetail}
                      onInstall={install}
                      onOpen={open}
                      onUninstall={uninstall}
                    />
                  ))}
                </div>

                {!isLib && hasMore && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      style={{
                        border: `1px solid ${C.line}`, background: C.panel, color: C.sub,
                        fontFamily: sans, fontSize: 13.5, fontWeight: 600, padding: '10px 22px',
                        borderRadius: 11, cursor: loadingMore ? 'default' : 'pointer', opacity: loadingMore ? 0.6 : 1,
                      }}
                    >
                      {loadingMore ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
