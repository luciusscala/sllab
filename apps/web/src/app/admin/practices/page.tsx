import type { Metadata } from "next";

import { PracticeForm } from "@/app/admin/practices/practice-form";
import { PracticesTable } from "@/app/admin/practices/practices-table";
import { NoSeason } from "@/components/admin/no-season";
import { SetupNotice } from "@/components/admin/setup-notice";
import { SeasonPicker } from "@/components/season-picker";
import { PageHeader } from "@/components/shell/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { requireAdmin } from "@/lib/auth";
import { adminSeason, listFields, listPractices } from "@/lib/data/admin";
import { datedCells } from "@/lib/data/rows";
import { formatGameDate, toDateTimeLocal } from "@/lib/format";
import { withQuery } from "@/lib/nav";
import { isAdminConfigured } from "@/lib/supabase-admin";

export const metadata: Metadata = { title: "Practices" };

const PATH = "/admin/practices";

export default async function AdminPracticesPage(props: PageProps<"/admin/practices">) {
  const { teamId } = await requireAdmin();
  if (!isAdminConfigured()) return <SetupNotice />;

  const params = await props.searchParams;
  const [{ seasons, season }, fields] = await Promise.all([
    adminSeason(teamId, "practices", params.season),
    listFields(),
  ]);
  if (!season) return <NoSeason />;

  const practices = await listPractices(teamId, season.id);
  const base = withQuery(PATH, { season: season.year });
  const editing = typeof params.edit === "string" ? practices.find((row) => row.id === params.edit) : undefined;

  return (
    <>
      <PageHeader
        title="Practices"
        description={`The ${season.year} season's practices.`}
        actions={
          <>
            <SeasonPicker seasons={seasons} selected={season} />
            <ButtonLink href={withQuery(PATH, { season: season.year, new: 1 })} variant="primary" size="sm">
              New practice
            </ButtonLink>
          </>
        }
      />

      <div className="mt-6">
        <PracticesTable
          editPrefix={`${base}&edit=`}
          practices={practices.map((row) => ({
            id: row.id,
            ...datedCells(row.date),
            field: row.field,
            notes: row.notes,
            hasFilm: row.filmLink !== null,
          }))}
        />
      </div>

      <Drawer
        open={params.new !== undefined || editing !== undefined}
        title={editing ? `${formatGameDate(editing.date)} practice` : "New practice"}
        description={editing?.field}
        closeHref={base}
      >
        <PracticeForm
          key={editing?.id ?? "new"}
          seasonId={season.id}
          closeHref={base}
          fields={fields.map((field) => ({ value: field.id, label: field.label }))}
          practice={
            editing
              ? {
                  id: editing.id,
                  eventId: editing.eventId,
                  date: toDateTimeLocal(editing.date),
                  day: formatGameDate(editing.date),
                  fieldId: editing.fieldId,
                  notes: editing.notes,
                  filmLink: editing.filmLink,
                }
              : null
          }
        />
      </Drawer>
    </>
  );
}
