import Link from "next/link";

import { signOut } from "@/app/auth/actions";

const ITEM = "block px-4 py-2 text-sm text-foreground transition hover:bg-surface-raised";

/**
 * The account menu at the right of the top bar. A native disclosure, so it
 * needs no script and closes on navigation.
 */
export function UserMenu({ name, team }: { name: string | null; team: string | null }) {
  const initials =
    (name ?? "")
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "·";

  return (
    <details className="relative">
      <summary
        aria-label="Account menu"
        className="flex cursor-pointer list-none items-center rounded-full [&::-webkit-details-marker]:hidden"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-surface-raised text-xs font-semibold">
          {initials}
        </span>
      </summary>

      <div className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
        <div className="border-b border-border px-4 py-3">
          <p className="truncate text-sm font-semibold">{name ?? "Guest"}</p>
          {team && <p className="truncate text-xs text-muted">{team}</p>}
        </div>
        <ul className="py-1">
          <li>
            <Link href="/settings" className={ITEM}>
              Settings
            </Link>
          </li>
          <li>
            <a href="https://sllab.io" className={ITEM}>
              About SLLAB ↗
            </a>
          </li>
        </ul>
        <form action={signOut} className="border-t border-border py-1">
          <button type="submit" className={`${ITEM} w-full text-left`}>
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
