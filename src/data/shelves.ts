// Curated Discover shelves. Each is an independent GitHub search across the
// whole index (not a slice of a loaded page), so a category has real depth —
// the row shows a preview and "see all" opens the full, paginated search.
//
// Two kinds: domain shelves (topic: entry points) and editorial-angle shelves
// (re-ranked so they aren't redundant with the Stars sort). GitHub's `sort` is
// a URL param, so `query` holds only q-qualifiers; `sort` is separate.

import type { DiscoverSort } from './github';

/** Icon key — maps to a stroke SVG in <ShelfIcon> (matches the app's icon set). */
export type ShelfIconId = 'gem' | 'ai' | 'terminal' | 'server' | 'game' | 'shield' | 'creative' | 'swap';

export interface Shelf {
  id: string;
  title: string;
  icon: ShelfIconId;
  /** One-line explainer shown on hovering the shelf header. */
  description: string;
  query: string; // GitHub search `q` (qualifiers only)
  sort: DiscoverSort;
}

export const SHELVES: Shelf[] = [
  { id: 'hidden-gems', title: 'Hidden gems', icon: 'gem', description: 'Quality repos under ~2k stars — the good stuff the giants overshadow.', query: 'stars:200..2000', sort: 'stars' },
  { id: 'ai', title: 'AI & LLMs', icon: 'ai', description: 'Machine learning, models, and LLM tooling.', query: 'topic:machine-learning', sort: 'stars' },
  { id: 'cli', title: 'CLI & terminal tools', icon: 'terminal', description: 'Command-line apps and things that live in your terminal.', query: 'topic:cli', sort: 'stars' },
  { id: 'self-hosted', title: 'Self-hosted', icon: 'server', description: 'Run-it-yourself apps you can host on your own server.', query: 'topic:self-hosted', sort: 'stars' },
  { id: 'gamedev', title: 'Game dev & engines', icon: 'game', description: 'Game engines, frameworks, and tools for building games.', query: 'topic:game-engine', sort: 'stars' },
  { id: 'security', title: 'Security & hacking', icon: 'shield', description: 'Security tooling, pentesting, and defensive projects.', query: 'topic:security', sort: 'stars' },
  { id: 'creative', title: 'Creative coding', icon: 'creative', description: 'Generative art, graphics, and creative-coding projects.', query: 'topic:creative-coding', sort: 'stars' },
  { id: 'alternatives', title: 'Open-source alternatives', icon: 'swap', description: 'Open-source replacements for paid and SaaS products.', query: 'topic:alternative', sort: 'stars' },
];
