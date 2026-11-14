import type { Metadata } from "next";

import { addTeam } from "@/app/admin/teams/actions";
import { OpponentsTable } from "@/app/admin/teams/teams-table";
import { SetupNotice } from "@/components/admin/setup-notice";
import { PageHeader } from "@/components/shell/page-header";
import { TeamForm } from "@/components/teams/team-form";
import { ButtonLink } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { requireAdmin } from "@/lib/auth";
import { listOpponents } from "@/lib/data/admin";
import { publicUrl } from "@/lib/storage";
import { isAdminConfigured } from "@/lib/supabase-admin";

export const metadata: Metadata = { title: "Teams" };

const PATH = "/admin/teams";

/** The teams yours plays. Shared across the platform, so this page adds; the console corrects. */
export default async function AdminTeamsPage(props: PageProps<"/admin/teams">) {
  const { teamId } = await requireAdmin();
  if (!isAdminConfigured()) return <SetupNotice />;

  const params = await props.searchParams;
  const teams = await listOpponents(teamId);

  return (
    <>
      <PageHeader
        title="Teams"
        description="The teams you play. Every team on Fixture shares this list, so check it before adding one. To correct a name or crest, contact SLLAB."
        actions={
          <ButtonLink href={`${PATH}?new=1`} variant="primary" size="sm">
            New team
          </ButtonLink>
        }
      />

      <div className="mt-6">
        <OpponentsTable
          newHref={`${PATH}?new=1`}
          teams={teams.map((team) => ({
            id: team.id,
            name: team.name,
            alias: team.data_alias,
            logoUrl: publicUrl("logos", team.logo_path),
          }))}
        />
      </div>

      <Drawer open={params.new !== undefined} title="New team" description="An opponent any team can pick." closeHref={PATH}>
        <TeamForm team={null} logoUrl={null} save={addTeam} closeHref={PATH} />
      </Drawer>
    </>
  );
}
