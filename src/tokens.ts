// Design tokens — the visual system from the Trove design handoff.
// App surfaces (storefront / detail / library) and console live in separate
// palettes; the console is intentionally a hair darker than the app.

export const C = {
  bg: '#0A0C10',
  panel: '#13161C',
  panelHover: '#181D25',
  sunk: '#08090C',
  ink: '#E7EAEF',
  sub: '#98A0AC',
  faint: '#59616D',
  line: '#20262F',
  line2: '#191E26',
  accent: '#8E7DF1',
  accentSoft: 'rgba(142,125,241,.14)',
  green: '#3FB950',
  amber: '#E3B341',
  blue: '#58A6FF',
  red: '#F47067',
  /** Body text on dark cards — README paragraphs / feature text. */
  body: '#C4CAD3',
  /** Border used on a row when its project is installed. */
  installedBorder: '#234D33',
} as const;

// Console palette (darker than the app).
export const T = {
  bg: '#0A0B0E',
  panel: '#0E1116',
  bar: '#11151B',
  line: '#1C2230',
  line2: '#161B24',
  text: '#C9D1D9',
  dim: '#6E7681',
  faint: '#48505B',
  green: '#3FB950',
  cyan: '#2DD4BF',
  amber: '#E3B341',
  blue: '#58A6FF',
  red: '#F47067',
  mag: '#BC8CFF',
} as const;

export const sans = "'Plus Jakarta Sans', system-ui, sans-serif";
export const mono = "'JetBrains Mono', ui-monospace, 'SF Mono', monospace";

/** Visible height of the console dock when open vs collapsed (drives page padding). */
export const CONSOLE_OPEN_H = 332;
export const CONSOLE_COLLAPSED_H = 38;
