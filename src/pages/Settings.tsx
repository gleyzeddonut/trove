// Settings (/settings) — appearance/theme, GitHub connect, updates, install,
// feed, notifications, privacy, danger zone. Reached via the nav avatar.
// Theme/accent/density, open-console-on-install, feed scope, clear-library and
// reset are wired; the rest persist as preferences.

import { useEffect, useRef, useState } from 'react';
import { C, mono, sans } from '../tokens';
import { Nav } from '../components/Nav';
import { useTroveStore } from '../store/useTroveStore';
import { useNavActions } from '../lib/useNavActions';
import type { TroveSettings } from '../lib/settings';

const SWATCHES = ['#8E7DF1', '#3FB950', '#2DD4BF', '#E3B341', '#F47067', '#58A6FF'];

const SECTIONS: [string, string, string][] = [
  ['account', 'Account', 'M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 14c0-2.5 2.5-4 5.5-4s5.5 1.5 5.5 4'],
  ['updates', 'Updates', 'M8 2.5v7M5 6.5l3 3 3-3M2.5 12.5h11'],
  ['appearance', 'Appearance', 'M8 1.5a6.5 6.5 0 1 0 0 13c.8 0 1.2-1 .7-1.6-.6-.8-.1-1.9.9-1.9H12a2.5 2.5 0 0 0 2.5-2.5A6.5 6.5 0 0 0 8 1.5z'],
  ['install', 'Install & terminal', 'M2 3.5h12v9H2zM4.5 6.5l2 2-2 2M8.5 10.5h3'],
  ['feed', 'Feed', 'M3 3h10v3H3zM3 8h10v5H3z'],
  ['notifications', 'Notifications', 'M8 2a4 4 0 0 0-4 4c0 3-1.2 4-1.2 4h10.4S12 9 12 6a4 4 0 0 0-4-4zM6.5 13a1.5 1.5 0 0 0 3 0'],
  ['privacy', 'Privacy', 'M8 1.5l5 2v4c0 3.2-2.2 5.5-5 6.5-2.8-1-5-3.3-5-6.5v-4z'],
];

const BranchGlyph = ({ s = 24, stroke = C.ink }: { s?: number; stroke?: string }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={stroke} strokeWidth="1.4">
    <circle cx="4" cy="4" r="2.2" />
    <circle cx="4" cy="12" r="2.2" />
    <circle cx="12" cy="6" r="2.2" />
    <path d="M4 6.2v3.6M4 12h4.5c2.2 0 3.5-1.6 3.5-3.8v0" strokeLinecap="round" />
  </svg>
);

// --- controls -------------------------------------------------------------
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="set-toggle" role="switch" aria-checked={on} tabIndex={0}
      onClick={() => onChange(!on)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onChange(!on))}
      style={{ width: 42, height: 25, borderRadius: 25, background: on ? C.green : 'var(--tv-toggle-off)', padding: 3, flexShrink: 0 }}>
      <div className="set-sw" style={{ width: 19, height: 19, borderRadius: 19, background: '#fff', transform: on ? 'translateX(17px)' : 'translateX(0)', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
    </div>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'inline-flex', background: C.sunk, border: `1px solid ${C.line}`, borderRadius: 10, padding: 3, gap: 2, flexShrink: 0 }}>
      {options.map(([k, label]) => (
        <span key={k} className="set-seg" onClick={() => onChange(k)} style={{ fontFamily: sans, fontSize: 12.5, fontWeight: 600, padding: '6px 13px', borderRadius: 7, whiteSpace: 'nowrap', color: value === k ? C.ink : C.sub, background: value === k ? C.panelHover : 'transparent' }}>{label}</span>
      ))}
    </div>
  );
}

function Select<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <select className="set-select" value={value} onChange={(e) => onChange(e.target.value as T)}
        style={{ appearance: 'none', WebkitAppearance: 'none', fontFamily: mono, fontSize: 12.5, color: C.ink, background: C.sunk, border: `1px solid ${C.line}`, borderRadius: 9, padding: '8px 30px 8px 12px', cursor: 'pointer', outline: 'none' }}>
        {options.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
      </select>
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke={C.sub} strokeWidth="1.7" strokeLinecap="round" style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><path d="M2 4l3.5 3.5L9 4" /></svg>
    </div>
  );
}

function Swatches({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 9, flexShrink: 0 }}>
      {SWATCHES.map((c) => (
        <div key={c} className="set-swatch" onClick={() => onChange(c)} style={{ width: 24, height: 24, borderRadius: 24, background: c, boxShadow: value === c ? `0 0 0 2px var(--tv-bg), 0 0 0 3.5px ${c}` : 'inset 0 0 0 1px rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {value === c && <svg width="11" height="11" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M2 5l2 2 4-5" /></svg>}
        </div>
      ))}
    </div>
  );
}

function Row({ title, desc, children, last }: { title: string; desc?: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px 0', borderBottom: last ? 'none' : `1px solid ${C.line2}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: sans, fontSize: 14.5, fontWeight: 600, color: C.ink }}>{title}</div>
        {desc && <div style={{ fontFamily: sans, fontSize: 13, color: C.sub, marginTop: 3, lineHeight: 1.45, maxWidth: 460 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

const Label = ({ children, danger }: { children: React.ReactNode; danger?: boolean }) => (
  <h2 style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: danger ? C.red : C.faint, margin: '0 0 10px 2px' }}>{children}</h2>
);

const Card = ({ children, accentBorder }: { children: React.ReactNode; accentBorder?: string }) => (
  <div style={{ background: C.panel, border: `1px solid ${accentBorder || C.line}`, borderRadius: 14, padding: '4px 18px' }}>{children}</div>
);

// --- updates panel (wired to the real electron-updater) -------------------
function UpdatePanel() {
  const update = useTroveStore((s) => s.update);
  const startUpdate = useTroveStore((s) => s.startUpdate);
  const [version, setVersion] = useState('');

  useEffect(() => {
    window.troveUpdater?.getVersion().then(setVersion).catch(() => undefined);
  }, []);

  if (typeof window === 'undefined' || !window.troveUpdater) {
    return <Card><Row title="Updates" desc="Updates are delivered through the Trove desktop app." last><span style={{ fontFamily: mono, fontSize: 12.5, color: C.faint }}>—</span></Row></Card>;
  }

  const { status, version: nextVersion, percent, error } = update;
  const amber = status === 'available' || status === 'downloading';

  return (
    <div style={{ background: C.panel, border: `1px solid ${amber ? 'rgba(227,179,65,.3)' : C.line}`, borderRadius: 14, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <img src="./trove-icon.png" alt="" width={46} height={46} style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: sans, fontSize: 15.5, fontWeight: 700, color: C.ink }}>Trove</div>
          <div style={{ fontFamily: mono, fontSize: 12.5, marginTop: 2 }}>
            {status === 'available' ? <span style={{ color: C.amber }}>● update available{version && ` · v${version}`}{nextVersion && ` → v${nextVersion}`}</span>
              : status === 'downloading' ? <span style={{ color: C.amber }}>downloading update… {percent ?? 0}%</span>
              : status === 'downloaded' ? <span style={{ color: C.green }}>✓ ready — restart to finish</span>
              : status === 'checking' ? <span style={{ color: C.sub }}>checking for updates…</span>
              : status === 'error' ? <span style={{ color: C.red }}>{error || 'update check failed'}</span>
              : <span style={{ color: C.green }}>✓ up to date{version && ` · v${version}`}</span>}
          </div>
        </div>
        {status === 'available' && <button className="set-btn" onClick={startUpdate} style={{ fontFamily: sans, fontWeight: 700, fontSize: 13, color: '#06210E', background: C.green, border: 'none', borderRadius: 9, padding: '9px 18px' }}>Update now</button>}
        {status === 'downloaded' && <button className="set-btn" onClick={() => window.troveUpdater?.install()} style={{ fontFamily: sans, fontWeight: 700, fontSize: 13, color: '#06210E', background: C.green, border: 'none', borderRadius: 9, padding: '9px 18px' }}>Restart</button>}
        {(status === 'idle' || status === 'error') && <button className="set-btn" onClick={() => window.troveUpdater?.check()} style={{ fontFamily: sans, fontWeight: 600, fontSize: 12.5, color: C.sub, background: 'transparent', border: `1px solid ${C.line}`, borderRadius: 9, padding: '8px 14px' }}>Check again</button>}
      </div>
      {status === 'downloading' && (
        <div style={{ marginTop: 16 }}>
          <div style={{ height: 7, borderRadius: 7, background: C.sunk, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${percent ?? 0}%`, background: C.green, borderRadius: 7, transition: 'width .18s linear' }} />
          </div>
          <div style={{ fontFamily: mono, fontSize: 11.5, color: C.faint, marginTop: 7 }}>downloading &amp; linking · {percent ?? 0}%</div>
        </div>
      )}
    </div>
  );
}

export function Settings() {
  const consoleOpen = useTroveStore((s) => s.consoleOpen);
  const toggleConsole = useTroveStore((s) => s.toggleConsole);
  const installedCount = useTroveStore((s) => s.installed.length);
  const s = useTroveStore((st) => st.settings);
  const setSetting = useTroveStore((st) => st.setSetting);
  const resetSettings = useTroveStore((st) => st.resetSettings);
  const clearLibrary = useTroveStore((st) => st.clearLibrary);
  const account = useTroveStore((st) => st.account);
  const connecting = useTroveStore((st) => st.connecting);
  const connectGithub = useTroveStore((st) => st.connectGithub);
  const disconnectGithub = useTroveStore((st) => st.disconnectGithub);
  const token = useTroveStore((st) => st.connectToken);
  const setToken = useTroveStore((st) => st.setConnectToken);
  const { onHome, onNav } = useNavActions();

  const set = setSetting as <K extends keyof TroveSettings>(k: K, v: TroveSettings[K]) => void;
  const [active, setActive] = useState('account');
  const refs = useRef<Record<string, HTMLElement | null>>({});

  const go = (id: string) => {
    setActive(id);
    const el = refs.current[id];
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 78, behavior: 'smooth' });
  };

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY + 120;
      let cur = SECTIONS[0][0];
      for (const [id] of SECTIONS) {
        const el = refs.current[id];
        if (el && el.offsetTop <= y) cur = id;
      }
      setActive(cur);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const section = (id: string, label: string, body: React.ReactNode) => (
    <section ref={(el) => { refs.current[id] = el; }} style={{ scrollMarginTop: 80, marginBottom: 16 }}>
      <Label>{label}</Label>
      {body}
    </section>
  );

  return (
    <div style={{ minHeight: '100%', background: C.bg, fontFamily: sans, color: C.ink }}>
      <Nav active={null} consoleOpen={consoleOpen} libraryCount={installedCount} onToggleConsole={toggleConsole} onHome={onHome} onNav={onNav} />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '30px 28px 56px' }}>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.05, color: C.ink }}>Settings</h1>
        <p style={{ margin: '9px 0 0', fontSize: 15, color: C.sub, fontWeight: 500 }}>Tune how Trove discovers, installs, and behaves. Changes save automatically.</p>

        <div style={{ display: 'flex', gap: 32, marginTop: 26, alignItems: 'flex-start' }}>
          {/* LEFT: section nav */}
          <aside style={{ width: 210, flexShrink: 0, position: 'sticky', top: 80 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {SECTIONS.map(([id, label, path]) => (
                <div key={id} className="set-nav" onClick={() => go(id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 10, color: active === id ? C.ink : C.sub, background: active === id ? C.panel : 'transparent', fontWeight: active === id ? 700 : 500, fontSize: 13.5 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={active === id ? C.accent : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>
                  {label}
                </div>
              ))}
            </div>
          </aside>

          {/* RIGHT: panels */}
          <main style={{ flex: 1, minWidth: 0, maxWidth: 660 }}>
            {/* ACCOUNT */}
            {section('account', 'Account', (
              <Card>
                {account ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0', borderBottom: `1px solid ${C.line2}` }}>
                      <img src={account.avatarUrl} alt="" width={56} height={56} style={{ width: 56, height: 56, borderRadius: 56, flexShrink: 0, objectFit: 'cover' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: sans, fontSize: 17, fontWeight: 700, color: C.ink }}>{account.name}</div>
                        <div style={{ fontFamily: mono, fontSize: 13, color: C.sub, marginTop: 2 }}>@{account.login}{account.email && ` · ${account.email}`}</div>
                      </div>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: sans, fontSize: 12.5, fontWeight: 700, color: C.green, background: 'rgba(63,185,80,.12)', padding: '5px 11px', borderRadius: 20, flexShrink: 0 }}>
                        <BranchGlyph s={13} stroke={C.green} /> GitHub
                      </span>
                    </div>
                    <Row title="Connected account" desc={`Authenticated as @${account.login}. Trove uses your token to read GitHub at 5,000 req/hr.`}>
                      <button className="set-btn" onClick={() => disconnectGithub()} style={{ fontFamily: sans, fontWeight: 600, fontSize: 12.5, color: C.sub, background: 'transparent', border: `1px solid ${C.line}`, borderRadius: 8, padding: '7px 14px' }}>Disconnect</button>
                    </Row>
                    <Row title="Plan" desc="Trove is free and open. Support keeps the lights on." last>
                      <button className="set-btn" style={{ fontFamily: sans, fontWeight: 700, fontSize: 13, color: '#fff', background: C.accent, border: 'none', borderRadius: 9, padding: '8px 16px' }}>Support Trove</button>
                    </Row>
                  </>
                ) : (
                  <div style={{ padding: '26px 4px 24px', textAlign: 'center' }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px', background: C.sunk, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BranchGlyph />
                    </div>
                    <div style={{ fontFamily: sans, fontSize: 19, fontWeight: 700, color: C.ink, letterSpacing: -0.3 }}>Connect your GitHub</div>
                    <div style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.55, color: C.sub, margin: '8px auto 16px', maxWidth: 420 }}>
                      Trove uses your GitHub account as your profile and to read the API at 5,000 req/hr. Paste a personal access token (read-only public is enough).
                    </div>
                    <div style={{ display: 'flex', gap: 8, maxWidth: 420, margin: '0 auto' }}>
                      <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_… or ghp_…" spellCheck={false} autoComplete="off"
                        onKeyDown={(e) => e.key === 'Enter' && token.trim() && connectGithub(token)}
                        style={{ flex: 1, background: C.sunk, border: `1px solid ${C.line}`, borderRadius: 10, padding: '11px 12px', color: C.ink, fontFamily: mono, fontSize: 12.5, outline: 'none' }} />
                      <button className="set-btn" disabled={connecting || !token.trim()} onClick={() => connectGithub(token)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: sans, fontWeight: 700, fontSize: 14, color: 'var(--tv-bg)', background: C.ink, border: 'none', borderRadius: 10, padding: '0 18px', cursor: connecting || !token.trim() ? 'default' : 'pointer', opacity: connecting || !token.trim() ? 0.6 : 1 }}>
                        {connecting ? <><span className="hd-spin" style={{ width: 13, height: 13, border: '2px solid rgba(127,127,127,.3)', borderTopColor: 'var(--tv-bg)', borderRadius: 13, display: 'inline-block' }} />Connecting…</> : 'Connect'}
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            ))}

            {/* UPDATES */}
            {section('updates', 'Updates', <UpdatePanel />)}

            {/* APPEARANCE */}
            {section('appearance', 'Appearance', (
              <Card>
                <Row title="Theme" desc="Trove is built for the dark. Light is best-effort.">
                  <Segmented value={s.theme} onChange={(v) => set('theme', v)} options={[['dark', 'Dark'], ['light', 'Light'], ['system', 'System']]} />
                </Row>
                <Row title="Accent color" desc="Used for highlights, primary buttons and active states.">
                  <Swatches value={s.accent} onChange={(v) => set('accent', v)} />
                </Row>
                <Row title="Density" desc="How tightly rows and lists are packed." last>
                  <Segmented value={s.density} onChange={(v) => set('density', v)} options={[['comfortable', 'Comfortable'], ['compact', 'Compact']]} />
                </Row>
              </Card>
            ))}

            {/* INSTALL & TERMINAL */}
            {section('install', 'Install & terminal', (
              <Card>
                <Row title="Default package manager" desc="Trove reads the real command from each repo's README; this is the fallback.">
                  <Select value={s.pkg} onChange={(v) => set('pkg', v)} options={[['auto', 'Auto-detect'], ['npm', 'npm'], ['pnpm', 'pnpm'], ['brew', 'Homebrew'], ['cargo', 'cargo'], ['pip', 'pip']]} />
                </Row>
                <Row title="Open console on install" desc="Slide the terminal up automatically when you run an install.">
                  <Toggle on={s.autoConsole} onChange={(v) => set('autoConsole', v)} />
                </Row>
                <Row title="Confirm before installing" desc="Ask for a confirmation before running an install command.">
                  <Toggle on={s.confirmInstall} onChange={(v) => set('confirmInstall', v)} />
                </Row>
                <Row title="Keep installs updated" desc="Check followed tools for new releases and offer one-click updates." last>
                  <Toggle on={s.keepUpdated} onChange={(v) => set('keepUpdated', v)} />
                </Row>
              </Card>
            ))}

            {/* FEED */}
            {section('feed', 'Feed', (
              <Card>
                <Row title="Show in feed" desc="Whose activity appears on your Feed page.">
                  <Segmented value={s.feedScope} onChange={(v) => set('feedScope', v)} options={[['following', 'Following'], ['all', 'Everyone']]} />
                </Row>
                <Row title="Autoplay demos" desc="Play tool demo clips automatically as you scroll.">
                  <Toggle on={s.autoplay} onChange={(v) => set('autoplay', v)} />
                </Row>
                <Row title="Show replies inline" last>
                  <Toggle on={s.showReplies} onChange={(v) => set('showReplies', v)} />
                </Row>
              </Card>
            ))}

            {/* NOTIFICATIONS */}
            {section('notifications', 'Notifications', (
              <Card>
                <Row title="New releases" desc="When a creator you follow ships an update.">
                  <Toggle on={s.notifReleases} onChange={(v) => set('notifReleases', v)} />
                </Row>
                <Row title="Replies & mentions" desc="When someone replies to or mentions you.">
                  <Toggle on={s.notifMentions} onChange={(v) => set('notifMentions', v)} />
                </Row>
                <Row title="Weekly digest" desc="A Monday roundup of the best new tools." last>
                  <Toggle on={s.notifDigest} onChange={(v) => set('notifDigest', v)} />
                </Row>
              </Card>
            ))}

            {/* PRIVACY */}
            {section('privacy', 'Privacy', (
              <Card>
                <Row title="Usage analytics" desc="Trove ships zero telemetry by default. Opt in to help us prioritize.">
                  <Toggle on={s.telemetry} onChange={(v) => set('telemetry', v)} />
                </Row>
                <Row title="Public library" desc="Let others see what you've installed on your profile.">
                  <Toggle on={s.publicLibrary} onChange={(v) => set('publicLibrary', v)} />
                </Row>
                <Row title="Public follows" desc="Show who you follow on your profile." last>
                  <Toggle on={s.publicFollows} onChange={(v) => set('publicFollows', v)} />
                </Row>
              </Card>
            ))}

            {/* DANGER */}
            <section style={{ marginTop: 24 }}>
              <Label danger>Danger zone</Label>
              <div style={{ background: 'rgba(244,112,103,.05)', border: '1px solid rgba(244,112,103,.25)', borderRadius: 14, padding: '4px 18px' }}>
                <Row title="Clear library" desc={`Uninstall everything (${installedCount} ${installedCount === 1 ? 'tool' : 'tools'}) and empty your library.`}>
                  <button className="set-btn" onClick={() => clearLibrary()} style={{ fontFamily: sans, fontWeight: 700, fontSize: 13, color: C.red, background: 'transparent', border: '1px solid rgba(244,112,103,.4)', borderRadius: 9, padding: '8px 16px' }}>Clear</button>
                </Row>
                <Row title="Reset all settings" desc="Restore every setting on this page to its default." last>
                  <button className="set-btn" onClick={() => { resetSettings(); setToken(''); }} style={{ fontFamily: sans, fontWeight: 700, fontSize: 13, color: C.red, background: 'transparent', border: '1px solid rgba(244,112,103,.4)', borderRadius: 9, padding: '8px 16px' }}>Reset</button>
                </Row>
              </div>
            </section>

            <div style={{ textAlign: 'center', marginTop: 30, fontFamily: mono, fontSize: 12, color: C.faint }}>Trove · made for makers · no telemetry</div>
          </main>
        </div>
      </div>
    </div>
  );
}
