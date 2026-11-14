"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { type FormState, text } from "@/lib/forms";
import { requireAdminClient } from "@/lib/supabase-admin";
import { uploadImage } from "@/lib/uploads";

/** The fields page itself, and every page with a field dropdown. */
const PAGES = ["/admin/fields", "/admin/schedule", "/admin/practices", "/admin/tournaments"];
const revalidate = () => PAGES.forEach((path) => revalidatePath(path));

/** Create (no id) or update (id) one field. The photo only changes when a new one is chosen. */
export async function saveField(_state: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();

  const id = text(data, "id");
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
  if (error) return { error: error.message };

  revalidate();
  return { ok: true, message: id ? `${name} saved` : `${name} added` };
}

export async function removeField(_state: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();

  const id = text(data, "id");
  if (!id) return { error: "Missing field." };

  // Games, practices and tournaments reference the field, so the database
  // refuses to remove one still in use; its message is shown as-is.
  const { error } = await requireAdminClient().from("fields").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidate();
  return { ok: true, message: "Field removed" };
}
