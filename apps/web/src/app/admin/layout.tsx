import { DashboardShell } from "@/components/shell/dashboard-shell";
import { SiteFooter } from "@/components/shell/site-footer";
import { adminMembership } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/roster", label: "Roster" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/practices", label: "Practices" },
  { href: "/admin/socials", label: "Socials" },
  { href: "/admin/tournaments", label: "Tournaments" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/fields", label: "Fields" },
];

/**
 * The team dashboard: a team's season data, for its captains and coaches.
 * Convenience only — every page and action guards itself with requireAdmin().
 * Without an admin membership (the login page) the children render bare.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await adminMembership();

  if (!admin) {
    return (
      <>
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <DashboardShell title="Team dashboard" subtitle={admin.teamName} nav={NAV}>
        {children}
      </DashboardShell>
      <SiteFooter />
    </>
  );
}
