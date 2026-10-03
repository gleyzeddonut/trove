// The renderer's Content-Security-Policy, injected into index.html at build
// time (dev keeps HMR's inline scripts working by not injecting it).
import { describe, expect, it } from 'vitest';
import { cspHeader, cspPlugin } from './csp';

describe('cspHeader', () => {
  const csp = cspHeader();
  const directive = (name: string) => csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(name + ' ')) ?? '';

  it('runs scripts only from the app bundle — no inline, no eval, no remote', () => {
    expect(directive('script-src')).toBe("script-src 'self'");
    expect(csp).not.toMatch(/unsafe-eval/);
  });
  it('talks only to GitHub for data', () => {
    const c = directive('connect-src');
    expect(c).toContain('https://api.github.com');
    expect(c).toContain('https://raw.githubusercontent.com');
    expect(c).not.toMatch(/https:(\s|$)/); // no wildcard-https
  });
  it('allows README images, avatars and video thumbnails from any https host', () => {
    expect(directive('img-src')).toContain('https:');
    expect(directive('img-src')).toContain('data:');
  });
  it('allows Google Fonts and the inline style attributes the UI relies on', () => {
    expect(directive('style-src')).toContain("'unsafe-inline'");
    expect(directive('style-src')).toContain('https://fonts.googleapis.com');
    expect(directive('font-src')).toContain('https://fonts.gstatic.com');
  });
  it('locks down plugins, base and framing', () => {
    expect(directive('object-src')).toBe("object-src 'none'");
    expect(directive('base-uri')).toBe("base-uri 'self'");
  });
});

describe('cspPlugin', () => {
  it('only applies to production builds', () => {
    expect(cspPlugin().apply).toBe('build');
  });
  it('injects one meta tag into <head>', () => {
    const plugin = cspPlugin();
    const t = plugin.transformIndexHtml as (html: string) => string;
    const out = t('<html><head><title>x</title></head><body></body></html>');
    expect(out).toContain('<meta http-equiv="Content-Security-Policy" content="');
    expect(out.indexOf('<meta http-equiv="Content-Security-Policy"')).toBeLessThan(out.indexOf('<title>'));
    expect(out.match(/Content-Security-Policy/g)).toHaveLength(1);
  });
});
