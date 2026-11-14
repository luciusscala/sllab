import { revalidatePath } from "next/cache";

import "server-only";

import { requireAdmin } from "@/lib/auth";
import type { EventType } from "@/lib/data/events";
import {
  type Columns,
  type EventTable,
  deleteWithEvent,
  insertWithEvent,
  updateWithEvent,
} from "@/lib/data/events-write";
import { fromDateTimeLocal } from "@/lib/format";
import { type FormState, missing, text } from "@/lib/forms";
import { requireAdminClient } from "@/lib/supabase-admin";

/**
 * Games, practices, socials and tournaments are all a row hanging off an
 * `events` row that holds the team, season and date. The dashboard edits
 * them the same way, so each resource's actions are a description of it
 * (this type) handed to `saveDated` and `removeDated`.
 */
export type DatedResource = {
  table: EventTable;
  type: EventType;
  /** The dashboard page to refresh. */
  path: string;
  /** "Game", for "Game added" and "Game removed". */
  noun: string;
  /** Required besides the date, as [form name, label]. */
  required: [string, string][];
  columns: (data: FormData, teamId: string) => Columns;
};

/** Create (no `id`) or update (`id` and `event_id`). The date is always the `date` input. */
export async function saveDated(resource: DatedResource, data: FormData): Promise<FormState> {
  const { teamId } = await requireAdmin();

  const problem = missing(data, [...resource.required, ["date", "Date"]]);
  if (problem) return { error: problem };

  const date = fromDateTimeLocal(text(data, "date")!);
  if (!date) return { error: "That isn't a valid date and time." };

  const client = requireAdminClient();
  const eventId = text(data, "event_id");
  const columns = resource.columns(data, teamId);

  let error: string | null;
  if (eventId) {
    if (!(await ownsEvent(teamId, eventId))) return { error: "That isn't one of your team's events." };
    error = await updateWithEvent(client, resource.table, eventId, date, columns);
  } else {
    const seasonId = text(data, "season_id");
    if (!seasonId) return { error: "Choose a season first." };
    error = await insertWithEvent(client, resource.table, resource.type, teamId, seasonId, date, columns);
  }
  if (error) return { error };

  revalidatePath(resource.path);
  return { ok: true, message: `${resource.noun} ${eventId ? "saved" : "added"}` };
}

/** Removing the event removes the row and everyone's responses with it. */
export async function removeDated(resource: DatedResource, data: FormData): Promise<FormState> {
  const { teamId } = await requireAdmin();

  const eventId = text(data, "event_id");
  if (!eventId || !(await ownsEvent(teamId, eventId))) return { error: "That isn't one of your team's events." };

  const error = await deleteWithEvent(requireAdminClient(), eventId);
  if (error) return { error };

  revalidatePath(resource.path);
  return { ok: true, message: `${resource.noun} removed` };
}

/** The secret key bypasses the policies, so the team check happens here. */
async function ownsEvent(teamId: string, eventId: string) {
  const { data } = await requireAdminClient()
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("team_id", teamId)
    .maybeSingle();
  return data !== null;
}
