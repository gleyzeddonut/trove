// A floating, draggable YouTube mini-player. Clicking a YouTube link in a
// README opens the video here so you can watch while keeping the repo open.
// Works because YouTube permits embedding (unlike most sites); the cross-origin
// iframe can't reach the app's bridges, so it's safe.

import { useRef, useState } from 'react';
import { C, mono, sans } from '../tokens';
import { ExternalLink } from './icons';
import { openExternal } from '../lib/external';
import { useTroveStore } from '../store/useTroveStore';

const WIDTH = 400; // 16:9 video + chrome

export function MiniPlayer() {
  const video = useTroveStore((s) => s.video);
  const close = useTroveStore((s) => s.closeVideo);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  if (!video) return null;

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    const onMove = (ev: MouseEvent) => {
      const left = Math.max(8, Math.min(window.innerWidth - WIDTH - 8, ev.clientX - offX));
      const top = Math.max(8, Math.min(window.innerHeight - 120, ev.clientY - offY));
      setPos({ left, top });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.userSelect = 'none';
  };

  // Single video → /embed/<id>; playlist-only → /embed/videoseries?list=…
  const base = 'https://www.youtube-nocookie.com/embed/';
  const params = new URLSearchParams({ autoplay: '1', rel: '0' });
  if (video.list) params.set('list', video.list);
  if (video.start) params.set('start', String(video.start));
  const src = `${base}${video.id || 'videoseries'}?${params.toString()}`;
  const watchUrl = video.id
    ? `https://www.youtube.com/watch?v=${video.id}${video.list ? `&list=${video.list}` : ''}`
    : `https://www.youtube.com/playlist?list=${video.list}`;
  const place: React.CSSProperties = pos ? { left: pos.left, top: pos.top } : { right: 20, bottom: 56 };

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', zIndex: 60, width: WIDTH, ...place,
        background: '#0B0D11', border: `1px solid ${C.line}`, borderRadius: 12,
        overflow: 'hidden', boxShadow: '0 18px 50px rgba(0,0,0,.45)',
      }}
    >
      {/* drag handle / chrome */}
      <div
        onMouseDown={startDrag}
        style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', cursor: 'grab', background: '#0E1116', borderBottom: '1px solid #1C2230' }}
      >
        <span style={{ width: 16, height: 12, borderRadius: 3, background: '#FF0000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="6" height="7" viewBox="0 0 8 9" fill="#fff"><path d="M0 0l8 4.5L0 9z" /></svg>
        </span>
        <span style={{ flex: 1, fontFamily: sans, fontSize: 12.5, fontWeight: 600, color: '#C9D1D9' }}>YouTube</span>
        <button
          className="hc-tabtn"
          title="Open in browser"
          onClick={() => openExternal(watchUrl)}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6E7681', display: 'flex', alignItems: 'center', padding: 2 }}
        >
          <ExternalLink s={12} />
        </button>
        <button
          className="hc-tabtn"
          title="Close"
          onClick={close}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6E7681', fontFamily: mono, fontSize: 15, lineHeight: 1, padding: '0 2px' }}
        >
          ×
        </button>
      </div>
      <iframe
        key={video.id || video.list}
        src={src}
        title="YouTube video"
        style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', border: 0, background: '#000' }}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
