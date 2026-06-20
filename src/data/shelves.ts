// Curated Discover shelves. Each is an independent GitHub search across the
// whole index (not a slice of a loaded page), so a category has real depth —
// the row shows a preview and "see all" opens the full, paginated search.
//
// Two kinds: domain shelves (topic: entry points) and editorial-angle shelves
// (re-ranked so they aren't redundant with the Stars sort). GitHub's `sort` is
// a URL param, so `query` holds only q-qualifiers; `sort` is separate.

import type { DiscoverSort } from './github';

export interface Shelf {
  id: string;
  title: string;
  icon: string; // emoji
  query: string; // GitHub search `q` (qualifiers only)
  sort: DiscoverSort;
}

export const SHELVES: Shelf[] = [
  { id: 'hidden-gems', title: 'Hidden gems', icon: '💎', query: 'stars:200..2000', sort: 'stars' },
  { id: 'ai', title: 'AI & LLMs', icon: '🤖', query: 'topic:machine-learning', sort: 'stars' },
  { id: 'cli', title: 'CLI & terminal tools', icon: '🛠', query: 'topic:cli', sort: 'stars' },
  { id: 'self-hosted', title: 'Self-hosted', icon: '🏠', query: 'topic:self-hosted', sort: 'stars' },
  { id: 'gamedev', title: 'Game dev & engines', icon: '🎮', query: 'topic:game-engine', sort: 'stars' },
  { id: 'security', title: 'Security & hacking', icon: '🔐', query: 'topic:security', sort: 'stars' },
  { id: 'creative', title: 'Creative coding', icon: '🎨', query: 'topic:creative-coding', sort: 'stars' },
  { id: 'alternatives', title: 'Open-source alternatives', icon: '🔄', query: 'topic:alternative', sort: 'stars' },
];
