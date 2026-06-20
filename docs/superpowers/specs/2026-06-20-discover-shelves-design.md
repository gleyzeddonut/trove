# Discover shelves — replacing the type chips with curated collections

## Problem

Discover currently organizes repos with four chips — `App / Tool / Library / Creative` — derived by a fuzzy `deriveType` heuristic (repo topics + language). Two real problems:

1. **The categories are arbitrary.** GitHub has no "category" field; the type is guessed, and nobody browses repos by an abstract bucket like "Creative."
2. **The counts (and the filter) are fake.** The chips classify and tally only the ~100 repos currently loaded on the page, client-side. A different search loads a different 100, so the tallies drift, and a category can show "2 repos" simply because only 2 of the loaded 100 matched — not because GitHub only has 2.

## Solution

Replace the Discover type chips with **curated collection shelves** — an app-store-style landing of horizontal rows, where **each shelf is its own independent GitHub search across the entire index** (not a filter over a shared loaded pool). This fixes both problems: categories become real, server-side searches with genuine depth, and "how many" stops being a misleading client-side tally.

### Shelf lineup (order tweakable)

Two kinds: **domain** shelves (`topic:` entry points) and **editorial-angle** shelves (re-ranked by something other than raw popularity, so they're not redundant with the Stars sort).

Each shelf is `{ id, title, icon, query, sort }`, where `query` is the GitHub
search `q` (qualifiers only) and `sort` is the API sort param (`stars` for all
of these — note GitHub's `sort` is a URL param, *not* a `sort:` token inside
`q`).

| # | Shelf | Icon | `query` (q) | `sort` |
|---|-------|------|-------------|--------|
| 1 | Hidden gems (anchor) | 💎 | `stars:200..2000` | stars |
| 2 | AI & LLMs | 🤖 | `topic:machine-learning` | stars |
| 3 | CLI & terminal tools | 🛠 | `topic:cli` | stars |
| 4 | Self-hosted | 🏠 | `topic:self-hosted` | stars |
| 5 | Game dev & engines | 🎮 | `topic:game-engine` | stars |
| 6 | Security & hacking | 🔐 | `topic:security` | stars |
| 7 | Creative coding | 🎨 | `topic:creative-coding` | stars |
| 8 | Open-source alternatives | 🔄 | `topic:alternative` | stars |

"Hidden gems" leads — it signals Trove surfaces more than the famous top-100.

## Behavior

- **Discover landing (empty search):** a vertical stack of the shelves. Each shelf = a header (icon + title + "see all →") over a horizontal-scroll row of compact repo cards.
- **User types a search:** the shelf stack is replaced by the existing flat results list (with the Sort control). Clearing the search restores the shelves.
- **"See all →":** runs that shelf's query in the flat list — sets the search query to the shelf's `query` (e.g. `topic:cli`) and the sort to the shelf's `sort`. Because the shelf and the list share the same session cache key (`sort|query`), the already-fetched page is reused — "see all" paints instantly, then paginates the full category (100/page, up to GitHub's 1,000-result cap). So a category has real depth, not just the 12-card preview.
- The **App/Tool/Library/Creative chips are removed from Discover**, along with the client-side type filter there.

## Data & rate limits

- Each shelf reuses the existing `searchRepos(query, page, sort)` and the session search cache (keyed by `sort|query`), so a shelf is fetched once per session and revisiting Discover is instant and spends no API calls.
- **Lazy-loaded on scroll:** a shelf fetches only when it scrolls near the viewport (IntersectionObserver). Above-the-fold shelves load immediately (~2–3 calls); the rest load as the user scrolls. This avoids firing 8 search calls at once and tripping GitHub's search rate limit (10/min unauthenticated, 30/min authenticated).
- A shelf fetches the standard first page (the existing 100/page) once via `useGithubSearch`; the row **displays the first ~12** and "see all" reuses the same cached page (so it's instant). No separate small fetch — one cached request serves both the preview and the start of the full list.
- A shelf that errors or returns zero results **hides itself**; while loading it shows skeleton cards.

## Components

- **`src/data/shelves.ts`** — single source of truth: `Shelf = { id, title, icon, query }[]`.
- **`Shelf`** (new) — renders a shelf header + a lazy, horizontally-scrolling row. Owns the IntersectionObserver that flips `enabled` for its fetch; renders skeletons while loading; hides on empty/error.
- **`ShelfCard`** (new) — compact card: cover thumb, name, `owner/repo`, ★ stars, language dot, one-line blurb. Whole card → detail page. (No inline install chip in the row — the row stays scannable; install lives on the detail page / the flat list rows.)
- **`Storefront` (discover mode)** — when the search query is empty, render the shelf stack instead of the type chips + list; when there's a query, render the existing list (unchanged). The hero + search bar stay on top in both states.
- Reuse `useGithubSearch(query, enabled, sort)` per shelf for fetching (it already does first-page fetch + session cache + stale-while-revalidate); the `enabled` flag is driven by the shelf's visibility.

## Out of scope (kept as-is)

- **Library** keeps its current chips + filtering — its counts are real (your local installed list), so the drift problem doesn't apply there.
- **`deriveType`** stays — the per-row `type` pill and the detail-page topic chips still display a repo's type; only the Discover *filter chips* are removed.
- Per-shelf real "counts" are not shown (a number on every shelf would cost one search call each); the shelf is its own search, so depth is reached via "see all", not a badge.

## Success criteria

- Discover's no-search landing shows the shelf stack; each shelf's cards are that category's top repos pulled from across all of GitHub (verified: clicking into a shelf and a direct GitHub search for the same query return the same repos).
- No shelf is limited by a shared 100-repo pool; "see all" paginates the full category.
- Landing does not exceed GitHub's search rate limit on load (shelves below the fold defer until scrolled into view).
- The old Discover type chips and their drifting counts are gone.
