// The docked terminal: a resizable, pop-out-able dock at the bottom of the app.
// The terminal itself lives in <TerminalView/> (shared with the popped-out
// window). Drag the top edge to resize; "pop out" moves it to its own window.

import { useRef } from 'react';
import { CONSOLE_MIN_H, T, mono } from '../../tokens';
import { ConsoleChevron, PopOut } from '../icons';
import { TerminalView, type TerminalHandle } from './TerminalView';
import { useTroveStore } from '../../store/useTroveStore';

const HEADER_H = 38;

export function Console() {
  const open = useTroveStore((s) => s.consoleOpen);
  const toggle = useTroveStore((s) => s.toggleConsole);
  const installedCount = useTroveStore((s) => s.installed.length);
  const height = useTroveStore((s) => s.consoleHeight);
  const setHeight = useTroveStore((s) => s.setConsoleHeight);
  const poppedOut = useTroveStore((s) => s.poppedOut);
  const dockOpen = useTroveStore((s) => !!s.video);
  const dockWidth = useTroveStore((s) => s.dockWidth);

  const termRef = useRef<TerminalHandle>(null);
  const hasShell = typeof window !== 'undefined' && !!window.troveTerminal;

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startH = height;
    const maxH = Math.max(CONSOLE_MIN_H, window.innerHeight - 76);
    const onMove = (ev: MouseEvent) => {
      const next = Math.min(maxH, Math.max(CONSOLE_MIN_H, startH + (startY - ev.clientY)));
      setHeight(next);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.userSelect = 'none';
  };

  const dockable = hasShell && open && !poppedOut;

  return (
    <div
      style={{
        position: 'fixed', left: 0, right: dockOpen ? dockWidth : 0, bottom: 0, zIndex: 50,
        height, backgroundColor: T.bg, borderTop: `1px solid ${T.line}`,
        transform: open ? 'translateY(0)' : `translateY(${height - HEADER_H}px)`,
        transition: 'transform .28s cubic-bezier(.4,0,.1,1), right .2s cubic-bezier(.4,0,.1,1)',
        boxShadow: open ? '0 -18px 50px rgba(0,0,0,.32)' : '0 -2px 12px rgba(0,0,0,.12)',
        display: 'flex', flexDirection: 'column', fontFamily: mono,
      }}
    >
      {/* RESIZE HANDLE (top edge, only when docked + open) */}
      {dockable && (
        <div
          className="hc-resize"
          onMouseDown={startResize}
          title="Drag to resize"
          style={{ position: 'absolute', top: -2, left: 0, right: 0, height: 7, cursor: 'ns-resize', zIndex: 3 }}
        />
      )}

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
          {!hasShell ? 'run in the desktop app for a live shell' : poppedOut ? 'popped out →' : 'interactive shell'}
        </span>
        <span style={{ fontSize: 11.5, color: T.faint }}>{installedCount} installed</span>
        {open && hasShell && !poppedOut && (
          <>
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
            <span
              className="hc-tabtn"
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); window.troveTerminal?.popOut(); }}
              onKeyDown={(e) => e.key === 'Enter' && window.troveTerminal?.popOut()}
              title="Open the terminal in its own window"
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: T.dim }}
            >
              pop out
              <PopOut />
            </span>
          </>
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

      {/* BODY */}
      {!hasShell ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, color: T.dim, fontSize: 12.5, lineHeight: 1.6 }}>
          The live terminal runs inside the Trove desktop app.
          <br />
          Launch it with <span style={{ color: T.green }}>npm run dev</span> to use the embedded shell.
        </div>
      ) : poppedOut ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: T.dim, fontSize: 13 }}>
          <span>Terminal is open in its own window.</span>
          <button
            onClick={() => window.troveTerminal?.popIn()}
            style={{ border: `1px solid ${T.line}`, backgroundColor: T.panel, color: T.text, borderRadius: 9, padding: '8px 16px', fontFamily: mono, fontSize: 12.5, cursor: 'pointer' }}
          >
            Bring it back
          </button>
        </div>
      ) : (
        <TerminalView ref={termRef} className="hc-term" style={{ flex: 1, minHeight: 0, padding: '8px 10px 4px', overflow: 'hidden' }} />
      )}
    </div>
  );
}
