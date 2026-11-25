import clsx from 'clsx'

export function ShipMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 64" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="nx-ship" x1="28" y1="0" x2="28" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7df9ff" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <path
        d="M28 1 36 22 55 50v9L38 52l-4 10H22l-4-10L1 59v-9l19-28L28 1Z"
        fill="#0e1a52"
        stroke="url(#nx-ship)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <ellipse cx="28" cy="26" rx="4.5" ry="9" fill="#7df9ff" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <ShipMark className="h-7 w-7 drop-shadow-[0_0_10px_rgba(56,189,248,0.6)]" />
      <span className="font-display text-lg font-bold tracking-[0.14em] text-nex-text">
        NEX<span className="text-nex-blue">ARENA</span>
      </span>
    </span>
  )
}
