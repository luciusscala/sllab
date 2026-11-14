"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActivePath } from "@/lib/nav";

export type NavItem = { href: string; label: string; exact?: boolean };

/** A dashboard's section links: a column beside the content, a row above it on phones. */
export function SidebarNav({ items, horizontal = false }: { items: NavItem[]; horizontal?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Section"
      className={horizontal ? "flex gap-1 overflow-x-auto" : "flex flex-col gap-0.5"}
    >
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition ${
              active
                ? "bg-surface-raised font-semibold text-foreground"
                : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
