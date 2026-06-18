// Feed (/feed) — a social timeline of what makers are shipping, drawn from
// real GitHub public events. Two columns: followed + suggested creators on the
// left, activity cards on the right.

import { C, sans } from '../tokens';
import { Nav } from '../components/Nav';
import { ActivityCard, CreatorListRow } from '../components/social';
import { useFeed } from '../lib/useGithub';
import { useTroveStore } from '../store/useTroveStore';
import { useNavActions } from '../lib/useNavActions';

function Panel({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: '14px 10px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 5px 8px' }}>
        <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: C.ink }}>{title}</span>
        {count != null && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: C.faint }}>{count}</span>}
      </div>
      {children}
    </div>
  );
}

export function Feed() {
  const following = useTroveStore((s) => s.following);
  const consoleOpen = useTroveStore((s) => s.consoleOpen);
  const toggleConsole = useTroveStore((s) => s.toggleConsole);
  const installedCount = useTroveStore((s) => s.installed.length);
  const { onHome, onNav } = useNavActions();

  const { data, loading, error } = useFeed(following);

  const creators = data?.creators ?? {};
  const followed = data?.followed ?? following;
  const suggested = data?.suggested ?? [];
  const activity = data?.activity ?? [];
  const followingCount = following.length;

  return (
    <div style={{ minHeight: '100%', background: C.bg, fontFamily: sans, color: C.ink }}>
      <Nav active="Feed" consoleOpen={consoleOpen} libraryCount={installedCount} onToggleConsole={toggleConsole} onHome={onHome} onNav={onNav} />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '30px 28px 48px' }}>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.05, color: C.ink }}>Feed</h1>
        <p style={{ margin: '9px 0 0', fontSize: 15, color: C.sub, fontWeight: 500 }}>
          {followingCount > 0
            ? `The latest from the ${followingCount} ${followingCount === 1 ? 'maker' : 'makers'} you follow.`
            : "Follow makers to shape your feed. Here's what the community is shipping."}
        </p>

        <div style={{ display: 'flex', gap: 32, marginTop: 24, alignItems: 'flex-start' }}>
          {/* LEFT: creators */}
          <aside style={{ width: 252, flexShrink: 0, position: 'sticky', top: 80 }}>
            <Panel title="Following" count={followingCount}>
              {followed.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {followed.map((h) => (creators[h] ? <CreatorListRow key={h} c={creators[h]} /> : null))}
                </div>
              ) : (
                <div style={{ padding: '8px 6px 12px', fontFamily: sans, fontSize: 12.5, lineHeight: 1.55, color: C.faint }}>
                  You're not following anyone yet. Add a few makers below to fill your feed.
                </div>
              )}
            </Panel>

            {suggested.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <Panel title="Suggested for you">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {suggested.map((h) => (creators[h] ? <CreatorListRow key={h} c={creators[h]} /> : null))}
                  </div>
                </Panel>
              </div>
            )}
          </aside>

          {/* RIGHT: activity */}
          <main style={{ flex: 1, minWidth: 0, maxWidth: 660 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.sub, letterSpacing: -0.2 }}>Latest activity</h2>
              <span style={{ fontFamily: sans, fontSize: 13, color: C.faint, fontWeight: 600 }}>
                Sort: <span style={{ color: C.sub }}>Recent ▾</span>
              </span>
            </div>

            {loading ? (
              <div style={{ padding: '56px 0', textAlign: 'center', color: C.faint, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>
                building your feed…
              </div>
            ) : error ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: C.sub, fontFamily: sans, fontSize: 14.5, lineHeight: 1.6 }}>
                <div style={{ color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, marginBottom: 8 }}>{error}</div>
                The feed makes several GitHub calls — set a <span style={{ fontFamily: "'JetBrains Mono', monospace", color: C.ink }}>GITHUB_TOKEN</span> to raise the rate limit.
              </div>
            ) : activity.length === 0 ? (
              <div style={{ padding: '56px 0', textAlign: 'center', color: C.faint, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>
                no recent activity — try following a few more makers.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {activity.map((item) => {
                  const creator = creators[item.creatorHandle];
                  if (!creator) return null;
                  return <ActivityCard key={item.id} item={item} creator={creator} />;
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
