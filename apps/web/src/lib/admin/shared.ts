import { revalidatePath } from "next/cache";

import "server-only";

import { type FormState, dbMessage, text } from "@/lib/forms";
import { requireAdminClient } from "@/lib/supabase-admin";
import { uploadImage } from "@/lib/uploads";

/**
 * Fields and teams belong to the platform, not to one team: every team picks
 * venues from the same list and opponents from the same list. A team's
 * dashboard may add to them; only the console edits or removes them. These
 * are the writes both use; callers check who's asking first.
 */

const SHARED_PAGES = [
  "/admin/fields",
  "/admin/teams",
  "/admin/schedule",
  "/admin/practices",
  "/admin/tournaments",
  "/console",
  "/console/fields",
  "/console/teams",
];
export const revalidateShared = () => SHARED_PAGES.forEach((path) => revalidatePath(path));

/** Create a field, or with `id` and `allowUpdate`, edit one. The photo changes only when a file is chosen. */
export async function writeField(data: FormData, { allowUpdate }: { allowUpdate: boolean }): Promise<FormState> {
  const id = allowUpdate ? text(data, "id") : null;
  const name = text(data, "name");
  if (!name) return { error: "A field needs a name." };

  const picturePath = await uploadImage(data, "picture", "field_pictures");
  const columns = {
    name,
    area: text(data, "area"),
    maps_address: text(data, "maps_address"),
    recommended_parking: text(data, "recommended_parking"),
    ...(picturePath ? { picture_path: picturePath } : {}),
  };

  const client = requireAdminClient();
  const { error } = id
    ? await client.from("fields").update(columns).eq("id", id)
    : await client.from("fields").insert(columns);
  if (error) return { error: dbMessage(error) };

  revalidateShared();
  return { ok: true, message: id ? `${name} saved` : `${name} added` };
}

/** Games, practices and tournaments reference fields without cascading, so one in use is refused. */
export async function deleteField(data: FormData): Promise<FormState> {
  const id = text(data, "id");
  if (!id) return { error: "Missing field." };

  const { error } = await requireAdminClient().from("fields").delete().eq("id", id);
  if (error) {
    return {
      error: error.code === "23503" ? "Games or practices are still at this field, so it can't be removed." : error.message,
    };
  }

  revalidateShared();
  return { ok: true, message: "Field removed" };
}

const DIVISIONS = new Set(["mens", "womens", "mixed"]);

/**
 * Create a team, or with `id` and `allowUpdate`, edit one. `platform` adds the
 * columns only the console sets: which school, sport and division.
 */
export async function writeTeam(
  data: FormData,
  { allowUpdate, platform }: { allowUpdate: boolean; platform: boolean },
): Promise<FormState> {
  const id = allowUpdate ? text(data, "id") : null;
  const name = text(data, "name");
  if (!name) return { error: "A team needs a name." };

  const division = text(data, "division");
  if (division && !DIVISIONS.has(division)) return { error: "Unknown division." };

  const logoPath = await uploadImage(data, "logo", "logos");
  const columns = {
    name,
    data_alias: text(data, "data_alias"),
    ...(logoPath ? { logo_path: logoPath } : {}),
    ...(platform ? { org_id: text(data, "org_id"), sport_id: text(data, "sport_id"), division } : {}),
  };

  const client = requireAdminClient();
  const { error } = id
    ? await client.from("teams").update(columns).eq("id", id)
    : await client.from("teams").insert(columns);
  if (error) return { error: dbMessage(error) };

  revalidateShared();
  return { ok: true, message: id ? `${name} saved` : `${name} added` };
}
