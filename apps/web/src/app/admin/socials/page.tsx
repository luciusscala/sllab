import type { Metadata } from "next";

import { SocialForm } from "@/app/admin/socials/social-form";
import { SocialsTable } from "@/app/admin/socials/socials-table";
import { NoSeason } from "@/components/admin/no-season";
import { SetupNotice } from "@/components/admin/setup-notice";
import { SeasonPicker } from "@/components/season-picker";
import { PageHeader } from "@/components/shell/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { requireAdmin } from "@/lib/auth";
import { adminSeason, listSocialEvents } from "@/lib/data/admin";
import { datedCells } from "@/lib/data/rows";
import { toDateTimeLocal } from "@/lib/format";
import { withQuery } from "@/lib/nav";
import { isAdminConfigured } from "@/lib/supabase-admin";

export const metadata: Metadata = { title: "Socials" };

const PATH = "/admin/socials";

export default async function AdminSocialsPage(props: PageProps<"/admin/socials">) {
  const { teamId } = await requireAdmin();
  if (!isAdminConfigured()) return <SetupNotice />;

  const params = await props.searchParams;
  const { seasons, season } = await adminSeason(teamId, "social_events", params.season);
  if (!season) return <NoSeason />;

  const socials = await listSocialEvents(teamId, season.id);
  const base = withQuery(PATH, { season: season.year });
  const editing = typeof params.edit === "string" ? socials.find((row) => row.id === params.edit) : undefined;

  return (
    <>
      <PageHeader
        title="Socials"
        description={`The ${season.year} season's social events.`}
        actions={
          <>
            <SeasonPicker seasons={seasons} selected={season} />
            <ButtonLink href={withQuery(PATH, { season: season.year, new: 1 })} variant="primary" size="sm">
              New social
            </ButtonLink>
          </>
        }
      />

      <div className="mt-6">
        <SocialsTable
          editPrefix={`${base}&edit=`}
          socials={socials.map((row) => ({ id: row.id, ...datedCells(row.date), name: row.name, description: row.description }))}
        />
      </div>

      <Drawer
        open={params.new !== undefined || editing !== undefined}
        title={editing?.name ?? "New social"}
        closeHref={base}
      >
        <SocialForm
          key={editing?.id ?? "new"}
          seasonId={season.id}
          closeHref={base}
          social={
            editing
              ? {
                  id: editing.id,
                  eventId: editing.eventId,
                  date: toDateTimeLocal(editing.date),
                  name: editing.name,
                  description: editing.description,
                }
              : null
          }
        />
      </Drawer>
    </>
  );
}
