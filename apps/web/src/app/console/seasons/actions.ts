"use server";

import { revalidatePath } from "next/cache";

import { type FormState, checked, dbMessage, int, text } from "@/lib/forms";
import { requirePlatformAdmin } from "@/lib/platform";
import { requireAdminClient } from "@/lib/supabase-admin";

const refresh = () => {
  for (const path of ["/console", "/console/seasons", "/admin"]) revalidatePath(path, "layout");
};

/**
 * Only one season can be current (a partial unique index says so), so the
 * old one is cleared first. Between the two writes there is briefly no
 * current season, which every reader already handles by falling back to the
 * latest season with data.
 */
async function makeCurrent(id: string) {
  const client = requireAdminClient();
  const { error: clearError } = await client.from("seasons").update({ is_current: false }).eq("is_current", true);
  if (clearError) return clearError.message;
  const { error } = await client.from("seasons").update({ is_current: true }).eq("id", id);
  return error?.message ?? null;
}

export async function createSeason(_state: FormState, data: FormData): Promise<FormState> {
  await requirePlatformAdmin();

  const year = int(data, "year");
  if (!year || year < 2000 || year > 2100) return { error: "Enter the year the season starts, like 2027." };

  const { data: row, error } = await requireAdminClient().from("seasons").insert({ year, is_current: false }).select("id").single();
  if (error) return { error: error.code === "23505" ? `There's already a ${year} season.` : dbMessage(error) };

  if (checked(data, "is_current")) {
    const problem = await makeCurrent(row.id);
    if (problem) return { error: `Season added, but it isn't current yet: ${problem}` };
  }

  refresh();
  return { ok: true, message: `${year} season added` };
}

export async function setCurrentSeason(_state: FormState, data: FormData): Promise<FormState> {
  await requirePlatformAdmin();

  const id = text(data, "id");
  if (!id) return { error: "Missing season." };
  const problem = await makeCurrent(id);
  if (problem) return { error: problem };

  refresh();
  return { ok: true, message: "Current season changed" };
}

/**
 * Events and roster rows cascade from their season, so deleting a season
 * with either would erase a year of every team's data. Only an empty one
 * (opened by mistake) can go.
 */
export async function removeSeason(_state: FormState, data: FormData): Promise<FormState> {
  await requirePlatformAdmin();

  const id = text(data, "id");
  if (!id) return { error: "Missing season." };

  const client = requireAdminClient();
  const [events, roster] = await Promise.all([
    client.from("events").select("id", { count: "exact", head: true }).eq("season_id", id),
    client.from("roster").select("id", { count: "exact", head: true }).eq("season_id", id),
  ]);
  if (events.error || roster.error) return { error: (events.error ?? roster.error)!.message };
  if (events.count || roster.count) return { error: "Teams have events or players in this season, so it can't be removed." };

  const { error } = await client.from("seasons").delete().eq("id", id);
  if (error) return { error: dbMessage(error) };

  refresh();
  return { ok: true, message: "Season removed" };
}
