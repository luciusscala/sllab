import type { Metadata } from "next";

import { SeasonForm } from "@/app/console/seasons/season-form";
import { SeasonsTable } from "@/app/console/seasons/seasons-table";
import { PageHeader } from "@/components/shell/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { listConsoleSeasons } from "@/lib/data/console";
import { requirePlatformAdmin } from "@/lib/platform";

export const metadata: Metadata = { title: "Seasons" };

/** Seasons are global: every club sport runs on the academic year. */
export default async function ConsoleSeasonsPage(props: PageProps<"/console/seasons">) {
  await requirePlatformAdmin();

  const params = await props.searchParams;
  const seasons = await listConsoleSeasons();
  const editing = typeof params.edit === "string" ? (seasons.find((row) => row.id === params.edit) ?? null) : null;

  return (
    <>
      <PageHeader
        title="Seasons"
        description="One set of seasons for every team, on the academic year. The current one is what apps and dashboards open on."
        actions={
          <ButtonLink href="/console/seasons?new=1" variant="primary" size="sm">
            New season
          </ButtonLink>
        }
      />
      <div className="mt-6">
        <SeasonsTable seasons={seasons} />
      </div>
      <Drawer
        open={params.new !== undefined || editing !== null}
        title={editing ? `${editing.year}–${String(editing.year + 1).slice(2)} season` : "New season"}
        description={editing?.isCurrent ? "The current season." : undefined}
        closeHref="/console/seasons"
      >
        <SeasonForm key={editing?.id ?? "new"} season={editing} />
      </Drawer>
    </>
  );
}
