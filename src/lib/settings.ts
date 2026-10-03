// User settings: shape, defaults, persistence, and the theme applier that
// writes --tv-accent / data-theme / data-density onto <html> so Dark / Light /
// System / accent / density all apply live.

export type ThemeChoice = 'dark' | 'light' | 'system';
export type Density = 'comfortable' | 'compact';
export type PkgChoice = 'auto' | 'npm' | 'pnpm' | 'brew' | 'cargo' | 'pip';
export type FeedScope = 'following' | 'all';

export interface TroveSettings {
  theme: ThemeChoice;
  accent: string;
  density: Density;
  pkg: PkgChoice;
  autoConsole: boolean;
  confirmInstall: boolean;
  feedScope: FeedScope;
}

export const DEFAULT_ACCENT = '#8E7DF1';

export const SETTINGS_DEFAULTS: TroveSettings = {
  theme: 'dark',
  accent: DEFAULT_ACCENT,
  density: 'comfortable',
  pkg: 'auto',
  autoConsole: true,
  confirmInstall: false,
  feedScope: 'following',
};

const LS = 'trove.settings.v1';

export const loadSettings = (): TroveSettings => {
  const out = { ...SETTINGS_DEFAULTS };
  try {
    const saved = (JSON.parse(localStorage.getItem(LS) || '{}') || {}) as Record<string, unknown>;
    // Only keys that are still settings — stale ones from removed toggles are
    // dropped rather than carried along forever.
    for (const k of Object.keys(SETTINGS_DEFAULTS) as (keyof TroveSettings)[]) {
      if (k in saved) (out as Record<string, unknown>)[k] = saved[k];
    }
  } catch {
    /* corrupt / unavailable storage → defaults */
  }
  return out;
};

export const persistSettings = (s: TroveSettings) => {
  try {
    localStorage.setItem(LS, JSON.stringify(s));
  } catch {
    /* ignore */
  }
};

export function resolveTheme(choice: ThemeChoice): 'dark' | 'light' {
  if (choice === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return choice;
}

/** Write the structural theme onto the document so CSS variables re-skin live. */
export function applyTheme(s: TroveSettings) {
  try {
    const root = document.documentElement;
    root.style.setProperty('--tv-accent', s.accent || DEFAULT_ACCENT);
    root.setAttribute('data-density', s.density || 'comfortable');
    const resolved = resolveTheme(s.theme || 'dark');
    root.setAttribute('data-theme', resolved);
    document.body?.setAttribute('data-theme', resolved);
  } catch {
    /* ignore */
  }
}
