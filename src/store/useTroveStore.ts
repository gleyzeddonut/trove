// Single source of truth for the storefront. "install" writes the project's
// real command into the embedded terminal (a real shell) and saves the project
// to the library. The library is persisted as full records because the catalog
// is now live GitHub data, not a static list to look ids up in.

import { create } from 'zustand';
import type { Project, TypeFilter } from '../types';
import type { UpdateState } from '../global';
import { fetchAuthedUser, uninstallCommandFor, type Account, type DiscoverSort } from '../data/github';
import { isRiskyCommand, planInstallCommands } from '../data/install';

/** Library list ordering (client-side, since the library is local). */
export type LibrarySort = 'recent' | 'stars' | 'name';
import type { YouTubeRef } from '../lib/youtube';
import { CONSOLE_MIN_H, CONSOLE_OPEN_H, DOCK_W_DEFAULT, DOCK_W_MAX, DOCK_W_MIN } from '../tokens';
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

const LS_DOCK_W = 'trove.video.w';
const clampDockW = (n: number) => Math.max(DOCK_W_MIN, Math.min(DOCK_W_MAX, Math.round(n)));
const loadDockWidth = (): number => {
  try {
    const n = parseInt(localStorage.getItem(LS_DOCK_W) || '', 10);
    return Number.isFinite(n) ? clampDockW(n) : DOCK_W_DEFAULT;
  } catch {
    return DOCK_W_DEFAULT;
  }
};

const LS_DSORT = 'trove.discoverSort.v1';
const LS_LSORT = 'trove.librarySort.v1';
const DISCOVER_SORTS: DiscoverSort[] = ['stars', 'forks', 'updated', 'best'];
const LIBRARY_SORTS: LibrarySort[] = ['recent', 'stars', 'name'];
const loadEnum = <T extends string>(key: string, allowed: T[], fallback: T): T => {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
};
const persist = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
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

// Clone URL, tolerating library items persisted before `cloneUrl` existed
// (derive it from the repo web URL, else the owner/name).
function cloneUrlOf(p: Project): string {
  return p.cloneUrl || (p.htmlUrl ? `${p.htmlUrl.replace(/\/$/, '')}.git` : `https://github.com/${p.owner}/${p.name}.git`);
}

/** A web tab in the browser chrome. `src` is the (immutable) load URL the
 *  <webview> mounts with; `url` tracks the live location for the address bar. */
export interface BrowserTab {
  id: string;
  src: string; // '' = blank start page (no webview yet)
  url: string;
  title: string;
  favicon: string;
}
let tabSeq = 0;
const nextTabId = () => `tab-${++tabSeq}`;

interface TroveState {
  query: string;
  typeFilter: TypeFilter;
  /** Discover result ordering (server-side via the GitHub Search API). */
  discoverSort: DiscoverSort;
  /** Library list ordering (client-side). */
  librarySort: LibrarySort;
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
  /** Currently-playing YouTube video/playlist in the right media dock, or null. */
  video: YouTubeRef | null;
  /** The "Up next" queue — every YouTube link from the README in view. */
  videoQueue: YouTubeRef[];
  /** Open browser tabs (the Trove app itself is the implicit pinned tab). */
  tabs: BrowserTab[];
  /** Active web tab id, or null when the Trove app tab is showing. */
  activeTabId: string | null;
  /** Width of the right media dock (video / browser) in px, persisted. */
  dockWidth: number;
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
  setDiscoverSort: (s: DiscoverSort) => void;
  setLibrarySort: (s: LibrarySort) => void;
  setConsoleOpen: (open: boolean) => void;
  toggleConsole: () => void;
  setConsoleHeight: (h: number) => void;
  setPoppedOut: (v: boolean) => void;

  isFollowing: (handle: string) => boolean;
  toggleFollow: (handle: string) => void;
  isLiked: (id: string) => boolean;
  toggleLike: (id: string) => void;
  /** Play a video; optionally seed the "Up next" queue (defaults to just it). */
  playVideo: (ref: YouTubeRef, queue?: YouTubeRef[]) => void;
  /** Close the video dock. */
  closeVideo: () => void;
  setDockWidth: (w: number) => void;

  /** Open a web tab (and activate it). No url → a blank start page. */
  openTab: (url?: string) => void;
  /** Show a web tab, or the Trove app tab when id is null. */
  activateTab: (id: string | null) => void;
  closeTab: (id: string) => void;
  /** Load a url into a tab (used by the start page + address bar "go"). */
  navigateTab: (id: string, url: string) => void;
  /** Update a tab's live metadata from webview events. */
  setTabMeta: (id: string, meta: Partial<Omit<BrowserTab, 'id'>>) => void;

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
  discoverSort: loadEnum<DiscoverSort>(LS_DSORT, DISCOVER_SORTS, 'stars'),
  librarySort: loadEnum<LibrarySort>(LS_LSORT, LIBRARY_SORTS, 'recent'),
  installed: loadInstalled(),
  consoleOpen: false,
  consoleHeight: loadHeight(),
  poppedOut: false,
  following: loadFollowing(),
  liked: [],
  video: null,
  videoQueue: [],
  tabs: [],
  activeTabId: null,
  dockWidth: loadDockWidth(),
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
    // Destructive and plural: always confirm, listing every real command.
    const cmds = items.map((p) => uninstallCommandFor(p.install)).filter((c): c is string => !!c);
    const summary = cmds.length
      ? `This will run in the terminal:\n\n${cmds.join('\n')}`
      : 'Nothing needs uninstalling — the entries are just removed.';
    const ok = typeof window !== 'undefined' && window.confirm(`Clear your library (${items.length})?\n\n${summary}`);
    if (!ok) return;
    saveInstalled([]);
    set({ installed: [], consoleOpen: cmds.length > 0 });
    for (const cmd of cmds) runInTerminal(cmd);
  },

  setUpdate: (u) => set({ update: u }),
  startUpdate: () => {
    set({ installOnReady: true });
    window.troveUpdater?.download();
  },

  setQuery: (q) => set({ query: q }),
  setType: (t) => set({ typeFilter: t }),
  setDiscoverSort: (s) => {
    persist(LS_DSORT, s);
    set({ discoverSort: s });
  },
  setLibrarySort: (s) => {
    persist(LS_LSORT, s);
    set({ librarySort: s });
  },
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
  playVideo: (ref, queue) => set({ video: ref, videoQueue: queue?.length ? queue : [ref] }),
  closeVideo: () => set({ video: null, videoQueue: [] }),
  setDockWidth: (w) => {
    const next = clampDockW(w);
    try {
      localStorage.setItem(LS_DOCK_W, String(next));
    } catch {
      /* ignore */
    }
    set({ dockWidth: next });
  },

  openTab: (url) =>
    set((s) => {
      const id = nextTabId();
      const tab: BrowserTab = {
        id,
        src: url || '',
        url: url || '',
        title: url ? 'Loading…' : 'New Tab',
        favicon: '',
      };
      return { tabs: [...s.tabs, tab], activeTabId: id };
    }),
  activateTab: (id) => set({ activeTabId: id }),
  closeTab: (id) =>
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.id === id);
      const tabs = s.tabs.filter((t) => t.id !== id);
      let activeTabId = s.activeTabId;
      if (s.activeTabId === id) {
        // Fall back to the neighbour tab, else the Trove app tab.
        const next = tabs[idx] || tabs[idx - 1] || null;
        activeTabId = next ? next.id : null;
      }
      return { tabs, activeTabId };
    }),
  navigateTab: (id, url) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, src: t.src || url, url } : t)),
    })),
  setTabMeta: (id, meta) =>
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...meta } : t)) })),

  isInstalled: (id) => get().installed.some((p) => p.id === id),

  install: (p) => {
    const addToLibrary = () => {
      if (!get().installed.some((x) => x.id === p.id)) {
        set((s) => {
          const next = [...s.installed, p];
          saveInstalled(next);
          return { installed: next };
        });
      }
    };

    // Clone-and-build apps (venv → deps → build): clone first (safe — just a
    // download), then ask before running the setup steps that touch the machine.
    if (p.setup && p.setup.length) {
      const plan = planInstallCommands(p.setup, cloneUrlOf(p), p.name);

      // If we can't produce a trustworthy clone command (unrecognized/unsafe
      // URL or an odd repo dir name), don't run anything in the real shell —
      // just record it and point the user at the repo.
      if (!plan.clone || !plan.dir) {
        addToLibrary();
        set({ consoleOpen: true });
        runInTerminal(`echo "Open ${p.htmlUrl} and follow its README to install."`);
        return;
      }

      const warn = plan.risky
        ? '\n\n⚠️  These steps include commands that download & run code or need sudo. Only continue if you trust this repo.'
        : '';

      // With "confirm before running" on, approve the WHOLE plan up front (clone
      // included) rather than cloning silently — the user asked to vet every
      // terminal command.
      if (get().settings.confirmInstall) {
        const ok =
          typeof window !== 'undefined' &&
          window.confirm(`Install ${p.name}?\n\nThis will run:\n\n${plan.clone}\n${plan.steps.map((s) => `${plan.dir}/ » ${s}`).join('\n')}${warn}`);
        if (!ok) return;
        set({ consoleOpen: true });
        addToLibrary();
        runInTerminal(plan.clone);
        if (plan.steps.length) runInTerminal([`cd ${plan.dir}`, ...plan.steps].join(' && '));
        return;
      }

      // Default flow: clone first (safe — validated URL, just a download), then
      // ask before the setup steps that actually touch the machine.
      if (get().settings.autoConsole) set({ consoleOpen: true });
      addToLibrary();

      // Phase 1: clone only (no cd), so the cwd is unchanged if it fails.
      runInTerminal(plan.clone);

      if (!plan.steps.length) return; // nothing to build beyond the clone

      // Phase 2: gated by confirmation. `cd <dir> &&` both enters the repo and
      // guards the chain — if the clone failed, cd fails and nothing else runs.
      const ok =
        typeof window !== 'undefined' &&
        window.confirm(`Set up ${p.name}?\n\nOnce the clone finishes, this runs:\n\n${plan.steps.join('\n')}${warn}`);
      if (!ok) {
        runInTerminal(`cd ${plan.dir}`); // leave them inside the cloned repo
        return;
      }
      runInTerminal([`cd ${plan.dir}`, ...plan.steps].join(' && '));
      return;
    }

    // One-line install. A README-derived line that chains, pipes, substitutes,
    // or escalates (`; curl … | sh`, `$(…)`, sudo) is not a plain package
    // install: show it in full and ask, whatever the confirm setting says.
    const risky = isRiskyCommand(p.install);
    if (risky || get().settings.confirmInstall) {
      const warn = risky
        ? '\n\n⚠️  This is not a plain package install — it chains, pipes, downloads, or needs sudo. Only continue if you trust this repo.'
        : '';
      const ok = typeof window !== 'undefined' && window.confirm(`Run this in the terminal?\n\n${p.install}${warn}`);
      if (!ok) return;
    }
    if (get().settings.autoConsole) set({ consoleOpen: true });
    addToLibrary();
    runInTerminal(p.install);
  },

  uninstall: (p) => {
    if (!get().installed.some((x) => x.id === p.id)) return;
    // Run the real uninstall command in the terminal when there is one;
    // otherwise (git clone / npx / docker / …) just dropping it is the action.
    const cmd = uninstallCommandFor(p.install);
    // Same gate as install: the user asked to vet every terminal command.
    if (cmd && get().settings.confirmInstall) {
      const ok = typeof window !== 'undefined' && window.confirm(`Run this in the terminal?\n\n${cmd}`);
      if (!ok) return;
    }
    set((s) => {
      const next = s.installed.filter((x) => x.id !== p.id);
      saveInstalled(next);
      return { installed: next };
    });
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
