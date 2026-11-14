import Link from "next/link";

import { signOut } from "@/app/auth/actions";
import { adminMembership } from "@/lib/auth";

const NAV = [
  { href: "/admin/roster", label: "Roster" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/practices", label: "Practices" },
  { href: "/admin/socials", label: "Socials" },
  { href: "/admin/tournaments", label: "Tournaments" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/fields", label: "Fields" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Convenience only — every page and action guards itself with requireAdmin().
  const admin = await adminMembership();

  return (
    <>
      {admin && (
        <div className="border-b border-border">
          <div className="container-page flex items-center gap-5 py-3">
            <span className="text-sm font-semibold text-accent">Admin</span>
            <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              ))}
            </nav>
            <form action={signOut} className="ml-auto flex items-center gap-3">
              <span className="hidden text-xs text-muted sm:inline">{admin.personName}</span>
              <button type="submit" className="text-sm text-muted hover:text-foreground">
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
