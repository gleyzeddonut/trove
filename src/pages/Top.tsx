// The Top page — a live leaderboard of repositories ranked by stars within a
// time window (the old flat "top repositories" list, given its own home). Each
// window maps to a GitHub search qualifier; the list reuses ProjectRow with a
// rank cell (top 3 get a gradient badge + edge).

import { useState } from 'react';
import { C, mono, sans } from '../tokens';
import { Nav } from '../components/Nav';
import { ProjectRow } from '../components/ProjectRow';
import { ScanStatus, registryCount } from '../components/ScanStatus';
import { useGithubSearch, prefetchSearch } from '../lib/useGithub';
import { useTroveStore } from '../store/useTroveStore';
import { useNavActions } from '../lib/useNavActions';

type Win = 'today' | 'week' | 'month' | 'all';
const WINDOWS: { id: Win; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
];

// Time window → GitHub `q`. "All time" is the classic top list (the giants);
// the others rank repos *created* in the window (new-and-rising), sorted by stars.
function windowQuery(w: Win): string {
  if (w === 'all') return 'stars:>10000';
  const days = w === 'today' ? 1 : w === 'week' ? 7 : 30;
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  return `created:>=${since}`;
}

// Warm the default Top view (this week) so switching to the tab is instant.
export function prefetchTop(): void {
  void prefetchSearch(windowQuery('week'), 'stars');
}

export function Top() {
  const [win, setWin] = useState<Win>('week');
  const installed = useTroveStore((s) => s.installed);
  const install = useTroveStore((s) => s.install);
  const open = useTroveStore((s) => s.open);
  const uninstall = useTroveStore((s) => s.uninstall);
  const { onNav, onOpenDetail } = useNavActions();

  const { results, loading, loadingMore, error, hasMore, loadMore } = useGithubSearch(windowQuery(win), true, 'stars', true);
  const installedIds = new Set(installed.map((p) => p.id));
  const installedCount = installed.length;
  const scope = win === 'all' ? 'all time' : `new ${WINDOWS.find((w) => w.id === win)!.label.toLowerCase()}`;

  return (
    <div style={{ minHeight: '100%', background: C.bg, fontFamily: sans, color: C.ink }}>
      <Nav active="Top" libraryCount={installedCount} onNav={onNav} />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 28px 48px' }}>
        {/* eyebrow */}
        <div style={{ fontFamily: mono, fontSize: 12.5, color: C.faint, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ color: C.accent }}>❯</span> trove top
          <span>·</span>
          <span style={{ color: C.green }}>↑</span> trending across GitHub
        </div>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.05, color: C.ink }}>Top repositories</h1>
        <p style={{ margin: '9px 0 20px', fontSize: 15, color: C.sub, fontWeight: 500 }}>The most-starred and fastest-rising projects, ranked live.</p>
        <div style={{ height: 2, maxWidth: 340, borderRadius: 2, margin: '20px 0 22px', background: 'linear-gradient(90deg,var(--tv-accent),#06b6d4 60%,transparent)' }} />

        {/* time-window segmented control */}
        <div className="tv-seg">
          {WINDOWS.map((w) => (
            <button key={w.id} className={w.id === win ? 'on' : undefined} onClick={() => setWin(w.id)}>
              {w.label}
            </button>
          ))}
        </div>

        {/* heading */}
        <div style={{ margin: '24px 0 14px' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: -0.2, color: C.sub }}>
            Ranked by stars <span style={{ color: C.faint, fontWeight: 600 }}>· {scope}</span>
          </h2>
        </div>

        {/* states */}
        {loading ? (
          <>
            <ScanStatus
              stages={[
                registryCount() ? `scanning ${registryCount().toLocaleString()} repos` : 'scanning repositories',
                'ranking by stars',
                `windowing · ${scope}`,
                'fetching repo metadata',
                'resolving install commands',
              ]}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="tv-skelcard" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 16px', background: C.panel, border: `1px solid ${C.line}`, borderRadius: 13, ['--d' as string]: `${i * 0.1}s` } as React.CSSProperties}>
                  <div className="tv-skel" style={{ width: 30, height: 22, borderRadius: 6, flexShrink: 0 }} />
                  <div className="tv-skel" style={{ width: 50, height: 50, borderRadius: 11, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="tv-skel" style={{ width: '32%', height: 13 }} />
                    <div className="tv-skel" style={{ width: '62%', height: 11 }} />
                  </div>
                  <div className="tv-skel" style={{ width: 156, height: 32, borderRadius: 9, flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </>
        ) : error ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: C.sub, fontFamily: sans, fontSize: 14.5, lineHeight: 1.6 }}>
            <div style={{ color: C.red, fontFamily: mono, fontSize: 13, marginBottom: 8 }}>{error}</div>
            Set a <span style={{ fontFamily: mono, color: C.ink }}>GITHUB_TOKEN</span> in the app environment to raise the limit.
          </div>
        ) : results.length === 0 ? (
          <div style={{ padding: '56px 0', textAlign: 'center', color: C.faint, fontFamily: mono, fontSize: 14 }}>
            nothing ranked for this window yet.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {results.map((p, i) => (
                <ProjectRow
                  key={p.id}
                  p={p}
                  rank={i + 1}
                  installed={installedIds.has(p.id)}
                  onOpenDetail={onOpenDetail}
                  onInstall={install}
                  onOpen={open}
                  onUninstall={uninstall}
                />
              ))}
            </div>

            {hasMore && (
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
      </div>
    </div>
  );
}
