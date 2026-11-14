import { SiteFooter } from "@/components/shell/site-footer";
import { TabBar } from "@/components/team/tab-bar";
import { currentMembership, isStaff } from "@/lib/auth";

/**
 * Tabs appear once someone is on a team, as the app's `MainTabView` does.
 * Convenience only — every page and action guards itself with
 * `requireMember()`, and the database with its policies.
 */
export default async function TeamLayout({ children }: LayoutProps<"/">) {
  const membership = await currentMembership();

  return (
    <>
      {membership && <TabBar staff={isStaff(membership)} />}
      <div className="flex-1">{children}</div>
      {/* Room for the fixed bar on phones, so the footer isn't under it. */}
      <div className={membership ? "pb-16 md:pb-0" : ""}>
        <SiteFooter />
      </div>
    </>
  );
}
