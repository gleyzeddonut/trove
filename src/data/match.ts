// Shared search/filter matcher — token-based AND match across a rich haystack,
// so multi-word queries and keyword synonyms both work. Used by the storefront
// grid and the console's search/filter commands so the two never diverge.

import type { Project, TypeFilter } from '../types';

export function troveMatch(p: Project, query: string, type: TypeFilter): boolean {
  if (type && type !== 'All' && p.type !== type) return false;
  const q = (query || '').trim().toLowerCase();
  if (!q) return true;
  const hay = (
    p.name +
    ' ' +
    p.blurb +
    ' ' +
    (p.desc || '') +
    ' ' +
    p.tag +
    ' ' +
    p.lang +
    ' ' +
    p.owner +
    ' ' +
    (p.kw || '')
  ).toLowerCase();
  return q.split(/\s+/).every((tok) => hay.includes(tok));
}
