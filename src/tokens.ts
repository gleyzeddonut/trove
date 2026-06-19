// Design tokens — the visual system from the Trove design handoff.
// App surfaces (storefront / detail / library) and console live in separate
// palettes; the console is intentionally a hair darker than the app.

// Structural colors map to CSS custom properties so Dark/Light/accent apply
// live (see index.css). Semantic colors (green/amber/blue/red) are fixed —
// they read acceptably on both themes, matching the design.
export const C = {
  bg: 'var(--tv-bg)',
  panel: 'var(--tv-panel)',
  panelHover: 'var(--tv-panelHover)',
  sunk: 'var(--tv-sunk)',
  ink: 'var(--tv-ink)',
  sub: 'var(--tv-sub)',
  faint: 'var(--tv-faint)',
  line: 'var(--tv-line)',
  line2: 'var(--tv-line2)',
  accent: 'var(--tv-accent)',
  accentSoft: 'rgba(142,125,241,.14)',
  green: '#3FB950',
  amber: '#E3B341',
  blue: '#58A6FF',
  red: '#F47067',
  /** Body text on cards — README paragraphs / feature text. */
  body: 'var(--tv-body)',
  /** Border used on a row when its project is installed. */
  installedBorder: '#234D33',
} as const;

// Command/run chips stay dark in both themes (terminal identity; green-on-light
// reads poorly), so they use these fixed values instead of the themed C tokens.
export const CHIP = {
  bg: '#0B0D11',
  border: 'rgba(255,255,255,.08)',
} as const;

// Console (dock chrome) palette. Structural colors map to --tc-* so the dock
// themes with the app; accents stay fixed. The xterm canvas uses literal hex
// theme objects in TerminalView (a canvas can't read CSS variables).
export const T = {
  bg: 'var(--tc-bg)',
  panel: 'var(--tc-panel)',
  bar: 'var(--tc-bar)',
  line: 'var(--tc-line)',
  line2: 'var(--tc-line2)',
  text: 'var(--tc-text)',
  dim: 'var(--tc-dim)',
  faint: 'var(--tc-faint)',
  green: '#3FB950',
  cyan: '#2DD4BF',
  amber: '#E3B341',
  blue: '#58A6FF',
  red: '#F47067',
  mag: '#BC8CFF',
} as const;

export const sans = "'Plus Jakarta Sans', system-ui, sans-serif";
export const mono = "'JetBrains Mono', ui-monospace, 'SF Mono', monospace";

/** Default / collapsed / minimum height of the console dock (px). */
export const CONSOLE_OPEN_H = 332;
export const CONSOLE_COLLAPSED_H = 38;
export const CONSOLE_MIN_H = 150;

/** Right-docked video player: width bounds (px). */
export const DOCK_W_DEFAULT = 440;
export const DOCK_W_MIN = 360;
export const DOCK_W_MAX = 720;

/** Height of the browser-chrome tab strip pinned at the top of the window. */
export const TABBAR_H = 46;
