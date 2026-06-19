// Turn whatever a user types in the address bar into a real URL: keep full
// URLs, add https:// to bare domains, and treat anything else as a web search.
export function normalizeAddress(input: string): string {
  const v = input.trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  // Looks like a domain (has a dot, no spaces) → assume https.
  if (/^[^\s]+\.[^\s]{2,}(\/|$|\?|#)/.test(v) || /^localhost(:\d+)?(\/|$)/.test(v)) {
    return `https://${v}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(v)}`;
}
