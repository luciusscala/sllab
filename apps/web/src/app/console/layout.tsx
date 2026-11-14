import type { ReactNode } from "react";

import { DashboardShell } from "@/components/shell/dashboard-shell";
import { SiteFooter } from "@/components/shell/site-footer";
import { ButtonLink } from "@/components/ui/button";
import { getViewer } from "@/lib/auth";
import { canUseConsole } from "@/lib/platform";

const NAV = [
  { href: "/console", label: "Overview", exact: true },
  { href: "/console/teams", label: "Teams" },
];

/**
 * The platform console: the records that belong to no one team (schools,
 * teams, fields, leagues, seasons), for SLLAB and league directors. Access is
 * a platform role, not a team membership. Without one, the frame explains.
 */
export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  if (!(await canUseConsole())) {
    const { userId } = await getViewer();
    return (
      <>
        <div className="container-page flex flex-1 items-center justify-center py-16">
          <div className="card w-full max-w-md p-6 text-center">
            <p className="section-label">Console</p>
            <h1 className="headline mt-2 text-xl">
              {userId ? "This sign-in doesn't have console access" : "Sign in to continue"}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {userId
                ? "The console is for SLLAB and league directors. Ask SLLAB to add your number."
                : "Use the phone number SLLAB has on file."}
            </p>
            <div className="mt-5 flex justify-center">
              {userId ? (
                <ButtonLink href="/">Back to Fixture</ButtonLink>
              ) : (
                <ButtonLink href="/join" variant="primary">
                  Sign in
                </ButtonLink>
              )}
            </div>
          </div>
        </div>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <DashboardShell title="Console" subtitle="SLLAB" nav={NAV}>
        {children}
      </DashboardShell>
      <SiteFooter />
    </>
  );
}
