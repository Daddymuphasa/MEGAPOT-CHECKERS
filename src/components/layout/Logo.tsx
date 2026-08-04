export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c5cf6" />
          <stop offset="0.5" stopColor="#6366f1" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <radialGradient id="lgd" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="3" y="3" width="42" height="42" rx="12" fill="url(#lg)" />
      <g>
        <ellipse cx="24" cy="30" rx="13" ry="4" fill="#000" opacity="0.18" />
        <circle cx="24" cy="24" r="13" fill="#1b2030" />
        <circle cx="24" cy="24" r="13" fill="url(#lgd)" />
        <circle
          cx="24"
          cy="24"
          r="9.5"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.35"
          strokeWidth="1.4"
        />
        <path
          d="M18 22.5l2.6 5 3.4-6.5 3.4 6.5 2.6-5"
          fill="none"
          stroke="#ffd76a"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
