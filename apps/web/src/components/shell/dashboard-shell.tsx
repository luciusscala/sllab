import type { ReactNode } from "react";

import { type NavItem, SidebarNav } from "@/components/shell/sidebar-nav";

/**
 * The frame both dashboards share: what this is and whose it is, the
 * section links, and the page. The sidebar is a column from `lg` up and a
 * scrolling row above the content below that.
 */
export function DashboardShell({
  title,
  subtitle,
  nav,
  children,
}: {
  /** "Team dashboard" or "Console". */
  title: string;
  /** The team's name, or who the console belongs to. */
  subtitle?: string;
  nav: NavItem[];
  children: ReactNode;
}) {
  const heading = (
    <>
      <p className="section-label">{title}</p>
      {subtitle && <p className="mt-1 truncate text-sm font-semibold">{subtitle}</p>}
    </>
  );

  return (
    <div className="container-page flex flex-1 gap-10 py-6 lg:py-8">
      <aside className="hidden w-48 shrink-0 lg:block">
        <div className="sticky top-20">
          {heading}
          <div className="mt-5">
            <SidebarNav items={nav} />
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-5 lg:hidden">
          {heading}
          <div className="-mx-5 mt-3 px-5">
            <SidebarNav items={nav} horizontal />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
