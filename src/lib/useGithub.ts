// React hooks over the GitHub data source. Search is debounced; both guard
// against out-of-order responses on unmount / param change.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SEARCH_MAX_PAGE,
  cachedProject,
  cachedRepoDetail,
  fetchCreatorProfile,
  fetchFeed,
  fetchRepo,
  previewDetail,
  searchRepos,
  type Contributor,
  type DiscoverSort,
  type CreatorProfile,
  type FeedData,
  type RepoDetail,
} from '../data/github';
import type { Project } from '../types';

interface SearchState {
  results: Project[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

// Session-lived cache keyed by query, so revisiting Discover (or re-running a
// previous search) is instant and spends no API calls. Entries older than
// FRESH_MS are still shown immediately, then refreshed in the background
// (stale-while-revalidate). Cleared when the app is relaunched.
interface SearchCacheEntry {
  results: Project[];
  total: number;
  page: number;
  ts: number;
}
const searchCache = new Map<string, SearchCacheEntry>();
const FRESH_MS = 5 * 60 * 1000;
const keyOf = (q: string, sort: DiscoverSort) => `${sort}|${q.trim().toLowerCase()}`;

export function useGithubSearch(query: string, enabled: boolean, sort: DiscoverSort = 'stars', immediate = false): SearchState {
  // Seed initial state from cache so a revisit paints with no spinner/flash.
  const seed = enabled ? searchCache.get(keyOf(query, sort)) : undefined;
  const [results, setResults] = useState<Project[]>(seed?.results ?? []);
  const [total, setTotal] = useState(seed?.total ?? 0);
  const [loading, setLoading] = useState(enabled && !seed);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageRef = useRef(seed?.page ?? 1);
  const reqRef = useRef(0); // guards against out-of-order / stale responses

  useEffect(() => {
    if (!enabled) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      setError(null);
      return;
    }
    const key = keyOf(query, sort);
    const token = ++reqRef.current;
    const cached = searchCache.get(key);

    if (cached) {
      // Serve instantly from cache…
      pageRef.current = cached.page;
      setResults(cached.results);
      setTotal(cached.total);
      setError(null);
      setLoading(false);
      // …and silently refresh if it's gone stale. Skip when the user has paged
      // past the first page, so a refresh doesn't collapse loaded results.
      if (Date.now() - cached.ts > FRESH_MS && cached.page === 1) {
        searchRepos(query, 1, sort)
          .then(({ items, totalCount }) => {
            if (reqRef.current !== token) return;
            searchCache.set(key, { results: items, total: totalCount, page: 1, ts: Date.now() });
            pageRef.current = 1;
            setResults(items);
            setTotal(totalCount);
          })
          .catch(() => {
            /* keep showing cached data on error */
          });
      }
      return;
    }

    // Cache miss → fetch (debounce typed queries, load defaults immediately).
    pageRef.current = 1;
    setLoading(true);
    setError(null);
    // Debounce typed queries; shelves (immediate) and the default load fire now.
    const delay = immediate || !query.trim() ? 0 : 420;
    const id = window.setTimeout(async () => {
      try {
        const { items, totalCount } = await searchRepos(query, 1, sort);
        if (reqRef.current !== token) return;
        searchCache.set(key, { results: items, total: totalCount, page: 1, ts: Date.now() });
        setResults(items);
        setTotal(totalCount);
        setLoading(false);
      } catch (e) {
        if (reqRef.current !== token) return;
        setResults([]);
        setTotal(0);
        setError((e as Error).message || 'Failed to load.');
        setLoading(false);
      }
    }, delay);
    return () => window.clearTimeout(id);
  }, [query, enabled, sort, immediate]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore) return;
    const next = pageRef.current + 1;
    if (next > SEARCH_MAX_PAGE) return;
    const token = reqRef.current;
    setLoadingMore(true);
    try {
      const { items } = await searchRepos(query, next, sort);
      if (reqRef.current !== token) return;
      pageRef.current = next;
      setResults((prev) => {
        const merged = [...prev, ...items];
        const key = keyOf(query, sort);
        const entry = searchCache.get(key);
        if (entry) searchCache.set(key, { ...entry, results: merged, page: next });
        return merged;
      });
    } catch (e) {
      if (reqRef.current === token) setError((e as Error).message || 'Failed to load more.');
    } finally {
      setLoadingMore(false);
    }
  }, [query, loading, loadingMore, sort]);

  const hasMore = !loading && results.length > 0 && results.length < total && pageRef.current < SEARCH_MAX_PAGE;

  return { results, total, loading, loadingMore, error, hasMore, loadMore };
}

interface RepoState {
  detail: RepoDetail | null;
  loading: boolean;
  error: string | null;
}

// Seed from caches so the page paints immediately: a full cached detail (instant,
// no fetch) or a preview built from the list's project data (header/sidebar now,
// README + contributors stream in).
function seedRepo(owner?: string, name?: string): RepoState {
  if (!owner || !name) return { detail: null, loading: true, error: null };
  const cached = cachedRepoDetail(owner, name);
  if (cached) return { detail: cached, loading: false, error: null };
  const preview = cachedProject(owner, name);
  return { detail: preview ? previewDetail(preview) : null, loading: true, error: null };
}

export function useGithubRepo(owner?: string, name?: string): RepoState {
  const [state, setState] = useState<RepoState>(() => seedRepo(owner, name));

  useEffect(() => {
    if (!owner || !name) {
      setState({ detail: null, loading: false, error: 'Project not found.' });
      return;
    }
    const seed = seedRepo(owner, name);
    setState(seed);
    if (!seed.loading) return; // fresh cached detail — nothing to fetch
    let active = true;
    fetchRepo(owner, name)
      .then((detail) => active && setState({ detail, loading: false, error: null }))
      .catch(
        (e: Error) =>
          active &&
          setState((s) => ({ detail: s.detail, loading: false, error: s.detail ? null : e.message || 'Failed to load.' })),
      );
    return () => {
      active = false;
    };
  }, [owner, name]);

  return state;
}

interface CreatorState {
  profile: CreatorProfile | null;
  loading: boolean;
  error: string | null;
}

export function useCreator(handle?: string): CreatorState {
  const [state, setState] = useState<CreatorState>({ profile: null, loading: true, error: null });

  useEffect(() => {
    if (!handle) {
      setState({ profile: null, loading: false, error: 'Creator not found.' });
      return;
    }
    let active = true;
    setState({ profile: null, loading: true, error: null });
    fetchCreatorProfile(handle)
      .then((profile) => active && setState({ profile, loading: false, error: null }))
      .catch((e: Error) => active && setState({ profile: null, loading: false, error: e.message || 'Failed to load.' }));
    return () => {
      active = false;
    };
  }, [handle]);

  return state;
}

interface FeedState {
  data: FeedData | null;
  loading: boolean;
  error: string | null;
}

export function useFeed(following: string[], scope: 'following' | 'all' = 'following'): FeedState {
  const [state, setState] = useState<FeedState>({ data: null, loading: true, error: null });
  const key = `${scope}|${following.join(',')}`;
  const hasData = useRef(false);

  useEffect(() => {
    let active = true;
    // Keep showing prior data while re-fetching (e.g. after a follow toggle).
    setState((s) => ({ data: s.data, loading: !hasData.current, error: null }));
    fetchFeed(following, scope)
      .then((data) => {
        if (!active) return;
        hasData.current = true;
        setState({ data, loading: false, error: null });
      })
      .catch((e: Error) => {
        if (!active) return;
        setState((s) => ({ data: s.data, loading: false, error: e.message || 'Failed to load.' }));
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}

export type { Contributor };
