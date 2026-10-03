// Content-Security-Policy for the renderer (the Trove app itself — web tabs
// and the video dock are <webview> guests with their own documents, so they
// are not covered by, nor loosened by, this policy).
//
// Injected into index.html by a Vite plugin at build time only: in dev, Vite
// and React Fast Refresh rely on inline scripts, which this policy forbids.
// Pure module (no `electron` import) so it can be unit-tested — csp.test.ts.

import type { Plugin } from 'vite';

export function cspHeader(): string {
  return [
    "default-src 'self'",
    // Only the bundled app. The boot splash lives in boot.js, not inline.
    "script-src 'self'",
    // The UI is styled with inline style attributes; Google Fonts for type.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    // READMEs embed images from anywhere; avatars; YouTube thumbnails.
    "img-src 'self' data: https:",
    // Data comes from GitHub only (the YouTube oEmbed lookup goes through the
    // main process over IPC, not from the renderer).
    "connect-src 'self' https://api.github.com https://raw.githubusercontent.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
}

/** Vite plugin: add the policy as a <meta> at the top of <head> in builds. */
export function cspPlugin(): Plugin {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${cspHeader()}" />`;
  return {
    name: 'trove-csp',
    apply: 'build',
    transformIndexHtml: (html: string) => html.replace(/<head>/i, `<head>\n    ${meta}`),
  };
}
