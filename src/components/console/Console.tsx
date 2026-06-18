// The embedded terminal — a real PTY-backed shell rendered with xterm.js,
// docked to the bottom of the app. It behaves exactly like a normal terminal;
// "run" buttons elsewhere in the app type real commands into this same shell.

import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { CONSOLE_OPEN_H, T, mono } from '../../tokens';
import { ConsoleChevron } from '../icons';
import { useTroveStore } from '../../store/useTroveStore';

const HEADER_H = 38;

// xterm theme matched to the console palette in the design tokens.
const THEME = {
  background: T.bg,
  foreground: T.text,
  cursor: T.green,
  cursorAccent: T.bg,
  selectionBackground: 'rgba(142,125,241,.28)',
  black: '#0A0B0E',
  red: T.red,
  green: T.green,
  yellow: T.amber,
  blue: T.blue,
  magenta: T.mag,
  cyan: T.cyan,
  white: T.text,
  brightBlack: T.faint,
  brightRed: T.red,
  brightGreen: T.green,
  brightYellow: T.amber,
  brightBlue: T.blue,
  brightMagenta: T.mag,
  brightCyan: T.cyan,
  brightWhite: '#FFFFFF',
};

export function Console() {
  const open = useTroveStore((s) => s.consoleOpen);
  const installedCount = useTroveStore((s) => s.installed.length);
  const toggle = useTroveStore((s) => s.toggleConsole);

  const mountRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const hasShell = typeof window !== 'undefined' && !!window.troveTerminal;

  // Create the terminal once and wire it to the real shell.
  useEffect(() => {
    if (!mountRef.current || !window.troveTerminal) return;

    const term = new Terminal({
      fontFamily: mono,
      fontSize: 12.5,
      lineHeight: 1.25,
      cursorBlink: true,
      theme: THEME,
      allowProposedApi: true,
      scrollback: 5000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(mountRef.current);
    termRef.current = term;
    fitRef.current = fit;

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
    ro.observe(mountRef.current);

    return () => {
      offData();
      onInput.dispose();
      ro.disconnect();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);

  // Refit + focus whenever the dock opens (its size becomes meaningful).
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      try {
        fitRef.current?.fit();
        const term = termRef.current;
        if (term) {
          window.troveTerminal?.resize(term.cols, term.rows);
          term.focus();
        }
      } catch {
        /* noop */
      }
    }, 60);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <div
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
        height: CONSOLE_OPEN_H, background: T.bg, borderTop: `1px solid ${T.line}`,
        transform: open ? 'translateY(0)' : `translateY(${CONSOLE_OPEN_H - HEADER_H}px)`,
        transition: 'transform .28s cubic-bezier(.4,0,.1,1)',
        boxShadow: open ? '0 -18px 50px rgba(0,0,0,.32)' : '0 -2px 12px rgba(0,0,0,.12)',
        display: 'flex', flexDirection: 'column', fontFamily: mono,
      }}
    >
      {/* HEADER / STATUS STRIP */}
      <div
        className={open ? undefined : 'hc-bar'}
        onClick={open ? undefined : toggle}
        style={{ height: HEADER_H, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', borderBottom: open ? `1px solid ${T.line2}` : 'none' }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 8, background: T.green, boxShadow: `0 0 8px ${T.green}`, flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, color: T.text, fontWeight: 600 }}>
          trove<span style={{ color: T.green }}>//</span>console
        </span>
        <span style={{ fontSize: 12, color: T.faint }}>›</span>
        <span style={{ fontSize: 12, color: T.dim, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {hasShell ? 'interactive shell' : 'run in the desktop app for a live shell'}
        </span>
        <span style={{ fontSize: 11.5, color: T.faint }}>{installedCount} installed</span>
        {open && hasShell && (
          <span
            className="hc-tabtn"
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); termRef.current?.clear(); }}
            onKeyDown={(e) => e.key === 'Enter' && termRef.current?.clear()}
            style={{ fontSize: 11.5, color: T.dim }}
          >
            clear
          </span>
        )}
        <span
          className="hc-tabtn"
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); toggle(); }}
          onKeyDown={(e) => e.key === 'Enter' && toggle()}
          style={{ fontSize: 11.5, color: T.dim, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {open ? 'minimize' : 'open'}
          <span style={{ border: `1px solid ${T.line}`, borderRadius: 5, padding: '1px 5px', color: T.faint }}>{open ? 'esc' : '⌘J'}</span>
          <ConsoleChevron flipped={!open} />
        </span>
      </div>

      {/* TERMINAL */}
      {hasShell ? (
        <div ref={mountRef} className="hc-term" style={{ flex: 1, minHeight: 0, padding: '8px 10px 4px', overflow: 'hidden' }} />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, color: T.dim, fontSize: 12.5, lineHeight: 1.6 }}>
          The live terminal runs inside the Trove desktop app.
          <br />
          Launch it with <span style={{ color: T.green }}>npm run dev</span> to use the embedded shell.
        </div>
      )}
    </div>
  );
}
