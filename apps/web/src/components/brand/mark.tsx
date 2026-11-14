/**
 * Fixture's mark: the centre circle and halfway line of a pitch, as on the
 * app icon. `src/app/icon.svg` is the same drawing with the colours baked in.
 */
export function Mark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" className="fill-accent" />
      <path
        d="M3 16h26"
        strokeWidth="2.4"
        strokeLinecap="round"
        className="stroke-accent-foreground"
      />
      <circle cx="16" cy="16" r="6.2" fill="none" strokeWidth="2.4" className="stroke-accent-foreground" />
    </svg>
  );
}

/** The mark beside the product name, for the top bar. */
export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark />
      <span className="text-[15px] font-semibold tracking-tight">Fixture</span>
    </span>
  );
}
