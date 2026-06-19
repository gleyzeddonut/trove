// Browser-style back/forward over the app's own router history. React Router
// stores a monotonic `idx` in history state; we read it to know whether we can
// go back, and track the high-water mark (reset on PUSH, which truncates any
// forward entries) to know whether we can go forward.

import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';

export interface HistoryNav {
  canBack: boolean;
  canForward: boolean;
  back: () => void;
  forward: () => void;
}

const currentIdx = (): number => {
  const s = window.history.state as { idx?: number } | null;
  return s?.idx ?? 0;
};

// The furthest-forward history index reached. Lives at module scope so it
// survives the Nav remounting on every route change (otherwise "forward" would
// never re-enable after going back).
let maxIdx = currentIdx();

export function useHistoryNav(): HistoryNav {
  const navigate = useNavigate();
  const location = useLocation();
  const navType = useNavigationType();
  const [idx, setIdx] = useState(currentIdx);

  useEffect(() => {
    const i = currentIdx();
    setIdx(i);
    // A PUSH/REPLACE drops any forward history; POP (back/forward) keeps it.
    if (navType === 'PUSH' || navType === 'REPLACE') maxIdx = i;
    else if (i > maxIdx) maxIdx = i;
  }, [location, navType]);

  return {
    canBack: idx > 0,
    canForward: idx < maxIdx,
    back: () => navigate(-1),
    forward: () => navigate(1),
  };
}
