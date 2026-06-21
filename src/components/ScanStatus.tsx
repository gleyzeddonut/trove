// Progressive-scan loading status: a terminal line that steps through fetch
// stages with a forward-only progress bar + elapsed time, rotating
// "still scanning…" lines on long waits so it never reads as a loop. Shared by
// the shelves, the Top leaderboard, and Discover search. The bar position is
// intentionally faked — the point is that it always moves forward.

import { useEffect, useState } from 'react';
import { C, mono } from '../tokens';

const DEFAULT_LONG = [
  'still scanning — deep in the long tail',
  'sifting low-star, high-quality repos',
  'cross-checking metadata',
  'almost — holding out for the good ones',
];

/** Persisted registry size, for "searching N repos"-style stage copy. */
export function registryCount(): number {
  try {
    return parseInt(localStorage.getItem('trove.registrySize') || '', 10) || 0;
  } catch {
    return 0;
  }
}

export function ScanStatus({ stages, long = DEFAULT_LONG }: { stages: string[]; long?: string[] }) {
  const [step, setStep] = useState(0);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const t = window.setInterval(() => setSecs((performance.now() - start) / 1000), 300);
    const a = window.setInterval(() => setStep((s) => s + 1), 720);
    return () => {
      window.clearInterval(t);
      window.clearInterval(a);
    };
  }, []);

  const n = Math.max(1, stages.length);
  const inStages = step < n;
  const msg = inStages ? stages[step] : long[(step - n) % long.length];
  // 0→84% across the scripted stages, then creep toward 95% but never finish.
  const pct = inStages ? Math.round(((step + 1) / n) * 84) : Math.min(95, 84 + (step - n + 1) * 2.5);

  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: mono, fontSize: 12, color: C.faint, marginBottom: 8 }}>
        <span style={{ color: C.green }}>❯</span>
        <span>{msg}</span>
        <span className="tv-cursor" />
        {secs > 1 && <span style={{ marginLeft: 'auto' }}>{secs.toFixed(1)}s</span>}
      </div>
      <div className="tv-loadbar">
        <div className="tv-loadfill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
