import Link from "next/link";

import { Wordmark } from "@/components/brand/mark";
import { SurfaceNav } from "@/components/shell/surface-nav";
import { UserMenu } from "@/components/shell/user-menu";
import { buttonClass } from "@/components/ui/button";
import { adminMembership, currentMembership, getViewer } from "@/lib/auth";
import { canUseConsole } from "@/lib/platform";

/**
 * The one bar across every surface: the mark, a switcher between the
 * surfaces this person may use (the team app, their team's dashboard, the
 * console), and their account. Pages put their own navigation below it.
 */
export async function TopBar() {
  const [{ userId }, membership, admin, console] = await Promise.all([
    getViewer(),
    currentMembership(),
    adminMembership(),
    canUseConsole(),
  ]);

  const surfaces = [
    { href: "/", label: "Team", show: membership !== null },
    { href: "/admin", label: "Dashboard", show: admin !== null },
    { href: "/console", label: "Console", show: console },
  ].filter((surface) => surface.show);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="container-page flex h-14 items-center gap-5">
        <Link href="/" aria-label="Fixture home" className="shrink-0">
          <Wordmark />
        </Link>

        {surfaces.length > 1 && <SurfaceNav surfaces={surfaces} />}

        <div className="ml-auto flex items-center gap-3">
          {userId ? (
            <UserMenu
              name={membership?.personName ?? null}
              team={membership?.teamName ?? null}
            />
          ) : (
            <Link href="/join" className={buttonClass("secondary", "sm")}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
