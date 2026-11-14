/**
 * Where a screenshot, photo or video will go. The real media is added by
 * hand; until then this holds the space at the right shape and says what
 * belongs there.
 */
export function MediaPlaceholder({
  label,
  aspect = "16/10",
  className = "",
}: {
  /** What the media should show, e.g. "Fixture: the schedule on iPhone". */
  label: string;
  /** CSS aspect-ratio. */
  aspect?: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`Placeholder: ${label}`}
      style={{ aspectRatio: aspect }}
      className={`relative flex w-full items-end overflow-hidden rounded-[10px] border border-dashed border-line bg-[color-mix(in_srgb,var(--fg)_3%,transparent)] p-4 ${className}`}
    >
      <span className="label max-w-[85%] normal-case tracking-[0.04em]">{label}</span>
    </div>
  );
}
