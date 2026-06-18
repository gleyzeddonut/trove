// Shared domain types.

export type ProjectType = 'App' | 'Tool' | 'Library' | 'Creative';
export type TypeFilter = 'All' | ProjectType;

export interface Project {
  id: string;
  name: string;
  owner: string;
  ownerName: string;
  /** One-line description (cards / rows). */
  blurb: string;
  /** Longer description. */
  desc: string;
  lang: string;
  langColor: string;
  /** Display string, e.g. "8.2k". */
  stars: string;
  /** Numeric, for derived stats. */
  starsNum: number;
  /** Weekly delta, e.g. "+640". */
  delta: string;
  type: ProjectType;
  /** Short label, e.g. "CLI". */
  tag: string;
  updated: string;
  license: string;
  /** Repository topics (for the expandable row + detail chips). */
  topics: string[];
  /** Numeric fork count, for the expandable row summary. */
  forksNum: number;
  /** Link to the repository page on github.com. */
  htmlUrl: string;
  /** CSS gradient string (thumb / cover). */
  cover: string;
  /** Representative accent color. */
  accent: string;
  /** The install command string. */
  install: string;
  /** Search keyword synonyms. */
  kw: string;
  // README content (detail page):
  about: string;
  features: string[];
  usage: string;
  requires: string;
}
