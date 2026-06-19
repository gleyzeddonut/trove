// Detect YouTube links so they can play in the in-app mini-player instead of
// bouncing to the browser. Handles single videos (watch / youtu.be / shorts /
// embed) and playlists. Returns the video id and/or playlist id (+ optional
// start time), or null for anything that isn't watchable.

export interface YouTubeRef {
  id?: string;
  list?: string;
  start?: number;
}

function parseStart(t: string | null): number | undefined {
  if (!t) return undefined;
  if (/^\d+$/.test(t)) return parseInt(t, 10) || undefined;
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m) return undefined;
  const secs = (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0));
  return secs || undefined;
}

export function youtubeRef(href: string): YouTubeRef | null {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www\.|m\.|music\.)/, '');
  let id = '';
  const list = u.searchParams.get('list') || '';

  if (host === 'youtu.be') {
    id = u.pathname.split('/').filter(Boolean)[0] || '';
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
    else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2] || '';
    else if (u.pathname.startsWith('/embed/')) {
      const seg = u.pathname.split('/')[2] || '';
      if (seg !== 'videoseries') id = seg;
    }
    // /playlist → list only (handled via `list` above)
  } else {
    return null;
  }

  const validId = /^[\w-]{11}$/.test(id) ? id : '';
  const validList = /^[\w-]{12,}$/.test(list) ? list : '';
  if (!validId && !validList) return null;
  return { id: validId || undefined, list: validList || undefined, start: parseStart(u.searchParams.get('t') || u.searchParams.get('start')) };
}
