// React hooks over the GitHub data source. Search is debounced; both guard
// against out-of-order responses on unmount / param change.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SEARCH_MAX_PAGE,
  fetchCreatorProfile,
  fetchFeed,
  fetchRepo,
  searchRepos,
  type Contributor,
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

export function useGithubSearch(query: string, enabled: boolean): SearchState {
  const [results, setResults] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageRef = useRef(1);
  const reqRef = useRef(0); // guards against out-of-order / stale responses

  // (re)load page 1 whenever the query changes
  useEffect(() => {
    if (!enabled) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++reqRef.current;
    pageRef.current = 1;
    setLoading(true);
    setError(null);
    const delay = query.trim() ? 420 : 0; // debounce typing, load defaults immediately
    const id = window.setTimeout(async () => {
      try {
        const { items, totalCount } = await searchRepos(query, 1);
        if (reqRef.current === token) {
          setResults(items);
          setTotal(totalCount);
          setLoading(false);
        }
      } catch (e) {
        if (reqRef.current === token) {
          setResults([]);
          setTotal(0);
          setError((e as Error).message || 'Failed to load.');
          setLoading(false);
        }
      }
    }, delay);
    return () => window.clearTimeout(id);
  }, [query, enabled]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore) return;
    const next = pageRef.current + 1;
    if (next > SEARCH_MAX_PAGE) return;
    const token = reqRef.current;
    setLoadingMore(true);
    try {
      const { items } = await searchRepos(query, next);
      if (reqRef.current === token) {
        pageRef.current = next;
        setResults((prev) => [...prev, ...items]);
      }
    } catch (e) {
      if (reqRef.current === token) setError((e as Error).message || 'Failed to load more.');
    } finally {
      setLoadingMore(false);
    }
  }, [query, loading, loadingMore]);

  const hasMore = !loading && results.length > 0 && results.length < total && pageRef.current < SEARCH_MAX_PAGE;

  return { results, total, loading, loadingMore, error, hasMore, loadMore };
}

interface RepoState {
  detail: RepoDetail | null;
  loading: boolean;
  error: string | null;
}

export function useGithubRepo(owner?: string, name?: string): RepoState {
  const [state, setState] = useState<RepoState>({ detail: null, loading: true, error: null });

  useEffect(() => {
    if (!owner || !name) {
      setState({ detail: null, loading: false, error: 'Project not found.' });
      return;
    }
    let active = true;
    setState({ detail: null, loading: true, error: null });
    fetchRepo(owner, name)
      .then((detail) => active && setState({ detail, loading: false, error: null }))
      .catch((e: Error) => active && setState({ detail: null, loading: false, error: e.message || 'Failed to load.' }));
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

export function useFeed(following: string[]): FeedState {
  const [state, setState] = useState<FeedState>({ data: null, loading: true, error: null });
  const key = following.join(',');
  const hasData = useRef(false);

  useEffect(() => {
    let active = true;
    // Keep showing prior data while re-fetching (e.g. after a follow toggle).
    setState((s) => ({ data: s.data, loading: !hasData.current, error: null }));
    fetchFeed(following)
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
