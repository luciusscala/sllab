"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActivePath } from "@/lib/nav";

/**
 * The app's `TabView`: Schedule and Settings, plus Members for staff. Pinned to the bottom on phones, where the
 * thumb is; a plain row under the header from `md` up.
 */
const TABS = [
  { path: "/", label: "Schedule", exact: true, staffOnly: false },
  { path: "/members", label: "Members", exact: false, staffOnly: true },
  { path: "/settings", label: "Settings", exact: false, staffOnly: false },
];

/** `staff` adds the Members tab. */
export function TabBar({ staff }: { staff: boolean }) {
  const pathname = usePathname();
  const tabs = TABS.filter((tab) => staff || !tab.staffOnly);

  return (
    <nav
      aria-label="Team"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:static md:border-t-0 md:bg-transparent md:pb-0"
    >
      <div className="container-page flex md:justify-start md:gap-6 md:py-3">
        {tabs.map((tab) => {
          const href = tab.path;
          // Schedule owns only itself: `/settings` must not light it up.
          const active = tab.exact ? pathname === href : isActivePath(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex-1 py-3 text-center text-sm font-semibold transition-colors duration-200 ease-out md:flex-none md:border-b-2 md:py-1 ${
                active
                  ? "text-foreground md:border-foreground"
                  : "text-muted hover:text-foreground md:border-transparent"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
