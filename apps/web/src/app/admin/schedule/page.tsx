import type { Metadata } from "next";

import { GameForm } from "@/app/admin/schedule/game-form";
import { GamesTable } from "@/app/admin/schedule/games-table";
import { NoSeason } from "@/components/admin/no-season";
import { SetupNotice } from "@/components/admin/setup-notice";
import { SeasonPicker } from "@/components/season-picker";
import { PageHeader } from "@/components/shell/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { requireAdmin } from "@/lib/auth";
import { adminSeason, listFields, listGames, listOpponents } from "@/lib/data/admin";
import { datedCells } from "@/lib/data/rows";
import { toDateTimeLocal } from "@/lib/format";
import { withQuery } from "@/lib/nav";
import { isAdminConfigured } from "@/lib/supabase-admin";

export const metadata: Metadata = { title: "Schedule" };

const PATH = "/admin/schedule";

export default async function AdminSchedulePage(props: PageProps<"/admin/schedule">) {
  const { teamId } = await requireAdmin();
  if (!isAdminConfigured()) return <SetupNotice />;

  const params = await props.searchParams;
  const [{ seasons, season }, opponents, fields] = await Promise.all([
    adminSeason(teamId, "games", params.season),
    listOpponents(teamId),
    listFields(),
  ]);
  if (!season) return <NoSeason />;

  const games = await listGames(teamId, season.id);
  const base = withQuery(PATH, { season: season.year });
  const editing = typeof params.edit === "string" ? games.find((game) => game.id === params.edit) : undefined;
  const fieldName = new Map(fields.map((field) => [field.id, field.label]));

  return (
    <>
      <PageHeader
        title="Schedule"
        description={`The ${season.year} season's games. Open one to correct it or enter the result.`}
        actions={
          <>
            <SeasonPicker seasons={seasons} selected={season} />
            <ButtonLink href={withQuery(PATH, { season: season.year, new: 1 })} variant="primary" size="sm">
              New game
            </ButtonLink>
          </>
        }
      />

      <div className="mt-6">
        <GamesTable
          editPrefix={`${base}&edit=`}
          games={games.map((game) => ({
            id: game.id,
            ...datedCells(game.gameDate),
            opponent: game.opponent,
            isHome: game.isHome,
            field: game.fieldId ? (fieldName.get(game.fieldId) ?? null) : null,
            ourScore: game.ourScore,
            theirScore: game.theirScore,
          }))}
        />
      </div>

      <Drawer
        open={params.new !== undefined || editing !== undefined}
        title={editing ? `${editing.isHome ? "vs" : "at"} ${editing.opponent}` : "New game"}
        closeHref={base}
      >
        <GameForm
          key={editing?.id ?? "new"}
          seasonId={season.id}
          closeHref={base}
          opponents={opponents.map((team) => ({ value: team.id, label: team.name }))}
          fields={fields.map((field) => ({ value: field.id, label: field.label }))}
          game={
            editing
              ? {
                  id: editing.id,
                  eventId: editing.eventId,
                  date: toDateTimeLocal(editing.gameDate),
                  opponentId: editing.opponentId,
                  opponent: editing.opponent,
                  isHome: editing.isHome,
                  fieldId: editing.fieldId,
                  filmLink: editing.filmLink,
                  ourScore: editing.ourScore,
                  theirScore: editing.theirScore,
                }
              : null
          }
        />
      </Drawer>
    </>
  );
}
