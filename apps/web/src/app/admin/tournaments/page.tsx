import type { Metadata } from "next";

import { TournamentForm } from "@/app/admin/tournaments/tournament-form";
import { TournamentsTable } from "@/app/admin/tournaments/tournaments-table";
import { NoSeason } from "@/components/admin/no-season";
import { SetupNotice } from "@/components/admin/setup-notice";
import { SeasonPicker } from "@/components/season-picker";
import { PageHeader } from "@/components/shell/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { requireAdmin } from "@/lib/auth";
import { adminSeason, listFields, listTournaments } from "@/lib/data/admin";
import { datedCells } from "@/lib/data/rows";
import { toDateTimeLocal } from "@/lib/format";
import { withQuery } from "@/lib/nav";
import { isAdminConfigured } from "@/lib/supabase-admin";

export const metadata: Metadata = { title: "Tournaments" };

const PATH = "/admin/tournaments";

export default async function AdminTournamentsPage(props: PageProps<"/admin/tournaments">) {
  const { teamId } = await requireAdmin();
  if (!isAdminConfigured()) return <SetupNotice />;

  const params = await props.searchParams;
  const [{ seasons, season }, fields] = await Promise.all([
    adminSeason(teamId, "tournaments", params.season),
    listFields(),
  ]);
  if (!season) return <NoSeason />;

  const tournaments = await listTournaments(teamId, season.id);
  const base = withQuery(PATH, { season: season.year });
  const editing = typeof params.edit === "string" ? tournaments.find((row) => row.id === params.edit) : undefined;
  const fieldName = new Map(fields.map((field) => [field.id, field.label]));

  return (
    <>
      <PageHeader
        title="Tournaments"
        description={`The ${season.year} season's tournaments.`}
        actions={
          <>
            <SeasonPicker seasons={seasons} selected={season} />
            <ButtonLink href={withQuery(PATH, { season: season.year, new: 1 })} variant="primary" size="sm">
              New tournament
            </ButtonLink>
          </>
        }
      />

      <div className="mt-6">
        <TournamentsTable
          editPrefix={`${base}&edit=`}
          tournaments={tournaments.map((row) => ({
            id: row.id,
            ...datedCells(row.date),
            name: row.name,
            where: row.location ?? (row.fieldId ? (fieldName.get(row.fieldId) ?? null) : null),
            hasWebsite: row.websiteLink !== null,
          }))}
        />
      </div>

      <Drawer
        open={params.new !== undefined || editing !== undefined}
        title={editing?.name ?? "New tournament"}
        closeHref={base}
      >
        <TournamentForm
          key={editing?.id ?? "new"}
          seasonId={season.id}
          closeHref={base}
          fields={fields.map((field) => ({ value: field.id, label: field.label }))}
          tournament={
            editing
              ? {
                  id: editing.id,
                  eventId: editing.eventId,
                  date: toDateTimeLocal(editing.date),
                  name: editing.name,
                  websiteLink: editing.websiteLink,
                  location: editing.location,
                  fieldId: editing.fieldId,
                }
              : null
          }
        />
      </Drawer>
    </>
  );
}
