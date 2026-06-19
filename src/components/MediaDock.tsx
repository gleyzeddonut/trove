// The right-docked video player. A cross-origin youtube-nocookie embed on a
// dark 16:9 stage, with an "Up next" queue built from every YouTube link on the
// README you're reading (titles/channels via keyless oEmbed, thumbnails direct
// from i.ytimg.com); a playlist link plays as a native YT playlist inside the
// embed. Adopts the "Demos" dock look from the handoff: a resizable panel
// pinned below the chrome + nav, with a draggable left edge. The iframe is
// cross-origin, so it can't reach the app's shell bridges. (Other external
// links open as browser tabs in the chrome, not here.)

import { useEffect, useState } from 'react';
import { C, sans, mono, TABBAR_H } from '../tokens';
import { openExternal } from '../lib/external';
import {
  fetchYouTubeMeta,
  refKey,
  youtubeThumb,
  type YouTubeMeta,
  type YouTubeRef,
} from '../lib/youtube';
import { useTroveStore } from '../store/useTroveStore';

// The dock sits below the browser-chrome tab strip + the app nav.
const DOCK_TOP = TABBAR_H + 60;

function HeaderBtn({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      className="hv-gbtn"
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.line}`,
        background: 'transparent', color: C.sub, cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1, flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

const watchUrl = (ref: YouTubeRef) =>
  ref.id
    ? `https://www.youtube.com/watch?v=${ref.id}${ref.list ? `&list=${ref.list}` : ''}`
    : `https://www.youtube.com/playlist?list=${ref.list}`;

function PlaylistItem({
  item,
  meta,
  active,
  onSelect,
}: {
  item: YouTubeRef;
  meta: YouTubeMeta | null | undefined;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className="hv-pl"
      onClick={onSelect}
      style={{
        display: 'flex', gap: 11, padding: '9px 12px', borderRadius: 10,
        backgroundColor: active ? 'var(--tv-panelHover)' : 'transparent',
        borderLeft: active ? `2px solid ${C.accent}` : '2px solid transparent',
      }}
    >
      <div style={{ position: 'relative', width: 116, height: 66, borderRadius: 8, background: '#06070A', flexShrink: 0, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
        {item.id ? (
          <img src={youtubeThumb(item.id)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.6)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h13M3 12h13M3 18h9M17 12l5 3-5 3v-6z" /></svg>
          </span>
        )}
        {active ? (
          <span style={{ position: 'absolute', left: 6, bottom: 6, display: 'flex', alignItems: 'center', gap: 4, fontFamily: sans, fontWeight: 700, fontSize: 9.5, color: '#fff', background: 'rgba(0,0,0,.6)', padding: '2px 6px', borderRadius: 4 }}>
            <span style={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', height: 8 }}>
              <span style={{ width: 2, height: 5, background: C.green }} /><span style={{ width: 2, height: 8, background: C.green }} /><span style={{ width: 2, height: 3, background: C.green }} />
            </span>
            NOW PLAYING
          </span>
        ) : (
          <span className="hv-plthumb-ov" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .12s' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
          </span>
        )}
        {item.list && (
          <span style={{ position: 'absolute', right: 5, bottom: 5, fontFamily: mono, fontSize: 9.5, color: '#fff', background: 'rgba(0,0,0,.75)', padding: '1px 5px', borderRadius: 4 }}>playlist</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
        <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {meta?.title || (item.list ? 'YouTube playlist' : 'YouTube video')}
        </div>
        {meta?.author && <div style={{ fontFamily: sans, fontSize: 11.5, color: C.faint, marginTop: 4 }}>{meta.author}</div>}
      </div>
    </div>
  );
}

export function MediaDock() {
  const video = useTroveStore((s) => s.video);
  const videoQueue = useTroveStore((s) => s.videoQueue);
  const close = useTroveStore((s) => s.closeVideo);
  const playVideo = useTroveStore((s) => s.playVideo);
  const width = useTroveStore((s) => s.dockWidth);
  const setWidth = useTroveStore((s) => s.setDockWidth);

  const [resizing, setResizing] = useState(false);
  const [meta, setMeta] = useState<Record<string, YouTubeMeta | null>>({});

  // Fetch title/channel for the active video + everything in the queue.
  useEffect(() => {
    if (!video) return;
    let cancelled = false;
    for (const ref of videoQueue) {
      const key = refKey(ref);
      if (!key) continue;
      fetchYouTubeMeta(ref).then((m) => {
        if (!cancelled) setMeta((prev) => (key in prev ? prev : { ...prev, [key]: m }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [video, videoQueue]);

  if (!video) return null;

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    const onMove = (ev: MouseEvent) => setWidth(window.innerWidth - ev.clientX);
    const onUp = () => {
      setResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.userSelect = 'none';
  };

  const params = new URLSearchParams({ autoplay: '1', rel: '0' });
  if (video.list) params.set('list', video.list);
  if (video.start) params.set('start', String(video.start));
  const src = `https://www.youtube-nocookie.com/embed/${video.id || 'videoseries'}?${params.toString()}`;
  const activeMeta = meta[refKey(video)];
  const externalUrl = watchUrl(video);
  const title = videoQueue.length > 1 ? `Video · ${videoQueue.length} in queue` : 'Video';

  return (
    <div
      style={{
        position: 'fixed', top: DOCK_TOP, right: 0, bottom: 0, width, zIndex: 45,
        backgroundColor: 'var(--tv-bg)', borderLeft: `1px solid ${C.line}`,
        boxShadow: '-12px 0 40px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column',
      }}
    >
      {/* drag-to-resize handle on the left edge */}
      <div
        className={`hv-handle${resizing ? ' drag' : ''}`}
        onMouseDown={startResize}
        title="Drag to resize"
        style={{ position: 'absolute', left: -3, top: 0, bottom: 0, width: 6, cursor: 'col-resize', zIndex: 2 }}
      />

      {/* header */}
      <div style={{ height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px 0 16px', borderBottom: `1px solid ${C.line2}` }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill={C.accent}><path d="M8 5v14l11-7z" /></svg>
        <span style={{ fontFamily: sans, fontWeight: 700, fontSize: 13.5, color: C.ink, letterSpacing: -0.2, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </span>
        <HeaderBtn title="Open on YouTube" onClick={() => openExternal(externalUrl)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3h7v7M21 3l-9 9M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></svg>
        </HeaderBtn>
        <HeaderBtn title="Close" onClick={close}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
        </HeaderBtn>
      </div>

      <div className="hv-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {/* dark 16:9 stage */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#06070A' }}>
          <iframe
            key={video.id || video.list}
            src={src}
            title="YouTube video"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>

        {/* meta */}
        <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${C.line2}` }}>
          <div style={{ fontFamily: sans, fontSize: 15.5, fontWeight: 700, color: C.ink, lineHeight: 1.3, letterSpacing: -0.2 }}>
            {activeMeta?.title || (video.list && !video.id ? 'YouTube playlist' : 'YouTube video')}
          </div>
          {activeMeta?.author && <div style={{ fontFamily: mono, fontSize: 12, color: C.faint, marginTop: 6 }}>{activeMeta.author}</div>}
          <button
            className="hv-gbtn"
            onClick={() => openExternal(externalUrl)}
            style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 7, fontFamily: sans, fontWeight: 600, fontSize: 12.5, color: C.sub, backgroundColor: C.panel, border: `1px solid ${C.line}`, borderRadius: 20, padding: '6px 13px', cursor: 'pointer' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3h7v7M21 3l-9 9M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></svg>
            Watch on YouTube
          </button>
        </div>

        {/* up next — the page's other videos */}
        {videoQueue.length > 1 && (
          <div style={{ padding: '12px 8px 20px' }}>
            <div style={{ fontFamily: sans, fontSize: 13.5, fontWeight: 700, color: C.ink, padding: '0 8px 8px' }}>Up next</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {videoQueue.map((item) => (
                <PlaylistItem
                  key={refKey(item)}
                  item={item}
                  meta={meta[refKey(item)]}
                  active={refKey(item) === refKey(video)}
                  onSelect={() => playVideo(item, videoQueue)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* A transparent shim over the (mouse-swallowing) iframe while dragging the
          resize handle, so the window-level mousemove keeps firing. */}
      {resizing && <div style={{ position: 'fixed', inset: 0, zIndex: 9999, cursor: 'col-resize' }} />}
    </div>
  );
}
