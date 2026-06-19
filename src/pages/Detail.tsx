// Project detail — a clean GitHub-style README page backed by the live GitHub
// API (metadata, parsed README, real contributor avatars). The embedded
// terminal stays available so you can install from here too.

import { useParams } from 'react-router-dom';
import { C, CHIP, mono, sans } from '../tokens';
import { Nav } from '../components/Nav';
import {
  BackArrow, Check, Clock, ExternalLink, FileIcon, Fork, GitHubMark, IssueDot, License, Play, Star, Watch,
} from '../components/icons';
import { openExternal } from '../lib/external';
import { Markdown } from '../components/Markdown';
import { useGithubRepo } from '../lib/useGithub';
import { useTroveStore } from '../store/useTroveStore';
import { useNavActions } from '../lib/useNavActions';
import type { Contributor } from '../data/github';

function PillBtn({ icon, label, count }: { icon: React.ReactNode; label: string; count: string }) {
  return (
    <div className="hd-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 9, padding: '7px 12px', fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.sub }}>
      {icon}
      {label}
      <span style={{ fontFamily: mono, fontSize: 12, color: C.ink, background: C.sunk, border: `1px solid ${C.line}`, borderRadius: 6, padding: '1px 7px' }}>{count}</span>
    </div>
  );
}

function StatRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: `1px solid ${C.line2}` }}>
      <span style={{ width: 16, display: 'flex', justifyContent: 'center' }}>{icon}</span>
      <span style={{ fontFamily: sans, fontSize: 13, color: C.sub, flex: 1 }}>{label}</span>
      <span style={{ fontFamily: mono, fontSize: 12.5, color: C.ink, fontWeight: 500, whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const consoleOpen = useTroveStore((s) => s.consoleOpen);
  const toggleConsole = useTroveStore((s) => s.toggleConsole);
  const installedCount = useTroveStore((s) => s.installed.length);
  const { onHome, onNav } = useNavActions();
  return (
    <div style={{ minHeight: '100%', background: C.bg, fontFamily: sans, color: C.ink }}>
      <Nav active={null} consoleOpen={consoleOpen} libraryCount={installedCount} onToggleConsole={toggleConsole} onHome={onHome} onNav={onNav} />
      {children}
    </div>
  );
}

export function Detail() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const { detail, loading, error } = useGithubRepo(owner, repo);

  const isInstalled = useTroveStore((s) => s.isInstalled);
  const install = useTroveStore((s) => s.install);
  const open = useTroveStore((s) => s.open);
  const { onHome, onOpenCreator } = useNavActions();

  // Only show the bare loader when there's nothing to paint yet. When we have a
  // preview (seeded from the list) we render it immediately and let the README
  // and contributors stream in.
  if (loading && !detail) {
    return (
      <Shell>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '64px 28px', textAlign: 'center', color: C.faint, fontFamily: mono, fontSize: 14 }}>
          loading {owner}/{repo}…
        </div>
      </Shell>
    );
  }

  if (!detail) {
    return (
      <Shell>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '64px 28px', textAlign: 'center', color: C.sub }}>
          <p style={{ fontFamily: mono, color: C.red }}>{error || 'project not found.'}</p>
          <button onClick={onHome} style={{ border: 'none', background: C.accent, color: '#fff', fontFamily: sans, fontWeight: 700, fontSize: 14, padding: '10px 20px', borderRadius: 10, cursor: 'pointer' }}>Back to Discover</button>
        </div>
      </Shell>
    );
  }

  const { project: p, contributors, forks, watchers, issues, readme, defaultBranch } = detail;
  const installed = isInstalled(p.id);

  return (
    <Shell>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 28px 56px' }}>
        {/* breadcrumb + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <span className="hd-back" role="button" tabIndex={0} onClick={onHome} onKeyDown={(e) => e.key === 'Enter' && onHome()} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: sans, fontSize: 13.5, fontWeight: 600, color: C.sub }}>
            <BackArrow />
            Discover
          </span>
          <span style={{ color: C.faint }}>/</span>
          <span style={{ fontFamily: mono, fontSize: 14, color: C.sub }}>
            <span className="hd-link" onClick={() => onOpenCreator(p.owner)} style={{ color: C.sub }}>{p.owner}</span>
            <span style={{ color: C.faint }}> / </span>
            <span style={{ color: C.ink, fontWeight: 600 }}>{p.name}</span>
          </span>
          <div style={{ flex: 1 }} />
          <button
            className="hd-btn"
            onClick={() => openExternal(p.htmlUrl)}
            title="Open the repository on github.com"
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 9, padding: '7px 12px', fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.sub, cursor: 'pointer' }}
          >
            <GitHubMark />
            View on GitHub
            <ExternalLink stroke={C.faint} />
          </button>
          <PillBtn label="Watch" count={watchers} icon={<Watch />} />
          <PillBtn label="Fork" count={forks} icon={<Fork />} />
          <div className="hd-btn" style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(227,179,65,.12)', border: '1px solid rgba(227,179,65,.3)', borderRadius: 9, padding: '7px 12px', fontFamily: sans, fontSize: 13, fontWeight: 700, color: C.amber }}>
            <Star s={14} />
            Star
            <span style={{ fontFamily: mono, fontSize: 12, color: C.ink, background: C.sunk, border: `1px solid ${C.line}`, borderRadius: 6, padding: '1px 7px' }}>{p.stars}</span>
          </div>
        </div>

        {/* title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: p.cover, flexShrink: 0, position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 100% at 80% 0%,rgba(255,255,255,.32),transparent 60%)' }} />
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontWeight: 700, fontSize: 26, color: '#fff' }}>{p.name[0]?.toUpperCase()}</span>
          </div>
          <div>
            <h1 style={{ margin: 0, fontFamily: sans, fontSize: 32, fontWeight: 800, letterSpacing: -1, color: C.ink }}>{p.name}</h1>
            <div style={{ fontFamily: sans, fontSize: 15, color: C.sub, marginTop: 3 }}>{p.blurb}</div>
          </div>
        </div>

        {/* topic chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0 6px' }}>
          {[p.type, p.tag, p.lang, p.license].filter((t) => t && t !== '—').map((t) => (
            <span key={t} style={{ fontFamily: sans, fontSize: 12.5, fontWeight: 600, color: C.accent, background: C.accentSoft, borderRadius: 20, padding: '5px 12px' }}>{t}</span>
          ))}
        </div>

        {/* two columns */}
        <div style={{ display: 'flex', gap: 34, marginTop: 22, alignItems: 'flex-start' }}>
          {/* README */}
          <div style={{ flex: 1, minWidth: 0, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: '8px 28px 30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 0 16px', borderBottom: `1px solid ${C.line2}`, marginBottom: 4 }}>
              <FileIcon />
              <span style={{ fontFamily: mono, fontSize: 13, color: C.sub, fontWeight: 500 }}>README.md</span>
            </div>

            {/* The real README, rendered faithfully. */}
            {readme ? (
              <Markdown md={readme} owner={p.owner} repo={p.name} branch={defaultBranch} />
            ) : loading ? (
              <div style={{ padding: '36px 0', textAlign: 'center', color: C.faint, fontFamily: mono, fontSize: 13 }}>loading README…</div>
            ) : (
              <p style={{ fontFamily: sans, fontSize: 15, lineHeight: 1.7, color: C.body, margin: '14px 0' }}>{p.blurb}</p>
            )}

            <div style={{ marginTop: 28, paddingTop: 16, borderTop: `1px solid ${C.line2}`, fontFamily: sans, fontSize: 13, color: C.faint }}>
              {p.license !== 'No license' && <>Released under the <span style={{ color: C.sub, fontWeight: 600 }}>{p.license}</span> license · </>}
              maintained by <span className="hd-link" onClick={() => onOpenCreator(p.owner)}>@{p.owner}</span>
            </div>
          </div>

          {/* SIDEBAR */}
          <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* get it */}
            <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: C.sub, marginBottom: 12 }}>Get it</div>
              {installed ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: sans, fontWeight: 700, fontSize: 13, color: C.green }}>
                    <Check s={14} w={2} />
                    Installed
                  </div>
                  <button onClick={() => open(p)} style={{ width: '100%', border: `1.5px solid ${C.accent}`, background: 'transparent', color: C.accent, fontFamily: sans, fontWeight: 700, fontSize: 14, padding: '10px', borderRadius: 10, cursor: 'pointer' }}>
                    Open {p.name}
                  </button>
                </div>
              ) : (
                <button
                  className="hd-cmd"
                  title="Run in the embedded terminal"
                  aria-label={`Run ${p.install}`}
                  onClick={() => install(p)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, background: CHIP.bg, border: `1px solid ${CHIP.border}`, borderRadius: 9, padding: '9px 9px 9px 12px', textAlign: 'left' }}
                >
                  <span style={{ fontFamily: mono, fontSize: 12, color: C.green, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                    <span style={{ color: '#6E7681' }}>$ </span>
                    {p.install}
                  </span>
                  <span className="hd-run" style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: mono, fontSize: 11, fontWeight: 600, color: '#E7EAEF', background: 'rgba(255,255,255,.06)', borderRadius: 6, padding: '4px 10px', flexShrink: 0 }}>
                    <Play />
                    run
                  </span>
                </button>
              )}
            </div>

            {/* about */}
            <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: C.sub, marginBottom: 10 }}>About</div>
              <div style={{ fontFamily: sans, fontSize: 13.5, lineHeight: 1.55, color: C.body, marginBottom: 14 }}>{p.blurb}</div>
              <StatRow label="Stars" value={p.stars} icon={<Star s={12} />} />
              <StatRow label="Forks" value={forks} icon={<Fork s={12} stroke={C.faint} full={false} />} />
              <StatRow label="Watchers" value={watchers} icon={<Watch stroke={C.faint} />} />
              <StatRow label="Open issues" value={issues} icon={<IssueDot />} />
              <StatRow label="License" value={p.license} icon={<License />} />
              <StatRow label="Language" value={p.lang} icon={<span style={{ width: 9, height: 9, borderRadius: 9, background: p.langColor, display: 'inline-block' }} />} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0 0' }}>
                <span style={{ width: 16, display: 'flex', justifyContent: 'center' }}><Clock /></span>
                <span style={{ fontFamily: sans, fontSize: 13, color: C.sub, flex: 1 }}>Updated</span>
                <span style={{ fontFamily: mono, fontSize: 12.5, color: C.ink }}>{p.updated}</span>
              </div>
            </div>

            {/* contributors */}
            {contributors.length > 0 && (
              <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                  <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: C.sub }}>Contributors</span>
                  <span style={{ fontFamily: mono, fontSize: 12, color: C.faint }}>{contributors.length}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {contributors.map((c: Contributor) => (
                    <img
                      key={c.login}
                      src={c.avatarUrl}
                      alt={c.login}
                      title={`@${c.login}`}
                      width={30}
                      height={30}
                      loading="lazy"
                      onClick={() => onOpenCreator(c.login)}
                      style={{ width: 30, height: 30, borderRadius: 8, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)', objectFit: 'cover', cursor: 'pointer' }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
