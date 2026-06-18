// Single source of truth for the storefront. "install" writes the project's
// real command into the embedded terminal (a real shell) and saves the project
// to the library. The library is persisted as full records because the catalog
// is now live GitHub data, not a static list to look ids up in.

import { create } from 'zustand';
import type { Project, TypeFilter } from '../types';
import type { UpdateState } from '../global';

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
  /** Followed creator handles, persisted. */
  following: string[];
  /** Liked activity-post ids, session-only. */
  liked: string[];
  /** Auto-update status (driven by the main process). */
  update: UpdateState;
  /** Whether to auto-install once the requested update finishes downloading. */
  installOnReady: boolean;

  setQuery: (q: string) => void;
  setType: (t: TypeFilter) => void;
  setConsoleOpen: (open: boolean) => void;
  toggleConsole: () => void;

  isFollowing: (handle: string) => boolean;
  toggleFollow: (handle: string) => void;
  isLiked: (id: string) => boolean;
  toggleLike: (id: string) => void;

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
  following: loadFollowing(),
  liked: [],
  update: { status: 'idle' },
  installOnReady: false,

  setUpdate: (u) => set({ update: u }),
  startUpdate: () => {
    set({ installOnReady: true });
    window.troveUpdater?.download();
  },

  setQuery: (q) => set({ query: q }),
  setType: (t) => set({ typeFilter: t }),
  setConsoleOpen: (open) => set({ consoleOpen: open }),
  toggleConsole: () => set((s) => ({ consoleOpen: !s.consoleOpen })),

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

  isInstalled: (id) => get().installed.some((p) => p.id === id),

  install: (p) => {
    set({ consoleOpen: true });
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
  },

  open: (p) => {
    set({ consoleOpen: true });
    runInTerminal(`echo "▸ launched ${p.name} (${p.lang})"`);
  },
}));
