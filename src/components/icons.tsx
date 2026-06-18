// Inline SVG icon set ported from the prototype. Single-purpose, presentational.

import { C } from '../tokens';

export const Star = ({ s = 12, c = C.amber, style }: { s?: number; c?: string; style?: React.CSSProperties }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill={c} style={style}>
    <path d="M8 1.3l1.9 4 4.4.5-3.3 3 .9 4.4L8 11.4 4.1 13.2l.9-4.4-3.3-3 4.4-.5z" />
  </svg>
);

export const Chevron = ({ stroke = C.faint }: { stroke?: string }) => (
  <svg width="8" height="13" viewBox="0 0 8 13" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" style={{ marginLeft: 2, flexShrink: 0 }}>
    <path d="M1.5 1.5L6.5 6.5L1.5 11.5" />
  </svg>
);

export const SearchIcon = ({ stroke = C.faint }: { stroke?: string }) => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke={stroke} strokeWidth="2">
    <circle cx="9" cy="9" r="6.5" />
    <path d="M14 14l4 4" strokeLinecap="round" />
  </svg>
);

export const Check = ({ s = 9, c = C.green, w = 2.2 }: { s?: number; c?: string; w?: number }) => (
  <svg width={s} height={s} viewBox="0 0 10 10" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round">
    <path d="M2 5l2 2 4-5" />
  </svg>
);

export const Trash = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M5 4.5l.6 8h4.8l.6-8" />
  </svg>
);

export const Play = () => (
  <svg width="8" height="9" viewBox="0 0 8 9" fill="currentColor">
    <path d="M0 0l8 4.5L0 9z" />
  </svg>
);

export const Box = ({ stroke = C.faint }: { stroke?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7l8-4 8 4v10l-8 4-8-4z" />
    <path d="M4 7l8 4 8-4M12 11v10" />
  </svg>
);

export const BackArrow = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M8.5 3L4.5 7l4 4" />
  </svg>
);

export const Watch = ({ stroke = C.sub }: { stroke?: string }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={stroke} strokeWidth="1.5">
    <circle cx="8" cy="8" r="2.2" />
    <path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z" />
  </svg>
);

export const Fork = ({ s = 14, stroke = C.sub, full = true }: { s?: number; stroke?: string; full?: boolean }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={stroke} strokeWidth={full ? 1.5 : 1.6}>
    <circle cx="4" cy="3.5" r={full ? 1.8 : 1.6} />
    <circle cx="12" cy="3.5" r={full ? 1.8 : 1.6} />
    <circle cx="8" cy="12.5" r={full ? 1.8 : 1.6} />
    {full && <path d="M4 5.3v1.2c0 1.5 1 2 2 2h4c1 0 2-.5 2-2V5.3M8 8.5v2.2" />}
  </svg>
);

export const FileIcon = ({ stroke = C.sub }: { stroke?: string }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={stroke} strokeWidth="1.4">
    <path d="M2 2.5h7l3 3V13.5H2z" />
    <path d="M9 2.5v3.5h3" />
  </svg>
);

export const UsedBy = ({ stroke = C.faint }: { stroke?: string }) => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={stroke} strokeWidth="1.6">
    <rect x="2" y="2" width="5" height="5" rx="1" />
    <rect x="9" y="9" width="5" height="5" rx="1" />
  </svg>
);

export const License = ({ stroke = C.faint }: { stroke?: string }) => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={stroke} strokeWidth="1.6">
    <path d="M8 2v12M3 5h10M5 5l-2.5 5h5zM11 5l-2.5 5h5z" />
  </svg>
);

export const IssueDot = ({ stroke = C.faint }: { stroke?: string }) => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={stroke} strokeWidth="1.6">
    <circle cx="8" cy="8" r="6" />
    <circle cx="8" cy="8" r="1.6" fill={stroke} stroke="none" />
  </svg>
);

export const Clock = ({ stroke = C.faint }: { stroke?: string }) => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={stroke} strokeWidth="1.6">
    <circle cx="8" cy="8" r="6" />
    <path d="M8 5v3l2 1.5" />
  </svg>
);

export const Verified = ({ s = 14 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" aria-label="verified">
    <path d="M8 1l1.8 1.3 2.2-.2 .9 2 2 .9-.2 2.2L16 8l-1.3 1.8.2 2.2-2 .9-.9 2-2.2-.2L8 15l-1.8-1.3-2.2.2-.9-2-2-.9.2-2.2L0 8l1.3-1.8L1.1 4l2-.9.9-2 2.2.2z" fill={C.accent} />
    <path d="M5.2 8.1l1.9 1.9 3.7-3.9" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

export const Heart = ({ filled, c }: { filled: boolean; c: string }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill={filled ? c : 'none'} stroke={filled ? c : 'currentColor'} strokeWidth="1.5">
    <path d="M8 13.5S2 9.8 2 5.9A3 3 0 0 1 8 4.3 3 3 0 0 1 14 5.9c0 3.9-6 7.6-6 7.6z" />
  </svg>
);

export const Reply = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14 9.5c0 1-.8 1.8-1.8 1.8H6l-3 2.5V4.3c0-1 .8-1.8 1.8-1.8h7.4c1 0 1.8.8 1.8 1.8z" />
  </svg>
);

export const Share = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8.5v4.5h8V8.5M8 10V2.5M5 5l3-3 3 3" />
  </svg>
);

export const Caret = ({ open }: { open: boolean }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
  >
    <path d="M3 4.5L6 7.5L9 4.5" />
  </svg>
);

export const ConsoleChevron = ({ flipped }: { flipped: boolean }) => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" style={{ transform: flipped ? 'rotate(180deg)' : 'none' }}>
    <path d="M2 7l3.5-3.5L9 7" />
  </svg>
);
