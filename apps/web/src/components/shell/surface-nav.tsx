"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The switcher between surfaces in the top bar; the current one is marked from the path. */
export function SurfaceNav({ surfaces }: { surfaces: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const current = pathname.startsWith("/console")
    ? "/console"
    : pathname.startsWith("/admin")
      ? "/admin"
      : "/";

  return (
    <nav aria-label="Product" className="flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5">
      {surfaces.map((surface) => {
        const active = surface.href === current;
        return (
          <Link
            key={surface.href}
            href={surface.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              active ? "bg-surface-raised text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {surface.label}
          </Link>
        );
      })}
    </nav>
  );
}
