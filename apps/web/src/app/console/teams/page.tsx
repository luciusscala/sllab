import type { Metadata } from "next";

import { saveTeam } from "@/app/console/teams/actions";
import { TeamAccessPanel } from "@/app/console/teams/team-access";
import { TeamsTable } from "@/app/console/teams/teams-table";
import { PageHeader } from "@/components/shell/page-header";
import { TeamForm } from "@/components/teams/team-form";
import { ButtonLink } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { listConsoleTeams, listSchools, listSports, teamAccess } from "@/lib/data/console";
import { requirePlatformAdmin } from "@/lib/platform";
import { publicUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Teams" };

const PATH = "/console/teams";

/**
 * Every team: the ones on Fixture and the opponents they play, which are the
 * same kind of row. Bringing a team onto Fixture is issuing it a code and
 * inviting its captain, from its drawer.
 */
export default async function ConsoleTeamsPage(props: PageProps<"/console/teams">) {
  await requirePlatformAdmin();

  const params = await props.searchParams;
  const [teams, schools, sports] = await Promise.all([listConsoleTeams(), listSchools(), listSports()]);
  const editing = typeof params.edit === "string" ? (teams.find((team) => team.id === params.edit) ?? null) : null;
  const access = editing ? await teamAccess(editing.id) : null;
  const schoolName = new Map(schools.map((school) => [school.id, school.name]));

  return (
    <>
      <PageHeader
        title="Teams"
        description="Every team on the platform: the ones using Fixture and the opponents they play."
        actions={
          <ButtonLink href={`${PATH}?new=1`} variant="primary" size="sm">
            New team
          </ButtonLink>
        }
      />
      <div className="mt-6">
        <TeamsTable
          teams={teams.map((team) => ({
            id: team.id,
            name: team.name,
            alias: team.data_alias,
            school: team.org_id ? (schoolName.get(team.org_id) ?? null) : null,
            members: team.members,
            hasCode: team.hasCode,
            hasCrest: team.logo_path !== null,
          }))}
        />
      </div>

      <Drawer
        open={params.new !== undefined || editing !== null}
        title={editing?.name ?? "New team"}
        description={editing ? (editing.org_id ? schoolName.get(editing.org_id) : "No school") : "Add it, then issue a code from here."}
        closeHref={PATH}
      >
        <TeamForm
          key={editing?.id ?? "new"}
          team={editing}
          logoUrl={publicUrl("logos", editing?.logo_path)}
          save={saveTeam}
          closeHref={PATH}
          schools={schools.map((school) => ({ value: school.id, label: school.name }))}
          sports={sports.map((sport) => ({ value: sport.id, label: sport.name }))}
        />
        {editing && access && (
          <TeamAccessPanel
            teamId={editing.id}
            teamName={editing.name}
            access={access}
            removable={editing.members === 0 && !editing.hasCode}
          />
        )}
      </Drawer>
    </>
  );
}
