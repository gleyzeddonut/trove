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

/** Thumbnail for a video id (plain image — no API key / CORS needed). */
export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** A video/playlist's stable key, for dedupe + meta caching. */
export function refKey(ref: YouTubeRef): string {
  return ref.id || ref.list || '';
}

// Scan a README for every YouTube link, in document order, deduped. Used to
// build the dock's "Up next" queue from the page you're reading.
const URL_RE = /https?:\/\/[^\s)"'<>\]]+/g;
export function collectYouTubeRefs(md: string): YouTubeRef[] {
  const out: YouTubeRef[] = [];
  const seen = new Set<string>();
  for (const raw of md.match(URL_RE) || []) {
    const cleaned = raw.replace(/[).,]+$/, '');
    const ref = youtubeRef(cleaned);
    if (!ref) continue;
    const key = refKey(ref);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out;
}

export interface YouTubeMeta {
  title: string;
  author: string;
}

// Title + channel via YouTube's keyless oEmbed endpoint. Cached per key; on any
// failure (e.g. CORS) we cache null and the UI falls back to the thumbnail.
const metaCache = new Map<string, YouTubeMeta | null>();
export async function fetchYouTubeMeta(ref: YouTubeRef): Promise<YouTubeMeta | null> {
  const key = refKey(ref);
  if (!key) return null;
  if (metaCache.has(key)) return metaCache.get(key) ?? null;
  const watch = ref.id
    ? `https://www.youtube.com/watch?v=${ref.id}`
    : `https://www.youtube.com/playlist?list=${ref.list}`;
  try {
    let meta: YouTubeMeta | null;
    // In the desktop app, fetch via the main process (the oEmbed endpoint sends
    // no CORS header). In a plain browser, try a direct fetch as a fallback.
    if (window.troveYouTube) {
      meta = await window.troveYouTube.meta(watch);
    } else {
      const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`);
      if (!res.ok) throw new Error(String(res.status));
      const j = (await res.json()) as { title?: string; author_name?: string };
      meta = { title: j.title || '', author: j.author_name || '' };
    }
    metaCache.set(key, meta);
    return meta;
  } catch {
    metaCache.set(key, null);
    return null;
  }
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
