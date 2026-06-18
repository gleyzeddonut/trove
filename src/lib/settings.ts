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
  keepUpdated: boolean;
  feedScope: FeedScope;
  autoplay: boolean;
  showReplies: boolean;
  notifReleases: boolean;
  notifMentions: boolean;
  notifDigest: boolean;
  telemetry: boolean;
  publicLibrary: boolean;
  publicFollows: boolean;
}

export const DEFAULT_ACCENT = '#8E7DF1';

export const SETTINGS_DEFAULTS: TroveSettings = {
  theme: 'dark',
  accent: DEFAULT_ACCENT,
  density: 'comfortable',
  pkg: 'auto',
  autoConsole: true,
  confirmInstall: false,
  keepUpdated: true,
  feedScope: 'following',
  autoplay: false,
  showReplies: true,
  notifReleases: true,
  notifMentions: true,
  notifDigest: false,
  telemetry: false,
  publicLibrary: true,
  publicFollows: false,
};

const LS = 'trove.settings.v1';

export const loadSettings = (): TroveSettings => {
  try {
    return { ...SETTINGS_DEFAULTS, ...(JSON.parse(localStorage.getItem(LS) || '{}') || {}) };
  } catch {
    return { ...SETTINGS_DEFAULTS };
  }
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
