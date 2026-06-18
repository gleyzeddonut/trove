// Small display helpers.

/** Compact thousands formatting, e.g. 14900 → "14.9k". */
export const k = (n: number) =>
  n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);

/** "3 days ago" style relative time from an ISO timestamp. */
export function timeAgo(iso?: string): string {
  if (!iso) return 'unknown';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown';
  const secs = Math.max(1, Math.round((Date.now() - then) / 1000));
  const units: [number, string][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.345, 'week'],
    [12, 'month'],
    [Number.POSITIVE_INFINITY, 'year'],
  ];
  let value = secs;
  for (let i = 0; i < units.length; i++) {
    const [div, name] = units[i];
    if (value < div) {
      const v = Math.round(value);
      return `${v} ${name}${v !== 1 ? 's' : ''} ago`;
    }
    value /= div;
  }
  return 'a long time ago';
}
