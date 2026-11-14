import type { Metadata } from "next";

import { PlayerForm } from "@/app/admin/roster/player-form";
import { RosterTable } from "@/app/admin/roster/roster-table";
import { NoSeason } from "@/components/admin/no-season";
import { SetupNotice } from "@/components/admin/setup-notice";
import { SeasonPicker } from "@/components/season-picker";
import { PageHeader } from "@/components/shell/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { requireAdmin } from "@/lib/auth";
import { adminSeason, listRoster } from "@/lib/data/admin";
import { withQuery } from "@/lib/nav";
import { publicUrl } from "@/lib/storage";
import { isAdminConfigured } from "@/lib/supabase-admin";

export const metadata: Metadata = { title: "Roster" };

const PATH = "/admin/roster";

export default async function AdminRosterPage(props: PageProps<"/admin/roster">) {
  const { teamId } = await requireAdmin();
  if (!isAdminConfigured()) return <SetupNotice />;

  const params = await props.searchParams;
  const { seasons, season } = await adminSeason(teamId, "roster", params.season);
  if (!season) return <NoSeason />;

  const roster = await listRoster(teamId, season.id);
  const base = withQuery(PATH, { season: season.year });
  const editing = typeof params.edit === "string" ? roster.find((entry) => entry.entryId === params.edit) : undefined;

  return (
    <>
      <PageHeader
        title="Roster"
        description={`${roster.length} players in ${season.year}. Names, numbers and photos here are what the club site shows.`}
        actions={
          <>
            <SeasonPicker seasons={seasons} selected={season} />
            <ButtonLink href={withQuery(PATH, { season: season.year, new: 1 })} variant="primary" size="sm">
              New player
            </ButtonLink>
          </>
        }
      />

      <div className="mt-6">
        <RosterTable
          editPrefix={`${base}&edit=`}
          players={roster.map((entry) => ({
            id: entry.entryId,
            name: entry.name,
            hometown: entry.hometown,
            number: entry.number,
            position: entry.position,
            year: entry.year,
            hasPhone: entry.phone !== null,
          }))}
        />
      </div>

      <Drawer
        open={params.new !== undefined || editing !== undefined}
        title={editing?.name ?? "New player"}
        description={editing ? `${editing.position} · ${editing.year}` : `Adds them to the ${season.year} roster.`}
        closeHref={base}
      >
        <PlayerForm
          key={editing?.entryId ?? "new"}
          seasonId={season.id}
          seasonYear={season.year}
          closeHref={base}
          pictureUrl={publicUrl("player_pictures", editing?.picturePath)}
          player={
            editing
              ? {
                  entryId: editing.entryId,
                  name: editing.name,
                  hometown: editing.hometown,
                  number: editing.number,
                  position: editing.position,
                  year: editing.year,
                  phone: editing.phone,
                }
              : null
          }
        />
      </Drawer>
    </>
  );
}
