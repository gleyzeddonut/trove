// Open a URL in the OS browser. In Electron, window.open is intercepted by the
// main process's setWindowOpenHandler and routed to shell.openExternal; in a
// plain browser it just opens a new tab.
export function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

// Top-level github.com paths that are site features, not user/org profiles.
const GH_RESERVED = new Set([
  'orgs', 'sponsors', 'marketplace', 'topics', 'collections', 'features', 'about',
  'pricing', 'settings', 'notifications', 'explore', 'search', 'login', 'join', 'new',
  'organizations', 'apps', 'codespaces', 'enterprise', 'contact', 'site', 'security',
]);

/**
 * Map a github.com URL to an in-app Trove route, or null if it should open in
 * the OS browser. Repo home → /p/:owner/:repo, user/org → /c/:handle. Repo
 * sub-pages (issues, blob, tree, …) and non-GitHub links return null.
 */
export function githubRoute(href: string): string | null {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  if (u.hostname !== 'github.com' && u.hostname !== 'www.github.com') return null;
  const parts = u.pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  const owner = parts[0];
  if (GH_RESERVED.has(owner.toLowerCase())) return null;
  if (parts.length === 1) return `/c/${encodeURIComponent(owner)}`;
  if (parts.length === 2) {
    const repo = parts[1].replace(/\.git$/, '');
    return `/p/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  }
  return null; // repo sub-page we can't render natively
}
