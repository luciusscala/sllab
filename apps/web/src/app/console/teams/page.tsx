import type { Metadata } from "next";

import { TeamsTable } from "@/app/console/teams/teams-table";
import { PageHeader } from "@/components/shell/page-header";
import { listTeams } from "@/lib/data/admin";
import { requirePlatformAdmin } from "@/lib/platform";
import { requireAdminClient } from "@/lib/supabase-admin";

export const metadata: Metadata = { title: "Teams" };

export default async function ConsoleTeamsPage() {
  await requirePlatformAdmin();

  const [teams, { data: memberships, error }] = await Promise.all([
    listTeams(),
    requireAdminClient().from("memberships").select("team_id").eq("status", "active"),
  ]);
  if (error) throw new Error(`Failed to count members: ${error.message}`);

  const members = new Map<string, number>();
  for (const row of memberships ?? []) {
    members.set(row.team_id, (members.get(row.team_id) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        title="Teams"
        description="Every team on the platform: the ones using Fixture and the opponents they play."
      />
      <div className="mt-6">
        <TeamsTable
          teams={teams.map((team) => ({
            id: team.id,
            name: team.name,
            alias: team.data_alias,
            hasCrest: team.logo_path !== null,
            members: members.get(team.id) ?? 0,
          }))}
        />
      </div>
    </>
  );
}
