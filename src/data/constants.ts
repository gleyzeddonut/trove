import type { ProjectType } from '../types';

export const TROVE_TYPES: ProjectType[] = ['App', 'Tool', 'Library', 'Creative'];

// GitHub "linguist" dot colors for the languages we're most likely to see,
// with a neutral fallback for everything else.
export const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Swift: '#F05138',
  Elixir: '#6e4a7e',
  Ruby: '#701516',
  Java: '#b07219',
  Kotlin: '#A97BFF',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  PHP: '#4F5D95',
  Dart: '#00B4AB',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Zig: '#ec915c',
  Lua: '#000080',
  Haskell: '#5e5086',
  Scala: '#c22d40',
  Clojure: '#db5855',
  'Jupyter Notebook': '#DA5B0B',
  Nix: '#7e7eff',
};

export const langColor = (lang?: string | null) => (lang && LANG_COLORS[lang]) || '#6e7681';
