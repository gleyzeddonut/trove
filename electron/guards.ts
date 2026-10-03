// Navigation / URL policy for the main process. Pure (no `electron` import)
// so it can be unit-tested — see guards.test.ts.

/**
 * May an app window (one that carries the preload bridge, i.e. shell access)
 * navigate to `url`? Only our own renderer: the packaged index.html under the
 * app path, or the Vite dev server origin. Anything else — a dropped .html
 * file, a remote page — would receive the bridge, so it is refused.
 */
export function isTrustedNavigation(url: string, opts: { appPath: string; devUrl?: string }): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (opts.devUrl) {
    try {
      if (u.origin === new URL(opts.devUrl).origin) return true;
    } catch {
      /* fall through */
    }
  }
  if (u.protocol !== 'file:') return false;
  const appPath = opts.appPath.replace(/\/$/, '');
  return decodeURIComponent(u.pathname) === `${appPath}/dist/index.html`;
}

/** May an untrusted page open `url` as a new in-app browser tab? http(s) only. */
export function isWebTabUrl(url: string): boolean {
  try {
    const p = new URL(url).protocol;
    return p === 'http:' || p === 'https:';
  } catch {
    return false;
  }
}

/** Sliding-window limiter: at most `max` events per `windowMs`. Returns a
 *  predicate taking the current time (ms) so it is deterministic to test. */
export function makeBurstLimiter(max: number, windowMs: number): (now: number) => boolean {
  const stamps: number[] = [];
  return (now) => {
    while (stamps.length && now - stamps[0] >= windowMs) stamps.shift();
    if (stamps.length >= max) return false;
    stamps.push(now);
    return true;
  };
}
