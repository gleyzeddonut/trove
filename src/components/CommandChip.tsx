// The install-action chip: a fixed-width pill showing just the command (the
// full command, incl. URL, still runs — and shows on hover via the title).
// Clicking it opens the embedded terminal and runs the command for real.

import { C, mono } from '../tokens';
import { Play } from './icons';
import type { Project } from '../types';

/**
 * Short, uniform label: keep the command + simple package name, but drop
 * noisy locator tokens (URLs, module paths, versions). So
 *   "git clone https://github.com/a/b.git" → "git clone"
 *   "go install github.com/a/b@latest"     → "go install"
 *   "brew install ripgrep"                 → "brew install ripgrep"
 */
function commandLabel(install: string): string {
  const tokens = install.split(/\s+/).filter(Boolean);
  const kept = tokens.filter((t) => !/[/@]/.test(t) && !t.includes('://') && !t.endsWith('.git'));
  const label = kept.join(' ').trim();
  return label || tokens.slice(0, 2).join(' ');
}

interface Props {
  p: Project;
  onInstall: (p: Project) => void;
}

export function CommandChip({ p, onInstall }: Props) {
  return (
    <button
      className="hs-cmd"
      title={p.install}
      aria-label={`Run ${p.install}`}
      onClick={(e) => {
        e.stopPropagation();
        onInstall(p);
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, background: C.sunk,
        border: `1px solid ${C.line}`, borderRadius: 9, padding: '7px 8px 7px 12px',
        width: 156, flexShrink: 0, textAlign: 'left',
      }}
    >
      <span style={{ fontFamily: mono, fontSize: 12, color: C.green, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
        <span style={{ color: C.faint }}>$ </span>
        {commandLabel(p.install)}
      </span>
      <span
        className="hs-run"
        style={{
          display: 'flex', alignItems: 'center', gap: 5, fontFamily: mono, fontSize: 11,
          fontWeight: 600, color: C.ink, background: 'rgba(255,255,255,.06)', borderRadius: 6,
          padding: '3px 9px', flexShrink: 0,
        }}
      >
        <Play />
        run
      </span>
    </button>
  );
}
