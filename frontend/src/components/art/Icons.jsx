// Flat illustrated objects for the scenes, all drawn on a 48×48 grid.
const INK = '#2b2320'

const ICONS = {
  heart: ({ c = '#ff6b9a' }) => (
    <path d="M24 41C10 31 4 23 4 15.5 4 9.5 8.8 5 14.5 5c4 0 7.5 2.3 9.5 5.8C26 7.3 29.5 5 33.5 5 39.2 5 44 9.5 44 15.5 44 23 38 31 24 41Z" fill={c} />
  ),
  rose: () => (
    <g>
      <path d="M24 26v18" stroke="#3f8f4f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 36c-6-1-9-5-9-9 5 0 8 3 9 9Z" fill="#4fa463" />
      <circle cx="24" cy="16" r="11" fill="#c2255c" />
      <path d="M17 15c2-5 9-6 12-2-4-1-7 0-9 4m11-4c1 4-1 9-6 9 2-2 3-5 1-8" fill="none" stroke="#8c1640" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  sparkle: ({ c = '#ffffff' }) => <path d="M24 4c1.5 12 8 18.5 20 20-12 1.5-18.5 8-20 20-1.5-12-8-18.5-20-20 12-1.5 18.5-8 20-20Z" fill={c} />,
  candle: () => (
    <g>
      <rect x="17" y="20" width="14" height="24" rx="3" fill="#f6e7d0" />
      <path d="M24 6c5 6 5 10 0 13-5-3-5-7 0-13Z" fill="#ffb347" />
      <path d="M24 11c2.5 3 2.5 5 0 6.5-2.5-1.5-2.5-3.5 0-6.5Z" fill="#fff3b0" />
    </g>
  ),
  cloud: () => (
    <path d="M12 36c-5 0-8-3.5-8-7.5 0-4.2 3.4-7.5 7.6-7.5.9-5.6 5.6-9.5 11.4-9.5 5.2 0 9.6 3.3 11 8 .6-.1 1.3-.2 2-.2 4.4 0 8 3.4 8 7.7S40.4 36 36 36Z" fill="#ffffff" opacity="0.9" />
  ),
  plane: ({ c = '#d9572b' }) => (
    <g>
      <path d="M4 22 44 6 32 42 24 28Z" fill={c} />
      <path d="M24 28 44 6 18 25Z" fill="#000" opacity="0.15" />
    </g>
  ),
  pin: ({ c = '#d9572b' }) => (
    <g>
      <path d="M24 44S10 29 10 19a14 14 0 0 1 28 0c0 10-14 25-14 25Z" fill={c} />
      <circle cx="24" cy="19" r="5.5" fill="#fff" />
    </g>
  ),
  fish: ({ c = '#ffb703' }) => (
    <g>
      <path d="M6 24c6-9 18-11 28-4l8-6-2 10 2 10-8-6C24 35 12 33 6 24Z" fill={c} />
      <path d="M20 17c2 4 2 10 0 14" stroke="#000" strokeOpacity="0.15" strokeWidth="2" fill="none" />
      <circle cx="13" cy="22" r="2" fill={INK} />
    </g>
  ),
  cap: ({ c = '#ff7a59' }) => (
    <g>
      <path d="M8 30c0-11 7-18 16-18s16 7 16 18Z" fill={c} />
      <path d="M24 12v18" stroke="#000" strokeOpacity="0.15" strokeWidth="2" />
      <path d="M24 28h20c0 4-3 6-8 6H24Z" fill={c} />
      <path d="M24 28h20c0 4-3 6-8 6H24Z" fill="#000" opacity="0.15" />
      <circle cx="24" cy="12" r="2" fill="#fff" />
    </g>
  ),
  shorts: ({ c = '#2ec4b6' }) => (
    <g>
      <path d="M8 10h32l4 30H28l-4-14-4 14H4Z" fill={c} />
      <path d="M8 10h32v5H8Z" fill="#000" opacity="0.18" />
      <path d="M14 22c3 2 6 2 8 0m4 0c2 2 5 2 8 0" stroke="#fff" strokeWidth="2" fill="none" opacity="0.6" />
    </g>
  ),
  flipflop: ({ c = '#ffd166' }) => (
    <g>
      <ellipse cx="24" cy="26" rx="11" ry="19" fill={c} />
      <path d="M14 24 24 13l10 11" stroke="#ef476f" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ),
  crab: () => (
    <g>
      <path d="M8 34 4 40m8-4-2 7m26-9 6 6m-10-2 2 7" stroke="#e85d3a" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="24" cy="30" rx="14" ry="9" fill="#ef6c45" />
      <circle cx="8" cy="18" r="5" fill="#ef6c45" />
      <circle cx="40" cy="18" r="5" fill="#ef6c45" />
      <path d="M12 22 16 26m20-4-4 4" stroke="#ef6c45" strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="22" r="2.4" fill={INK} />
      <circle cx="28" cy="22" r="2.4" fill={INK} />
    </g>
  ),
  prawn: () => (
    <g>
      <path d="M36 10c6 8 4 22-8 28-8 4-16 2-20-3" stroke="#ff8a5b" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M33 14c4 6 3 15-5 19m-4-25 2 6m4-3-1 5" stroke="#ffd0b8" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M8 35 2 32l2 8Z" fill="#ff8a5b" />
      <circle cx="35" cy="13" r="1.8" fill={INK} />
    </g>
  ),
  coconut: () => (
    <g>
      <path d="M8 24h32c0 11-7 18-16 18S8 35 8 24Z" fill="#8a5a3c" />
      <ellipse cx="24" cy="24" rx="16" ry="4" fill="#fff6e6" />
      <path d="M28 24 36 6" stroke="#ff7a59" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M30 10c3-6 12-6 14 0Z" fill="#2ec4b6" />
    </g>
  ),
  shell: () => (
    <g>
      <path d="M24 42 6 22c4-10 12-14 18-14s14 4 18 14Z" fill="#ffd6c2" />
      <path d="M24 42 13 17m11 25V9m0 33 11-25" stroke="#f4a582" strokeWidth="2" fill="none" />
    </g>
  ),
  bird: ({ c = '#2b2320' }) => <path d="M4 22c7-6 13-6 20 2 7-8 13-8 20-2" stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" />,
  leaf: ({ c = '#7fb069' }) => (
    <g>
      <path d="M8 40C8 20 20 8 42 6c-2 22-14 34-34 34Z" fill={c} />
      <path d="M8 40 34 14" stroke="#000" strokeOpacity="0.18" strokeWidth="2" />
    </g>
  ),
  coffee: () => (
    <g>
      <path d="M18 4c-3 4 3 6 0 10m8-10c-3 4 3 6 0 10" stroke="#b9a89a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M8 18h26v14a10 10 0 0 1-10 10h-6A10 10 0 0 1 8 32Z" fill="#f4efe8" />
      <path d="M34 22h3a5 5 0 0 1 0 10h-3" stroke="#f4efe8" strokeWidth="3" fill="none" />
      <path d="M8 18h26v5H8Z" fill="#7a4a2e" />
    </g>
  ),
  star: ({ c = '#fff6c9' }) => <path d="m24 4 5.9 12.6L44 18.3 33.6 28l2.6 14L24 35.2 11.8 42l2.6-14L4 18.3l14.1-1.7Z" fill={c} />,
  firefly: () => (
    <g>
      <circle cx="24" cy="24" r="20" fill="#ffe27a" opacity="0.18" />
      <circle cx="24" cy="24" r="9" fill="#ffe27a" opacity="0.45" />
      <circle cx="24" cy="24" r="4" fill="#fff6c2" />
    </g>
  ),
  snowflake: () => (
    <g stroke="#9cc6ee" strokeWidth="3" strokeLinecap="round">
      <path d="M24 4v40M6.7 14l34.6 20M6.7 34l34.6-20" />
      <path d="m18 8 6 5 6-5M18 40l6-5 6 5" fill="none" />
    </g>
  ),
  balloon: ({ c = '#ff5d8f' }) => (
    <g>
      <path d="M24 34c-8 0-14-8-14-16S16 4 24 4s14 6 14 14-6 16-14 16Z" fill={c} />
      <path d="m21 34 3 4 3-4Z" fill={c} />
      <path d="M24 38c-3 4 3 6 0 10" stroke="#8a7a90" strokeWidth="1.5" fill="none" />
      <ellipse cx="18" cy="13" rx="3" ry="5" fill="#fff" opacity="0.35" />
    </g>
  ),
  confetti: ({ c = '#ffbe0b' }) => <rect x="14" y="8" width="20" height="32" rx="3" fill={c} />,
  cake: () => (
    <g>
      <rect x="8" y="22" width="32" height="20" rx="4" fill="#ffd6e5" />
      <path d="M8 28c4 3 8 3 11 0 3 3 7 3 10 0 3 3 8 3 11 0v-2a4 4 0 0 0-4-4H12a4 4 0 0 0-4 4Z" fill="#ff5d8f" />
      <rect x="22" y="10" width="4" height="12" rx="1.5" fill="#7c4dff" />
      <path d="M24 3c3 3 3 5 0 7-3-2-3-4 0-7Z" fill="#ffbe0b" />
    </g>
  ),
  pizza: () => (
    <g>
      <path d="M6 10c12-6 24-6 36 0L24 44Z" fill="#ffcf6b" />
      <path d="M6 10c12-6 24-6 36 0l-2 4C28 9 20 9 8 14Z" fill="#d98c3a" />
      <circle cx="20" cy="18" r="3.5" fill="#d64545" />
      <circle cx="29" cy="22" r="3" fill="#d64545" />
      <circle cx="23" cy="30" r="3" fill="#d64545" />
    </g>
  ),
  noodles: () => (
    <g>
      <path d="M32 4 22 22m16-16L26 22" stroke="#8a5a3c" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M12 22c2-4 4 4 6 0s4 4 6 0 4 4 6 0 4 4 6 0" stroke="#f6d07a" strokeWidth="2.5" fill="none" />
      <path d="M6 24h36c0 10-8 18-18 18S6 34 6 24Z" fill="#e85d3a" />
      <path d="M6 24h36v3H6Z" fill="#000" opacity="0.15" />
    </g>
  ),
  chili: () => (
    <g>
      <path d="M30 12c6 2 8 10 2 18-6 8-16 12-24 10 10-4 16-10 18-20 1-5 2-8 4-8Z" fill="#d62828" />
      <path d="M30 12c0-4 3-7 7-7" stroke="#3f8f4f" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ),
  note: ({ c = '#00e0c6' }) => (
    <g>
      <ellipse cx="16" cy="36" rx="7" ry="5.5" fill={c} />
      <path d="M22 36V8l16 6v6l-16-6" stroke={c} strokeWidth="3.5" fill="none" strokeLinejoin="round" />
    </g>
  ),
}

export function Icon({ name, size = 24, color, className, style }) {
  const Draw = ICONS[name]
  if (!Draw) return null
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} style={style} aria-hidden="true">
      <Draw c={color} />
    </svg>
  )
}
