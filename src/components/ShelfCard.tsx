// A compact repo card used inside a Discover shelf's horizontal row. The whole
// card opens the detail page — the row stays scannable, so install lives on the
// detail page / the flat list, not here.

import { C, mono, sans } from '../tokens';
import { Star } from './icons';
import type { Project } from '../types';

export function ShelfCard({
  p,
  installed,
  onOpenDetail,
}: {
  p: Project;
  installed: boolean;
  onOpenDetail: (p: Project) => void;
}) {
  return (
    <div
      className="hs-card"
      role="link"
      tabIndex={0}
      aria-label={`${p.name} — ${p.blurb}`}
      onClick={() => onOpenDetail(p)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpenDetail(p))}
      style={{
        width: 268, flexShrink: 0, boxSizing: 'border-box',
        background: C.panel, border: `1px solid ${installed ? C.installedBorder : C.line}`,
        borderRadius: 13, padding: 13, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 11,
      }}
    >
      {/* header: thumb + name + owner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: p.cover, flexShrink: 0, position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 100% at 80% 0%,rgba(255,255,255,.3),transparent 60%)' }} />
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontWeight: 700, fontSize: 19, color: 'rgba(255,255,255,.95)', textShadow: '0 1px 6px rgba(0,0,0,.25)' }}>
            {p.name[0]?.toUpperCase()}
          </span>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 14.5, color: C.ink, letterSpacing: -0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.name}
          </div>
          <div style={{ fontFamily: mono, fontSize: 11.5, color: C.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.owner}
          </div>
        </div>
      </div>

      {/* blurb (2 lines) */}
      <div style={{ fontFamily: sans, fontSize: 12.5, lineHeight: 1.45, color: C.sub, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 36 }}>
        {p.blurb}
      </div>

      {/* meta: stars + language */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: mono, fontSize: 11.5, color: C.faint }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: C.sub }}>
          <Star s={11} />
          {p.stars}
        </span>
        {p.lang && p.lang !== '—' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 8, background: p.langColor, display: 'inline-block' }} />
            {p.lang}
          </span>
        )}
      </div>
    </div>
  );
}
