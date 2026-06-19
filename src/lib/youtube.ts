// Detect YouTube links so they can play in the in-app mini-player instead of
// bouncing to the browser. Returns the 11-char video id (+ optional start time
// in seconds) or null for anything that isn't a watchable YouTube video.

export interface YouTubeRef {
  id: string;
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
  if (host === 'youtu.be') {
    id = u.pathname.split('/').filter(Boolean)[0] || '';
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
    else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2] || '';
    else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2] || '';
  }
  if (!/^[\w-]{11}$/.test(id)) return null;
  return { id, start: parseStart(u.searchParams.get('t') || u.searchParams.get('start')) };
}
