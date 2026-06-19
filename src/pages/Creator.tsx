// Creator profile (/c/:handle) — a real GitHub user/org: cover banner, avatar,
// bio, follower/repo/star stats, a Follow button, and a grid of their repos.

import { useParams } from 'react-router-dom';
import { C, mono, sans } from '../tokens';
import { Nav } from '../components/Nav';
import { BackArrow, Verified } from '../components/icons';
import { CreatorAvatar, FollowButton, ToolEmbed } from '../components/social';
import { useCreator } from '../lib/useGithub';
import { useTroveStore } from '../store/useTroveStore';
import { useNavActions } from '../lib/useNavActions';
import { k } from '../lib/derive';

function Shell({ children }: { children: React.ReactNode }) {
  const installedCount = useTroveStore((s) => s.installed.length);
  const { onNav } = useNavActions();
  return (
    <div style={{ minHeight: '100%', background: C.bg, fontFamily: sans, color: C.ink }}>
      <Nav active={null} libraryCount={installedCount} onNav={onNav} />
      {children}
    </div>
  );
}

export function Creator() {
  const { handle } = useParams<{ handle: string }>();
  const { profile, loading, error } = useCreator(handle);
  const { onHome } = useNavActions();

  if (loading) {
    return (
      <Shell>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '64px 28px', textAlign: 'center', color: C.faint, fontFamily: mono, fontSize: 14 }}>
          loading @{handle}…
        </div>
      </Shell>
    );
  }

  if (error || !profile) {
    return (
      <Shell>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '64px 28px', textAlign: 'center', color: C.sub }}>
          <p style={{ fontFamily: mono, color: C.red }}>{error || 'creator not found.'}</p>
          <button onClick={onHome} style={{ border: 'none', background: C.accent, color: '#fff', fontFamily: sans, fontWeight: 700, fontSize: 14, padding: '10px 20px', borderRadius: 10, cursor: 'pointer' }}>Back to Discover</button>
        </div>
      </Shell>
    );
  }

  const { creator: c, tools, totalStars } = profile;
  const stats: [string, string | number][] = [
    ['Followers', c.followers],
    ['Following', k(c.following)],
    ['Tools', tools.length],
    ['Total stars', k(totalStars)],
  ];

  return (
    <Shell>
      {/* cover banner */}
      <div style={{ height: 150, background: c.cover, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 120% at 80% 0%,rgba(255,255,255,.22),transparent 55%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 40%,var(--tv-bg) 100%)' }} />
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 28px 52px' }}>
        {/* back */}
        <div className="hf-name" role="link" tabIndex={0} onClick={onHome} onKeyDown={(e) => e.key === 'Enter' && onHome()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sans, fontSize: 13.5, fontWeight: 600, color: C.sub, marginTop: 14, cursor: 'pointer' }}>
          <BackArrow />
          Discover
        </div>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginTop: -52 }}>
          <CreatorAvatar c={c} size={88} ring />
          <div style={{ flex: 1, paddingBottom: 4, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ margin: 0, fontFamily: sans, fontSize: 27, fontWeight: 800, letterSpacing: -0.7, color: C.ink }}>{c.name}</h1>
              {c.verified && <Verified s={18} />}
            </div>
            <div style={{ fontFamily: sans, fontSize: 14, color: C.faint, marginTop: 2 }}>
              @{c.handle}
              {c.location && ` · ${c.location}`}
            </div>
          </div>
          <div style={{ paddingBottom: 6 }}>
            <FollowButton handle={c.handle} size="md" />
          </div>
        </div>

        {/* bio */}
        {c.bio && (
          <p style={{ fontFamily: sans, fontSize: 15.5, lineHeight: 1.6, color: C.body, margin: '16px 0 0', maxWidth: 620, textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>{c.bio}</p>
        )}

        {/* stats */}
        <div style={{ display: 'flex', gap: 26, margin: '16px 0 30px', flexWrap: 'wrap' }}>
          {stats.map(([label, val]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
              <span style={{ fontFamily: sans, fontWeight: 800, fontSize: 17, color: C.ink }}>{val}</span>
              <span style={{ fontFamily: sans, fontSize: 13, color: C.faint }}>{label}</span>
            </div>
          ))}
        </div>

        {/* their tools */}
        <h2 style={{ fontFamily: sans, fontSize: 17, fontWeight: 700, color: C.ink, letterSpacing: -0.3, margin: '0 0 14px', paddingBottom: 10, borderBottom: `1px solid ${C.line2}` }}>
          Tools by {c.name.split(' ')[0]} <span style={{ color: C.faint, fontWeight: 600 }}>· {tools.length}</span>
        </h2>

        {tools.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: C.faint, fontFamily: mono, fontSize: 14 }}>
            no public repositories to show.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            {tools.map((p) => (
              <ToolEmbed key={p.id} p={p} grid />
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
