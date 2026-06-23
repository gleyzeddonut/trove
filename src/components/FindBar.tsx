// ⌘F find-on-page bar. Uses Electron's native findInPage (real match counts +
// highlighting) via the troveFind bridge. Enter / ⇧Enter step matches; Esc
// closes and clears the highlight.

import { useEffect, useRef, useState } from 'react';
import { C, sans, mono, TABBAR_H } from '../tokens';

const arrowBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26,
  border: 'none', background: 'transparent', color: C.sub, cursor: 'pointer', borderRadius: 7, fontSize: 15, lineHeight: 1,
};

export function FindBar({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [res, setRes] = useState({ matches: 0, active: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    return window.troveFind?.onResult(setRes);
  }, []);

  useEffect(() => {
    if (text) window.troveFind?.query({ text, findNext: false });
    else {
      window.troveFind?.stop();
      setRes({ matches: 0, active: 0 });
    }
  }, [text]);

  const step = (forward: boolean) => {
    if (text) window.troveFind?.query({ text, forward, findNext: true });
  };
  const close = () => {
    window.troveFind?.stop();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', top: TABBAR_H + 12, right: 24, zIndex: 70,
        display: 'flex', alignItems: 'center', gap: 6,
        background: C.panel, border: `1px solid ${C.line}`, borderRadius: 11,
        padding: '6px 7px 6px 13px', boxShadow: '0 14px 40px rgba(0,0,0,.42)',
      }}
    >
      <input
        id="trove-find"
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            step(!e.shiftKey);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            close();
          }
        }}
        placeholder="Find on page"
        spellCheck={false}
        style={{ width: 190, border: 'none', outline: 'none', background: 'transparent', fontFamily: sans, fontSize: 13.5, color: C.ink }}
      />
      <span style={{ fontFamily: mono, fontSize: 11.5, color: text && res.matches === 0 ? C.red : C.faint, minWidth: 42, textAlign: 'right' }}>
        {text ? `${res.active}/${res.matches}` : ''}
      </span>
      <span style={{ width: 1, height: 18, background: C.line2 }} />
      <button className="hc-tabtn" title="Previous (⇧⏎)" onClick={() => step(false)} style={arrowBtn}>↑</button>
      <button className="hc-tabtn" title="Next (⏎)" onClick={() => step(true)} style={arrowBtn}>↓</button>
      <button className="hc-tabtn" title="Close (Esc)" onClick={close} style={arrowBtn}>×</button>
    </div>
  );
}
