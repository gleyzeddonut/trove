// The storefront surface — shared by Discover (`/`) and Library (`/library`).
// Discover pulls live repositories from GitHub; Library reads the persisted
// set of installed projects. Search, type chips, results, empty/loading/error.

import { C, mono, sans } from '../tokens';
import { Nav, type NavItem } from '../components/Nav';
import { TypeChip } from '../components/TypeChip';
import { ProjectRow } from '../components/ProjectRow';
import { Box, SearchIcon } from '../components/icons';
import { TROVE_TYPES } from '../data/constants';
import { troveMatch } from '../data/match';
import { useGithubSearch } from '../lib/useGithub';
import { useTroveStore } from '../store/useTroveStore';
import { useNavActions } from '../lib/useNavActions';
import type { Project, TypeFilter } from '../types';

const TYPES: TypeFilter[] = ['All', ...TROVE_TYPES];

export function Storefront({ mode }: { mode: 'discover' | 'library' }) {
  const isLib = mode === 'library';

  const query = useTroveStore((s) => s.query);
  const setQuery = useTroveStore((s) => s.setQuery);
  const typeFilter = useTroveStore((s) => s.typeFilter);
  const setType = useTroveStore((s) => s.setType);
  const installed = useTroveStore((s) => s.installed);
  const consoleOpen = useTroveStore((s) => s.consoleOpen);
  const toggleConsole = useTroveStore((s) => s.toggleConsole);
  const install = useTroveStore((s) => s.install);
  const open = useTroveStore((s) => s.open);
  const uninstall = useTroveStore((s) => s.uninstall);

  const { onHome, onNav, onOpenDetail } = useNavActions();

  // Discover hits GitHub (server-side search); Library is purely local.
  const { results: remote, total, loading, loadingMore, error, hasMore, loadMore } = useGithubSearch(query, !isLib);

  const q = query.trim();
  const installedIds = new Set(installed.map((p) => p.id));

  // Base set per surface. Discover already searched server-side, so we only
  // apply the type filter client-side; Library filters locally by query+type.
  const base: Project[] = isLib ? installed : remote;
  const byType = (p: Project) => typeFilter === 'All' || p.type === typeFilter;
  const results = isLib ? base.filter((p) => troveMatch(p, query, typeFilter)) : base.filter(byType);

  const typeCount = (t: TypeFilter) =>
    t === 'All' ? base.length : base.filter((p) => p.type === t).length;
  const installedCount = installed.length;

  const activeNav: NavItem = isLib
    ? 'Library'
    : (
        { All: 'Discover', App: 'Apps', Tool: 'Tools', Creative: 'Creative', Library: 'Discover' } as const
      )[typeFilter] ?? 'Discover';

  return (
    <div style={{ minHeight: '100%', background: C.bg, fontFamily: sans, color: C.ink }}>
      <Nav active={activeNav} consoleOpen={consoleOpen} libraryCount={installedCount} onToggleConsole={toggleConsole} onHome={onHome} onNav={onNav} />

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

            {/* TYPE CHIPS */}
            <div style={{ display: 'flex', gap: 9, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              {TYPES.map((t) => (
                <TypeChip key={t} label={t} active={typeFilter === t} count={typeCount(t)} onClick={() => setType(t)} />
              ))}
              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: sans, fontSize: 13, color: C.faint, fontWeight: 600 }}>
                Sort: <span style={{ color: C.sub }}>{isLib ? 'Recent ▾' : 'Stars ▾'}</span>
              </span>
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
              <div style={{ padding: '56px 0', textAlign: 'center', color: C.faint, fontFamily: mono, fontSize: 14 }}>
                searching GitHub…
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
                      mode={mode}
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
      </div>
    </div>
  );
}
