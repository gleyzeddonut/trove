// A filter chip with a mono count. Active = accent background, white text.

import { C, mono, sans } from '../tokens';

interface Props {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}

export function TypeChip({ label, active, count, onClick }: Props) {
  return (
    <button
      className="hs-chip"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        background: active ? C.accent : C.panel,
        border: `1px solid ${active ? C.accent : C.line}`,
        borderRadius: 10, padding: '8px 14px', fontFamily: sans, fontSize: 13.5,
        color: active ? '#fff' : C.sub, fontWeight: 600, cursor: 'pointer',
      }}
    >
      {label}
      {count != null && (
        <span style={{ fontFamily: mono, fontSize: 11.5, color: active ? 'rgba(255,255,255,.7)' : C.faint }}>{count}</span>
      )}
    </button>
  );
}
