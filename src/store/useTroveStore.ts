// Single source of truth for the storefront. "install" writes the project's
// real command into the embedded terminal (a real shell) and saves the project
// to the library. The library is persisted as full records because the catalog
// is now live GitHub data, not a static list to look ids up in.

import { create } from 'zustand';
import type { Project, TypeFilter } from '../types';
import type { UpdateState } from '../global';
import { fetchAuthedUser, uninstallCommandFor, type Account } from '../data/github';
import type { YouTubeRef } from '../lib/youtube';
import { CONSOLE_MIN_H, CONSOLE_OPEN_H } from '../tokens';
import {
  applyTheme,
  loadSettings,
  persistSettings,
  SETTINGS_DEFAULTS,
  type TroveSettings,
} from '../lib/settings';

const LS_TOKEN = 'trove.ghtoken';
const hasToken = (): boolean => {
  try {
    return !!localStorage.getItem(LS_TOKEN) || !!window.troveEnv?.githubToken;
  } catch {
    return false;
  }
};

const LS_HEIGHT = 'trove.consoleHeight';
const loadHeight = (): number => {
  try {
    const n = parseInt(localStorage.getItem(LS_HEIGHT) || '', 10);
    return Number.isFinite(n) && n >= CONSOLE_MIN_H ? n : CONSOLE_OPEN_H;
  } catch {
    return CONSOLE_OPEN_H;
  }
};

const LS = 'trove.installed.v1';
const LS_FOLLOW = 'trove.following.v1';

const loadFollowing = (): string[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_FOLLOW) || '[]');
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};
const saveFollowing = (a: string[]) => {
  try {
    localStorage.setItem(LS_FOLLOW, JSON.stringify(a));
  } catch {
    /* ignore */
  }
};

const loadInstalled = (): Project[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(LS) || '[]');
    if (Array.isArray(raw)) {
      // Tolerate the old format (array of id strings) by dropping it — those
      // ids can't be rehydrated without the static catalog.
      return raw.filter((x): x is Project => !!x && typeof x === 'object' && 'id' in x);
    }
    return [];
  } catch {
    return [];
  }
};
const saveInstalled = (a: Project[]) => {
  try {
    localStorage.setItem(LS, JSON.stringify(a));
  } catch {
    /* ignore */
  }
};

function runInTerminal(command: string) {
  window.troveTerminal?.run(command);
}

interface TroveState {
  query: string;
  typeFilter: TypeFilter;
  installed: Project[];
  consoleOpen: boolean;
  /** Dock height in px (vertically resizable), persisted. */
  consoleHeight: number;
  /** True when the terminal is in its own window. */
  poppedOut: boolean;
  /** Followed creator handles, persisted. */
  following: string[];
  /** Liked activity-post ids, session-only. */
  liked: string[];
  /** Currently-playing YouTube video/playlist in the side mini-player, or null. */
  video: YouTubeRef | null;
  /** Auto-update status (driven by the main process). */
  update: UpdateState;
  /** Whether to auto-install once the requested update finishes downloading. */
  installOnReady: boolean;
  /** User settings (appearance / install / feed / …), persisted. */
  settings: TroveSettings;
  /** The connected GitHub account (from the token), or null. */
  account: Account | null;
  connecting: boolean;
  /** Transient connect-token input — kept here so it survives a theme remount. */
  connectToken: string;
  /** Bumped to force a re-skin remount on live theme/accent changes. */
  themeTick: number;

  setSetting: <K extends keyof TroveSettings>(key: K, value: TroveSettings[K]) => void;
  resetSettings: () => void;
  reloadSettings: () => void;
  bumpTheme: () => void;
  setConnectToken: (v: string) => void;
  connectGithub: (token: string) => Promise<void>;
  disconnectGithub: () => void;
  hydrateAccount: () => Promise<void>;
  clearLibrary: () => void;

  setQuery: (q: string) => void;
  setType: (t: TypeFilter) => void;
  setConsoleOpen: (open: boolean) => void;
  toggleConsole: () => void;
  setConsoleHeight: (h: number) => void;
  setPoppedOut: (v: boolean) => void;

  isFollowing: (handle: string) => boolean;
  toggleFollow: (handle: string) => void;
  isLiked: (id: string) => boolean;
  toggleLike: (id: string) => void;
  playVideo: (ref: YouTubeRef) => void;
  closeVideo: () => void;

  setUpdate: (u: UpdateState) => void;
  /** Begin downloading the available update; install + restart when ready. */
  startUpdate: () => void;

  isInstalled: (id: string) => boolean;
  /** Run the install command for real in the embedded terminal + add to library. */
  install: (p: Project) => void;
  /** Remove from the library (does not touch the real machine). */
  uninstall: (p: Project) => void;
  /** "Launch" an installed project — echoes into the terminal. */
  open: (p: Project) => void;
}

export const useTroveStore = create<TroveState>((set, get) => ({
  query: '',
  typeFilter: 'All',
  installed: loadInstalled(),
  consoleOpen: false,
  consoleHeight: loadHeight(),
  poppedOut: false,
  following: loadFollowing(),
  liked: [],
  video: null,
  update: { status: 'idle' },
  installOnReady: false,
  settings: loadSettings(),
  account: null,
  connecting: false,
  connectToken: '',
  themeTick: 0,

  setConnectToken: (v) => set({ connectToken: v }),

  setSetting: (key, value) =>
    set((s) => {
      const next = { ...s.settings, [key]: value };
      persistSettings(next);
      if (key === 'theme' || key === 'accent' || key === 'density') {
        applyTheme(next);
        // Density applies purely via CSS ([data-density]); only theme/accent
        // need a remount to re-resolve inline var() colors.
        return key === 'density' ? { settings: next } : { settings: next, themeTick: s.themeTick + 1 };
      }
      return { settings: next };
    }),
  resetSettings: () =>
    set((s) => {
      persistSettings(SETTINGS_DEFAULTS);
      applyTheme(SETTINGS_DEFAULTS);
      return { settings: { ...SETTINGS_DEFAULTS }, themeTick: s.themeTick + 1 };
    }),
  // Re-read settings from storage and apply — used to sync theme across windows
  // (the popped-out terminal) via the localStorage `storage` event.
  reloadSettings: () =>
    set((s) => {
      const next = loadSettings();
      applyTheme(next);
      return { settings: next, themeTick: s.themeTick + 1 };
    }),
  bumpTheme: () => set((s) => ({ themeTick: s.themeTick + 1 })),

  connectGithub: async (token) => {
    const t = token.trim();
    if (!t) return;
    try {
      localStorage.setItem(LS_TOKEN, t);
    } catch {
      /* ignore */
    }
    set({ connecting: true });
    try {
      const account = await fetchAuthedUser();
      set({ account, connecting: false });
    } catch {
      // bad token — roll back so the UI doesn't show a false "connected" state
      try {
        localStorage.removeItem(LS_TOKEN);
      } catch {
        /* ignore */
      }
      set({ account: null, connecting: false });
      // If an env-provided token still works, restore the connected account.
      get().hydrateAccount();
    }
  },
  disconnectGithub: () => {
    try {
      localStorage.removeItem(LS_TOKEN);
    } catch {
      /* ignore */
    }
    set({ account: null });
  },
  hydrateAccount: async () => {
    if (!hasToken() || get().account) return;
    try {
      const account = await fetchAuthedUser();
      set({ account });
    } catch {
      /* token absent or invalid */
    }
  },
  clearLibrary: () => {
    const items = get().installed;
    if (items.length === 0) return;
    saveInstalled([]);
    set({ installed: [], consoleOpen: true });
    for (const p of items) {
      const cmd = uninstallCommandFor(p.install);
      if (cmd) runInTerminal(cmd);
    }
  },

  setUpdate: (u) => set({ update: u }),
  startUpdate: () => {
    set({ installOnReady: true });
    window.troveUpdater?.download();
  },

  setQuery: (q) => set({ query: q }),
  setType: (t) => set({ typeFilter: t }),
  setConsoleOpen: (open) => set({ consoleOpen: open }),
  toggleConsole: () => set((s) => ({ consoleOpen: !s.consoleOpen })),
  setConsoleHeight: (h) => {
    const next = Math.max(CONSOLE_MIN_H, Math.round(h));
    try {
      localStorage.setItem(LS_HEIGHT, String(next));
    } catch {
      /* ignore */
    }
    set({ consoleHeight: next });
  },
  setPoppedOut: (v) => set({ poppedOut: v }),

  isFollowing: (handle) => get().following.includes(handle),
  toggleFollow: (handle) =>
    set((s) => {
      const next = s.following.includes(handle)
        ? s.following.filter((x) => x !== handle)
        : [...s.following, handle];
      saveFollowing(next);
      return { following: next };
    }),
  isLiked: (id) => get().liked.includes(id),
  toggleLike: (id) =>
    set((s) => ({
      liked: s.liked.includes(id) ? s.liked.filter((x) => x !== id) : [...s.liked, id],
    })),
  playVideo: (ref) => set({ video: ref }),
  closeVideo: () => set({ video: null }),

  isInstalled: (id) => get().installed.some((p) => p.id === id),

  install: (p) => {
    // Optional safety check before running a real command in the shell.
    if (get().settings.confirmInstall) {
      const ok = typeof window !== 'undefined' && window.confirm(`Run this in the terminal?\n\n${p.install}`);
      if (!ok) return;
    }
    if (get().settings.autoConsole) set({ consoleOpen: true });
    if (!get().installed.some((x) => x.id === p.id)) {
      set((s) => {
        const next = [...s.installed, p];
        saveInstalled(next);
        return { installed: next };
      });
    }
    runInTerminal(p.install);
  },

  uninstall: (p) => {
    if (!get().installed.some((x) => x.id === p.id)) return;
    set((s) => {
      const next = s.installed.filter((x) => x.id !== p.id);
      saveInstalled(next);
      return { installed: next };
    });
    // Run the real uninstall command in the terminal when there is one;
    // otherwise (git clone / npx / docker / …) just dropping it is the action.
    const cmd = uninstallCommandFor(p.install);
    if (cmd) {
      set({ consoleOpen: true });
      runInTerminal(cmd);
    }
  },

  open: (p) => {
    set({ consoleOpen: true });
    runInTerminal(`echo "▸ launched ${p.name} (${p.lang})"`);
  },
}));
