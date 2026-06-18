// A reusable xterm.js view wired to the real shell over the preload bridge.
// Used by both the docked console and the popped-out window. It:
//  - themes the canvas for dark/light (and live-switches via a data-theme
//    observer, since a canvas can't read CSS variables);
//  - keeps wheel scrolling inside the terminal (never chains to the page);
//  - replays recent output (backlog) on mount so re-attaching isn't blank.

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Terminal, type ITheme } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { mono } from '../../tokens';

const DARK_THEME: ITheme = {
  background: '#0A0B0E',
  foreground: '#C9D1D9',
  cursor: '#3FB950',
  cursorAccent: '#0A0B0E',
  selectionBackground: 'rgba(142,125,241,.28)',
  black: '#0A0B0E',
  red: '#F47067',
  green: '#3FB950',
  yellow: '#E3B341',
  blue: '#58A6FF',
  magenta: '#BC8CFF',
  cyan: '#2DD4BF',
  white: '#C9D1D9',
  brightBlack: '#48505B',
  brightRed: '#F47067',
  brightGreen: '#3FB950',
  brightYellow: '#E3B341',
  brightBlue: '#58A6FF',
  brightMagenta: '#BC8CFF',
  brightCyan: '#2DD4BF',
  brightWhite: '#FFFFFF',
};

const LIGHT_THEME: ITheme = {
  background: '#FBFBF9',
  foreground: '#2A2E35',
  cursor: '#2E9E40',
  cursorAccent: '#FBFBF9',
  selectionBackground: 'rgba(142,125,241,.22)',
  black: '#2A2E35',
  red: '#C2402E',
  green: '#2E9E40',
  yellow: '#9A7B12',
  blue: '#1F6FEB',
  magenta: '#8A63D2',
  cyan: '#1A9E8F',
  white: '#5C636E',
  brightBlack: '#9AA0A8',
  brightRed: '#C2402E',
  brightGreen: '#2E9E40',
  brightYellow: '#9A7B12',
  brightBlue: '#1F6FEB',
  brightMagenta: '#8A63D2',
  brightCyan: '#1A9E8F',
  brightWhite: '#171A1F',
};

const isLight = () => document.documentElement.getAttribute('data-theme') === 'light';
const themeFor = () => (isLight() ? LIGHT_THEME : DARK_THEME);

export interface TerminalHandle {
  clear: () => void;
  focus: () => void;
}

interface Props {
  className?: string;
  style?: React.CSSProperties;
}

export const TerminalView = forwardRef<TerminalHandle, Props>(function TerminalView({ className, style }, ref) {
  const mountRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      clear: () => termRef.current?.clear(),
      focus: () => termRef.current?.focus(),
    }),
    [],
  );

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !window.troveTerminal) return;

    const term = new Terminal({
      fontFamily: mono,
      fontSize: 12.5,
      lineHeight: 1.25,
      cursorBlink: true,
      theme: themeFor(),
      allowProposedApi: true,
      scrollback: 5000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(mount);
    termRef.current = term;

    const sync = () => {
      try {
        fit.fit();
        window.troveTerminal?.resize(term.cols, term.rows);
      } catch {
        /* container not measurable yet */
      }
    };
    sync();

    const offData = window.troveTerminal.onData((data) => term.write(data));
    const onInput = term.onData((data) => window.troveTerminal?.sendInput(data));

    const ro = new ResizeObserver(() => sync());
    ro.observe(mount);
    const onWinResize = () => sync();
    window.addEventListener('resize', onWinResize);

    // Live-switch the canvas theme when the app theme changes.
    const themeObs = new MutationObserver(() => {
      term.options.theme = themeFor();
    });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Keep wheel scrolling inside the terminal. xterm's screen is a sibling of
    // its scroll viewport, so a wheel over the terminal natively targets the
    // document (scrolling the page behind the fixed dock). We block the page's
    // default scroll for any wheel over the terminal and let xterm's own
    // handler scroll the buffer. A window-level capture listener guarantees we
    // run regardless of how the event is dispatched.
    const onWheel = (e: WheelEvent) => {
      if (mount.contains(e.target as Node)) e.preventDefault();
    };
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });

    term.focus();
    window.troveTerminal.requestBacklog?.();

    return () => {
      offData();
      onInput.dispose();
      ro.disconnect();
      themeObs.disconnect();
      window.removeEventListener('resize', onWinResize);
      window.removeEventListener('wheel', onWheel, { capture: true } as EventListenerOptions);
      term.dispose();
      termRef.current = null;
    };
  }, []);

  if (typeof window !== 'undefined' && !window.troveTerminal) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, color: 'var(--tc-dim)', fontSize: 12.5, lineHeight: 1.6 }}>
        The live terminal runs inside the Trove desktop app.
        <br />
        Launch it with <span style={{ color: '#3FB950' }}>npm run dev</span> to use the embedded shell.
      </div>
    );
  }

  return <div ref={mountRef} className={className} style={style} />;
});
