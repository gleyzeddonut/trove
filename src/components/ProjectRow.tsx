// The core list item. Collapsed, it's a tidy summary; an expand toggle folds
// down a drawer with the full description, topics, and key stats so you can
// decide whether to install without leaving Discover. The header still
// navigates to the full README; right-side controls stopPropagation.

import { useState } from 'react';
import { C, mono, sans } from '../tokens';
import { Caret, Check, ExternalLink, Fork, GitHubMark, Star, Trash } from './icons';
import { CommandChip } from './CommandChip';
import { k } from '../lib/derive';
import { openExternal } from '../lib/external';
import type { Project } from '../types';

interface Props {
  p: Project;
  installed: boolean;
  /** When set (Top page), shows a rank cell; top 3 get a gradient badge + edge. */
  rank?: number;
  onOpenDetail: (p: Project) => void;
  onInstall: (p: Project) => void;
  onOpen: (p: Project) => void;
  onUninstall: (p: Project) => void;
}

export function ProjectRow({ p, installed, rank, onOpenDetail, onInstall, onOpen, onUninstall }: Props) {
  const [open, setOpen] = useState(false);
  const topics = (p.topics || []).filter(Boolean).slice(0, 8);
  const forks = k(p.forksNum || 0);
  const hasMeta = topics.length > 0 || (p.lang && p.lang !== '—') || (p.license && p.license !== 'No license');

  return (
    <div
      className={`hs-row${rank != null && rank <= 3 ? ' top3' : ''}`}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'stretch',
        background: C.panel, border: `1px solid ${installed ? C.installedBorder : C.line}`, borderRadius: 13,
      }}
    >
      {/* HEADER (click → detail) */}
      <div
        role="link"
        tabIndex={0}
        aria-label={`${p.name} — ${p.blurb}`}
        onClick={() => onOpenDetail(p)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpenDetail(p))}
        style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 16px', cursor: 'pointer' }}
      >
        {/* rank (Top page only) */}
        {rank != null && <div className={`tv-rank${rank <= 3 ? ' badge' : ''}`}>{rank}</div>}

        {/* thumb */}
        <div style={{ width: 50, height: 50, borderRadius: 11, background: p.cover, flexShrink: 0, position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 100% at 80% 0%,rgba(255,255,255,.3),transparent 60%)' }} />
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontWeight: 700, fontSize: 22, color: 'rgba(255,255,255,.95)', textShadow: '0 1px 6px rgba(0,0,0,.25)' }}>
            {p.name[0]?.toUpperCase()}
          </span>
        </div>

        {/* middle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4, flexWrap: 'nowrap' }}>
            <span style={{ fontFamily: sans, fontWeight: 700, fontSize: 16, color: C.ink, letterSpacing: -0.3, whiteSpace: 'nowrap' }}>{p.name}</span>
            <span style={{ fontFamily: mono, fontSize: 11, color: C.sub, border: `1px solid ${C.line}`, borderRadius: 5, padding: '1px 7px', flexShrink: 0 }}>{p.type.toLowerCase()}</span>
            <span style={{ fontFamily: sans, fontSize: 11.5, color: C.faint, fontWeight: 600, whiteSpace: 'nowrap' }}>{p.tag}</span>
            {installed && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: sans, fontWeight: 700, fontSize: 10.5, color: C.green, background: 'rgba(63,185,80,.12)', padding: '2px 8px 2px 6px', borderRadius: 20, flexShrink: 0 }}>
                <Check />installed
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
            <span style={{ fontFamily: sans, fontSize: 13.5, color: C.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: '0 1 auto' }}>{p.blurb}</span>
            <span style={{ fontFamily: sans, fontSize: 12.5, color: C.faint, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>· @{p.owner}</span>
          </div>
        </div>

        {/* right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: mono, fontSize: 12.5, color: C.sub, minWidth: 52, justifyContent: 'flex-end' }}>
            <Star style={{ marginTop: -1 }} />
            {p.stars}
          </div>

          {installed && (
            <button
              className="hs-uninstall"
              title={`Uninstall ${p.name}`}
              aria-label={`Uninstall ${p.name}`}
              onClick={(e) => { e.stopPropagation(); onUninstall(p); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', border: `1px solid ${C.line}`, background: 'transparent', borderRadius: 9, cursor: 'pointer', color: C.faint, fontFamily: sans, fontWeight: 700, fontSize: 13 }}
            >
              <Trash />
              Uninstall
            </button>
          )}

          {installed ? (
            <button
              className="hs-open"
              onClick={(e) => { e.stopPropagation(); onOpen(p); }}
              style={{ border: `1.5px solid ${C.accent}`, background: 'transparent', color: C.accent, fontFamily: sans, fontWeight: 700, fontSize: 13, padding: '8px 22px', borderRadius: 10, cursor: 'pointer' }}
            >
              Open
            </button>
          ) : (
            <CommandChip p={p} onInstall={onInstall} />
          )}

          <button
            className="hs-caret"
            aria-label={open ? 'Show less' : 'Show more'}
            aria-expanded={open}
            title={open ? 'Show less' : 'More info'}
            onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: `1px solid ${C.line}`, background: 'transparent', borderRadius: 9, cursor: 'pointer', color: C.faint, flexShrink: 0 }}
          >
            <Caret open={open} />
          </button>
        </div>
      </div>

      {/* DRAWER (more info) — animated via grid-rows */}
      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows .22s cubic-bezier(.4,0,.1,1)' }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ borderTop: `1px solid ${C.line2}`, padding: '13px 16px 15px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* full description */}
            <p style={{ margin: 0, fontFamily: sans, fontSize: 13.5, lineHeight: 1.6, color: C.body }}>{p.desc || p.blurb}</p>

            {/* topic chips */}
            {topics.length > 0 && (
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {topics.map((t) => (
                  <span key={t} style={{ fontFamily: sans, fontSize: 11.5, fontWeight: 600, color: C.accent, background: C.accentSoft, borderRadius: 20, padding: '3px 10px' }}>{t}</span>
                ))}
              </div>
            )}

            {/* stat strip + view readme */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontFamily: mono, fontSize: 12, color: C.faint }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: C.sub }}>
                <Star s={11} />{p.stars}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Fork s={12} stroke={C.faint} full={false} />{forks} forks
              </span>
              {p.lang && p.lang !== '—' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 9, background: p.langColor, display: 'inline-block' }} />
                  {p.lang}
                </span>
              )}
              {p.license && p.license !== 'No license' && <span>{p.license}</span>}
              <span>updated {p.updated}</span>
              <div style={{ flex: 1 }} />
              <button
                onClick={(e) => { e.stopPropagation(); openExternal(p.htmlUrl); }}
                title="Open on github.com"
                style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'transparent', color: C.sub, fontFamily: sans, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                <GitHubMark s={13} />
                GitHub
                <ExternalLink stroke={C.faint} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onOpenDetail(p); }}
                style={{ border: 'none', background: 'transparent', color: C.accent, fontFamily: sans, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                View README →
              </button>
            </div>

            {!hasMeta && (
              <span style={{ fontFamily: mono, fontSize: 12, color: C.faint }}>No topics listed for this repository.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
