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
      {/* Room for the fixed bar on phones, so the last row isn't under it. */}
      <div className={membership ? "pb-20 md:pb-0" : ""}>{children}</div>
    </>
  );
}
