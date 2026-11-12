import { revalidatePath, revalidateTag } from "next/cache";

import type { SupabaseClient } from "@supabase/supabase-js";

import { PUBLIC_DATA } from "@/lib/data/cache";
import type { EventType } from "@/lib/data/events";
import "server-only";

/**
 * Writes shared by the admin dashboard and the team section. Each takes the
 * client to write with: the team app passes the signed-in person's, so the
 * database's staff policies decide; the dashboard passes the admin client,
 * behind `requireAdmin()`.
 */

/** Refresh every public page after a write, rather than waiting out the ISR window. */
export function revalidatePublic() {
  // The cached Supabase reads behind every public page. Without this the paths
  // below would re-render against the same stale rows.
  //
  // `expire: 0` rather than the recommended "max": this runs immediately after
  // the admin's own write, and stale-while-revalidate would hand them back the
  // row they just changed. One blocking query is the right trade here.
  revalidateTag(PUBLIC_DATA, { expire: 0 });

  // Statically rendered pages hold their own output, so they need regenerating
  // as well as re-reading. `/standings` joins crests from `teams`, so a new
  // team logo shows up there too.
  revalidatePath("/");
  revalidatePath("/standings");
  revalidatePath("/schedule");
  revalidatePath("/roster");
}

/** Tables whose rows hang off an `events` row for their season and date. */
export type EventTable = "games" | "practices" | "social_events" | "tournaments";

export const TABLE_FOR: Record<EventType, EventTable> = {
  game: "games",
  practice: "practices",
  social: "social_events",
  tournament: "tournaments",
};

export type Columns = Record<string, string | number | boolean | null>;

/**
 * Creates the event first, since the row references it, then the row. If the
 * row fails the event is removed again, so a rejected submit can't leave a
 * dateless placeholder behind. Returns an error message, or null on success.
 */
export async function insertWithEvent(
  client: SupabaseClient,
  table: EventTable,
  eventType: EventType,
  teamId: string,
  seasonId: string,
  date: string,
  columns: Columns,
) {
  const { data: event, error: eventError } = await client
    .from("events")
    .insert({
      team_id: teamId,
      season_id: seasonId,
      event_type: eventType,
      event_date: date,
    })
    .select("id")
    .single();

  if (eventError) return eventError.message;

  const { error } = await client
    .from(table)
    .insert({ event_id: event.id, ...columns });

  if (error) {
    await client.from("events").delete().eq("id", event.id);
    return error.message;
  }

  return null;
}

/**
 * The date lives on the event and everything else on the row. Keyed by the
 * event because every subtype row carries a unique `event_id`, which is the id
 * both the app and the site have to hand.
 */
export async function updateWithEvent(
  client: SupabaseClient,
  table: EventTable,
  eventId: string,
  date: string,
  columns: Columns,
) {
  const { error: eventError } = await client
    .from("events")
    .update({ event_date: date })
    .eq("id", eventId);

  if (eventError) return eventError.message;

  const { error } = await client
    .from(table)
    .update(columns)
    .eq("event_id", eventId);
  return error ? error.message : null;
}

/**
 * The event's row cascades to its subtype row and the players' responses, so
 * one delete is the whole job.
 */
export async function deleteWithEvent(client: SupabaseClient, eventId: string) {
  const { error } = await client.from("events").delete().eq("id", eventId);
  return error ? error.message : null;
}
