// Social-layer components: creator avatar, follow button, the tool embed
// inside posts, the activity card, and the compact creator list row.
// They read follow/like/install state from the store directly to keep the
// Feed and Creator pages thin.

import { C, mono, sans } from '../tokens';
import { Check, Heart, Reply, Share, Verified } from './icons';
import { CommandChip } from './CommandChip';
import { useTroveStore } from '../store/useTroveStore';
import { useNavActions } from '../lib/useNavActions';
import { k } from '../lib/derive';
import type { ActivityItem, ActivityVerb, Creator } from '../data/github';
import type { Project } from '../types';

const VERB_COLOR: Record<ActivityVerb, string> = {
  shipped: C.green,
  released: C.green,
  reached: C.amber,
  posted: C.blue,
};

export function CreatorAvatar({ c, size = 44, ring }: { c: Creator; size?: number; ring?: boolean }) {
  return (
    <img
      src={c.avatarUrl}
      alt={c.name}
      width={size}
      height={size}
      loading="lazy"
      style={{
        width: size, height: size, borderRadius: size, flexShrink: 0, objectFit: 'cover',
        boxShadow: ring ? `0 0 0 2px ${C.bg}, 0 0 0 3.5px ${C.accent}` : 'inset 0 0 0 1px rgba(255,255,255,.18)',
      }}
    />
  );
}

export function FollowButton({ handle, size = 'md' }: { handle: string; size?: 'sm' | 'md' | 'pill' }) {
  const following = useTroveStore((s) => s.following.includes(handle));
  const toggle = useTroveStore((s) => s.toggleFollow);

  const dims =
    size === 'md'
      ? { fontSize: 13.5, padding: '8px 18px', radius: 9 }
      : size === 'sm'
        ? { fontSize: 12.5, padding: '6px 14px', radius: 9 }
        : { fontSize: 11.5, padding: '4px 11px', radius: 999 };

  return (
    <button
      className="hf-follow"
      aria-pressed={following}
      onClick={(e) => { e.stopPropagation(); toggle(handle); }}
      style={{
        fontFamily: sans, fontWeight: 700, fontSize: dims.fontSize, cursor: 'pointer',
        padding: dims.padding, borderRadius: dims.radius, flexShrink: 0, whiteSpace: 'nowrap',
        border: following ? `1px solid ${C.line}` : 'none',
        background: following ? 'transparent' : C.accent,
        color: following ? C.sub : '#fff',
        display: 'flex', alignItems: 'center', gap: 5,
      }}
    >
      {following ? (
        <>
          <Check s={11} c="currentColor" w={2} />
          Following
        </>
      ) : (
        <>
          <span style={{ fontSize: dims.fontSize + 2, lineHeight: 1, marginTop: -1 }}>+</span>
          Follow
        </>
      )}
    </button>
  );
}

export function ToolEmbed({ p, grid }: { p: Project; grid?: boolean }) {
  const installed = useTroveStore((s) => s.installed.some((x) => x.id === p.id));
  const install = useTroveStore((s) => s.install);
  const open = useTroveStore((s) => s.open);
  const { onOpenDetail } = useNavActions();

  return (
    <div
      className="hf-embed"
      role="link"
      tabIndex={0}
      onClick={() => onOpenDetail(p)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpenDetail(p))}
      style={{
        display: 'flex', alignItems: 'center', gap: 13, minWidth: 0,
        background: grid ? C.panel : C.sunk,
        border: `1px solid ${grid && installed ? C.installedBorder : C.line}`,
        borderRadius: grid ? 13 : 12, padding: grid ? '14px 14px' : '12px 13px',
        marginTop: grid ? 0 : 13,
      }}
    >
      <div style={{ width: 46, height: 46, borderRadius: 11, background: p.cover, flexShrink: 0, position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 100% at 80% 0%,rgba(255,255,255,.3),transparent 60%)' }} />
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontWeight: 700, fontSize: 19, color: '#fff' }}>{p.name[0]?.toUpperCase()}</span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
          <span style={{ fontFamily: sans, fontWeight: 700, fontSize: 15, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
          {!grid && <span style={{ fontFamily: mono, fontSize: 10.5, color: C.sub, border: `1px solid ${C.line}`, borderRadius: 5, padding: '1px 6px', flexShrink: 0 }}>{p.type.toLowerCase()}</span>}
          <span style={{ fontFamily: mono, fontSize: 11.5, color: C.faint, whiteSpace: 'nowrap', flexShrink: 0 }}>★ {p.stars}</span>
        </div>
        <div style={{ fontFamily: sans, fontSize: 13, color: C.sub, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.blurb}</div>
      </div>

      {installed ? (
        <button
          className="hf-follow"
          onClick={(e) => { e.stopPropagation(); open(p); }}
          style={{ border: `1.5px solid ${C.accent}`, background: 'transparent', color: C.accent, fontFamily: sans, fontWeight: 700, fontSize: 12.5, padding: '7px 16px', borderRadius: 9, cursor: 'pointer', flexShrink: 0 }}
        >
          Open
        </button>
      ) : (
        <CommandChip p={p} onInstall={install} />
      )}
    </div>
  );
}

export function ActivityCard({ item, creator }: { item: ActivityItem; creator: Creator }) {
  const liked = useTroveStore((s) => s.liked.includes(item.id));
  const toggleLike = useTroveStore((s) => s.toggleLike);
  const { onOpenCreator, onOpenDetail } = useNavActions();
  const likeCount = item.likes + (liked ? 1 : 0);

  return (
    <div className="hf-card" style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: '16px 18px 12px' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div role="link" tabIndex={0} onClick={() => onOpenCreator(creator.handle)} onKeyDown={(e) => e.key === 'Enter' && onOpenCreator(creator.handle)} style={{ cursor: 'pointer' }}>
          <CreatorAvatar c={creator} size={44} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span className="hf-name" onClick={() => onOpenCreator(creator.handle)} style={{ fontFamily: sans, fontWeight: 700, fontSize: 15, color: C.ink, whiteSpace: 'nowrap' }}>{creator.name}</span>
            {creator.verified && <Verified />}
            <span style={{ fontFamily: sans, fontSize: 13.5, color: C.faint }}>@{creator.handle}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2, fontFamily: sans, fontSize: 13, color: C.sub, flexWrap: 'wrap' }}>
            <span style={{ color: VERB_COLOR[item.verb], fontWeight: 600 }}>{item.verb}</span>
            <span style={{ fontWeight: 600, color: C.sub }}>{item.project.name}</span>
            <span style={{ fontFamily: mono, fontSize: 10.5, color: C.faint, border: `1px solid ${C.line}`, borderRadius: 5, padding: '1px 6px' }}>{item.tag}</span>
            <span style={{ color: C.faint }}>· {item.t}</span>
          </div>
        </div>
        <FollowButton handle={creator.handle} size="sm" />
      </div>

      {/* note */}
      <p style={{ fontFamily: sans, fontSize: 14.5, lineHeight: 1.6, color: C.body, margin: '13px 0 0', textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>{item.note}</p>

      {/* embedded tool */}
      <ToolEmbed p={item.project} />

      {/* engagement */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, paddingTop: 6 }}>
        <button className="hf-eng" onClick={() => toggleLike(item.id)} aria-pressed={liked} style={{ border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', borderRadius: 8, fontFamily: sans, fontSize: 13, fontWeight: 600, color: liked ? C.red : C.sub, cursor: 'pointer' }}>
          <Heart filled={liked} c={C.red} />
          {k(likeCount)}
        </button>
        <span className="hf-eng" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', borderRadius: 8, fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.sub }}>
          <Reply />
          {item.replies}
        </span>
        <span className="hf-eng" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', borderRadius: 8, fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.sub }}>
          <Share />
          Share
        </span>
        <div style={{ flex: 1 }} />
        <button className="hf-eng" onClick={() => onOpenDetail(item.project)} style={{ border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 8, fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.accent, cursor: 'pointer' }}>
          View tool
          <svg width="11" height="11" viewBox="0 0 8 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1.5 1.5L6.5 6.5L1.5 11.5" /></svg>
        </button>
      </div>
    </div>
  );
}

export function CreatorListRow({ c }: { c: Creator }) {
  const { onOpenCreator } = useNavActions();
  return (
    <div
      className="hf-embed"
      role="link"
      tabIndex={0}
      onClick={() => onOpenCreator(c.handle)}
      onKeyDown={(e) => e.key === 'Enter' && onOpenCreator(c.handle)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 9px', borderRadius: 11, background: 'transparent', border: '1px solid transparent', cursor: 'pointer' }}
    >
      <CreatorAvatar c={c} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontFamily: sans, fontWeight: 700, fontSize: 13.5, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
          {c.verified && <Verified s={11} />}
        </div>
        <div style={{ fontFamily: mono, fontSize: 11, color: C.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{c.handle}</div>
      </div>
      <FollowButton handle={c.handle} size="pill" />
    </div>
  );
}
