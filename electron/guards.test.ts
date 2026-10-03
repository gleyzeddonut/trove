// Pure navigation/URL policy for the main process (kept free of `electron`
// imports so it can be unit-tested).
import { describe, expect, it } from 'vitest';
import { isTrustedNavigation, isWebTabUrl, makeBurstLimiter } from './guards';

const appPath = '/Applications/Trove.app/Contents/Resources/app.asar';

describe('isTrustedNavigation — where the app windows (which carry the shell bridge) may go', () => {
  it('allows the packaged renderer under the app path, with any hash route', () => {
    expect(isTrustedNavigation(`file://${appPath}/dist/index.html`, { appPath })).toBe(true);
    expect(isTrustedNavigation(`file://${appPath}/dist/index.html#/__terminal`, { appPath })).toBe(true);
  });
  it('allows the Vite dev server origin when one is set', () => {
    expect(isTrustedNavigation('http://localhost:5173/#/feed', { appPath, devUrl: 'http://localhost:5173/' })).toBe(true);
  });
  it('rejects any other file, any remote page, and non-http schemes', () => {
    expect(isTrustedNavigation('file:///Users/me/Downloads/evil.html', { appPath })).toBe(false);
    expect(isTrustedNavigation('https://github.com/', { appPath })).toBe(false);
    expect(isTrustedNavigation('https://evil.example/', { appPath, devUrl: 'http://localhost:5173/' })).toBe(false);
    expect(isTrustedNavigation('javascript:alert(1)', { appPath })).toBe(false);
    expect(isTrustedNavigation('not a url', { appPath })).toBe(false);
  });
});

describe('isWebTabUrl — what an untrusted page may open as a new tab', () => {
  it('accepts http(s) only', () => {
    expect(isWebTabUrl('https://example.com/x')).toBe(true);
    expect(isWebTabUrl('http://localhost:3000')).toBe(true);
  });
  it('rejects file, javascript, data, custom schemes and garbage', () => {
    expect(isWebTabUrl('file:///etc/passwd')).toBe(false);
    expect(isWebTabUrl('javascript:alert(1)')).toBe(false);
    expect(isWebTabUrl('data:text/html,<script>1</script>')).toBe(false);
    expect(isWebTabUrl('x-apple.systempreferences:com.apple.preference')).toBe(false);
    expect(isWebTabUrl('')).toBe(false);
  });
});

describe('makeBurstLimiter — a page cannot spam new tabs', () => {
  it('allows up to N events per window, then refuses until the window slides', () => {
    const allow = makeBurstLimiter(3, 1000);
    expect(allow(0)).toBe(true);
    expect(allow(10)).toBe(true);
    expect(allow(20)).toBe(true);
    expect(allow(30)).toBe(false);
    expect(allow(999)).toBe(false);
    expect(allow(1001)).toBe(true); // the first event has aged out
  });
});
