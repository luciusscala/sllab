import type { SupabaseClient } from "@supabase/supabase-js";

import { one } from "@/lib/supabase";

export type Season = {
  id: string;
  year: number;
};

/**
 * Tables displayed a season at a time. `roster` carries `season_id` and
 * `team_id` itself; the rest reach both through the event they hang off.
 */
export type SeasonScopedTable =
  | "games"
  | "practices"
  | "social_events"
  | "tournaments"
  | "roster";

/**
 * Ids of every season a table has rows for, for one team. Takes the client as
 * an argument so the admin, which resolves its season the same way, can run it
 * with its own write client.
 */
export async function populatedSeasons(
  client: SupabaseClient,
  table: SeasonScopedTable,
  teamId: string,
): Promise<Set<string>> {
  if (table === "roster") {
    const { data, error } = await client
      .from("roster")
      .select("season_id")
      .eq("team_id", teamId);
    if (error) throw new Error(`Failed to load roster seasons: ${error.message}`);
    return new Set(
      ((data ?? []) as { season_id: string }[]).map((row) => row.season_id),
    );
  }

  // `!inner` drops rows with no event: they have no season, and no date to
  // show either.
  const { data, error } = await client
    .from(table)
    .select("event:events!inner(season_id)")
    .eq("event.team_id", teamId);
  if (error) throw new Error(`Failed to load ${table} seasons: ${error.message}`);

  return new Set(
    ((data ?? []) as unknown as { event: { season_id: string } | null }[]).flatMap(
      (row) => {
        const event = one(row.event);
        return event ? [event.season_id] : [];
      },
    ),
  );
}

/**
 * The season a given section should display.
 *
 * Sections resolve independently, the way athletics sites generally work: a
 * new schedule goes up as soon as fixtures are announced, while the roster
 * stays on last season until the squad is finalised. Preference order is the
 * season flagged `is_current` when it actually has rows, then the most recent
 * season that does.
 *
 * Whatever this returns is what the page heading names, so a section showing
 * last season always says so.
 */
/** Every season, newest first — the options in the schedule's year picker. */
