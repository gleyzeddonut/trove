import { describe, expect, it, vi } from 'vitest';

const mem = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
});
const { loadSettings, SETTINGS_DEFAULTS } = await import('./settings');

describe('loadSettings', () => {
  it('keeps known persisted values over defaults', () => {
    mem.set('trove.settings.v1', JSON.stringify({ theme: 'light', confirmInstall: true }));
    const s = loadSettings();
    expect(s.theme).toBe('light');
    expect(s.confirmInstall).toBe(true);
    expect(s.pkg).toBe(SETTINGS_DEFAULTS.pkg);
  });
  it('drops keys that are no longer settings (removed placebo toggles)', () => {
    mem.set('trove.settings.v1', JSON.stringify({ theme: 'light', telemetry: true, publicLibrary: true, notifDigest: false }));
    const s = loadSettings() as unknown as Record<string, unknown>;
    expect(s).not.toHaveProperty('telemetry');
    expect(s).not.toHaveProperty('publicLibrary');
    expect(s).not.toHaveProperty('notifDigest');
    expect(Object.keys(s).sort()).toEqual(Object.keys(SETTINGS_DEFAULTS).sort());
  });
  it('the defaults contain only settings that do something', () => {
    for (const dead of ['keepUpdated', 'autoplay', 'showReplies', 'notifReleases', 'notifMentions', 'notifDigest', 'telemetry', 'publicLibrary', 'publicFollows']) {
      expect(SETTINGS_DEFAULTS).not.toHaveProperty(dead);
    }
  });
});
