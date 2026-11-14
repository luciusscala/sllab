"use server";

import { revalidatePath } from "next/cache";

import { type FormState, dbMessage, text } from "@/lib/forms";
import { requirePlatformAdmin } from "@/lib/platform";
import { requireAdminClient } from "@/lib/supabase-admin";

const refresh = () => ["/console", "/console/schools", "/console/teams"].forEach((path) => revalidatePath(path));

export async function saveSchool(_state: FormState, data: FormData): Promise<FormState> {
  await requirePlatformAdmin();

  const id = text(data, "id");
  const name = text(data, "name");
  if (!name) return { error: "A school needs a name." };

  const client = requireAdminClient();
  const { error } = id
    ? await client.from("orgs").update({ name }).eq("id", id)
    : await client.from("orgs").insert({ name });
  if (error) return { error: dbMessage(error) };

  refresh();
  return { ok: true, message: id ? `${name} saved` : `${name} added` };
}

/**
 * `teams.org_id` cascades, so deleting a school would delete its teams and
 * everything they hold. Only an empty school can go.
 */
export async function removeSchool(_state: FormState, data: FormData): Promise<FormState> {
  await requirePlatformAdmin();

  const id = text(data, "id");
  if (!id) return { error: "Missing school." };

  const client = requireAdminClient();
  const { count, error: countError } = await client
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("org_id", id);
  if (countError) return { error: countError.message };
  if (count) return { error: `${count} ${count === 1 ? "team belongs" : "teams belong"} to this school. Move or remove them first.` };

  const { error } = await client.from("orgs").delete().eq("id", id);
  if (error) return { error: dbMessage(error) };

  refresh();
  return { ok: true, message: "School removed" };
}
