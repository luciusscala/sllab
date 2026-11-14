"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { CLASSES, POSITIONS } from "@/lib/data/roster";
import { type FormState, dbMessage, int, missing, phoneDigits, text } from "@/lib/forms";
import { requireAdminClient } from "@/lib/supabase-admin";
import { uploadImage } from "@/lib/uploads";

const PATH = "/admin/roster";
const BAD_PHONE = "Enter a 10-digit phone number, or leave it blank.";

/**
 * Sets or clears a person's number. The number is how a sign-in finds its
 * roster spot, so adding one here is what lets a player the dashboard created
 * sign in as themselves. Consent to reminders is theirs to give, on sign-in.
 */
async function savePhone(personId: string, phone: string) {
  const client = requireAdminClient();
  if (!phone) {
    const { error } = await client.from("people_contacts").delete().eq("person_id", personId);
    return error?.message ?? null;
  }
  const { error } = await client
    .from("people_contacts")
    .upsert({ person_id: personId, phone }, { onConflict: "person_id" });
  return error ? (error.code === "23505" ? "That number belongs to someone else." : error.message) : null;
}

/** The roster row, if it's on this team. The secret key skips the policies, so this is the check. */
async function ownEntry(teamId: string, entryId: string) {
  const { data } = await requireAdminClient()
    .from("roster")
    .select("id, person_id")
    .eq("id", entryId)
    .eq("team_id", teamId)
    .maybeSingle();
  return data as { id: string; person_id: string } | null;
}

function rosterColumns(data: FormData) {
  const position = text(data, "position");
  const playerClass = text(data, "class");
  if (position && !POSITIONS.includes(position)) return null;
  if (playerClass && !CLASSES.includes(playerClass)) return null;
  return { position, class: playerClass, number: int(data, "number") };
}

/** Create (no `entry_id`) a person, their roster row and an active membership; or update one. */
export async function savePlayer(_state: FormState, data: FormData): Promise<FormState> {
  const { teamId } = await requireAdmin();
  const client = requireAdminClient();

  const problem = missing(data, [["name", "Name"], ["position", "Position"], ["class", "Class"]]);
  if (problem) return { error: problem };
  const roster = rosterColumns(data);
  if (!roster) return { error: "Choose a position and class from the lists." };
  const phone = phoneDigits(data);
  if (phone === null) return { error: BAD_PHONE };

  const name = text(data, "name")!;
  const picturePath = await uploadImage(data, "picture", "player_pictures");
  const person = {
    name,
    hometown: text(data, "hometown"),
    ...(picturePath ? { picture_path: picturePath } : {}),
  };

  const entryId = text(data, "entry_id");
  if (entryId) {
    const entry = await ownEntry(teamId, entryId);
    if (!entry) return { error: "That player isn't on your roster." };

    const { error: personError } = await client.from("people").update(person).eq("id", entry.person_id);
    if (personError) return { error: dbMessage(personError) };
    const { error: rosterError } = await client.from("roster").update(roster).eq("id", entry.id);
    if (rosterError) return { error: dbMessage(rosterError) };
    const phoneError = await savePhone(entry.person_id, phone);
    if (phoneError) return { error: phoneError };

    revalidatePath(PATH);
    return { ok: true, message: `${name} saved` };
  }

  const seasonId = text(data, "season_id");
  if (!seasonId) return { error: "Choose a season first." };

  const { data: inserted, error: personError } = await client.from("people").insert(person).select("id").single();
  if (personError) return { error: dbMessage(personError) };

  const { error: rosterError } = await client
    .from("roster")
    .insert({ person_id: inserted.id, team_id: teamId, season_id: seasonId, ...roster });

  // The person exists but is on no roster; removing them keeps the tables
  // consistent rather than leaving an orphan behind.
  if (rosterError) {
    await client.from("people").delete().eq("id", inserted.id);
    return { error: dbMessage(rosterError) };
  }

  // On the roster means on the team: an active player, already reviewed.
  await client
    .from("memberships")
    .upsert(
      { team_id: teamId, person_id: inserted.id, role: "player", status: "active", is_new: false },
      { onConflict: "team_id,person_id" },
    );

  if (phone) {
    const phoneError = await savePhone(inserted.id, phone);
    if (phoneError) return { error: `Player added, but the number wasn't saved: ${phoneError}` };
  }

  revalidatePath(PATH);
  return { ok: true, message: `${name} added` };
}

/**
 * Removes a player from this season's squad. The `people` row only follows
 * when no other season still lists them, so removing a graduate from 2026
 * can't erase them from 2025.
 */
export async function removePlayer(_state: FormState, data: FormData): Promise<FormState> {
  const { teamId } = await requireAdmin();
  const client = requireAdminClient();

  const entry = await ownEntry(teamId, text(data, "entry_id") ?? "");
  if (!entry) return { error: "That player isn't on your roster." };

  const { error: entryError } = await client.from("roster").delete().eq("id", entry.id);
  if (entryError) return { error: dbMessage(entryError) };

  const { data: remaining, error: lookupError } = await client
    .from("roster")
    .select("id")
    .eq("person_id", entry.person_id)
    .limit(1);
  if (lookupError) return { error: lookupError.message };

  if ((remaining ?? []).length === 0) {
    const { error: personError } = await client.from("people").delete().eq("id", entry.person_id);
    if (personError) return { error: dbMessage(personError) };
  }

  revalidatePath(PATH);
  return { ok: true, message: "Removed from the roster" };
}
