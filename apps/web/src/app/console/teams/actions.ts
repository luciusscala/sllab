"use server";

import { revalidatePath } from "next/cache";

import { writeTeam } from "@/lib/admin/shared";
import { type FormState, dbMessage, phoneDigits, text } from "@/lib/forms";
import { requirePlatformAdmin } from "@/lib/platform";
import { requireAdminClient } from "@/lib/supabase-admin";

const PATH = "/console/teams";

export async function saveTeam(_state: FormState, data: FormData): Promise<FormState> {
  await requirePlatformAdmin();
  return writeTeam(data, { allowUpdate: true, platform: true });
}

/**
 * Events, roster and memberships cascade from a team, and games name it as
 * a side. Only a team nothing refers to (an opponent added by mistake, a
 * duplicate) can be removed.
 */
export async function removeTeam(_state: FormState, data: FormData): Promise<FormState> {
  await requirePlatformAdmin();

  const id = text(data, "id");
  if (!id) return { error: "Missing team." };

  const client = requireAdminClient();
  const head = { count: "exact" as const, head: true };
  const checks = await Promise.all([
    client.from("memberships").select("id", head).eq("team_id", id),
    client.from("events").select("id", head).eq("team_id", id),
    client.from("roster").select("id", head).eq("team_id", id),
    client.from("games").select("id", head).or(`home_team_id.eq.${id},away_team_id.eq.${id}`),
  ]);
  const failed = checks.find((check) => check.error);
  if (failed?.error) return { error: failed.error.message };
  if (checks.some((check) => check.count)) {
    return { error: "This team has members, events or games, so it can't be removed." };
  }

  const { error } = await client.from("teams").delete().eq("id", id);
  if (error) return { error: dbMessage(error) };

  revalidatePath(PATH);
  return { ok: true, message: "Team removed" };
}

/** No 0/o or 1/l/i, so a code read aloud or off a group chat gets typed right. */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function newCode(length = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

/**
 * Gives a team a code, or replaces the one it has. Anyone holding the old
 * code can no longer use it to join; existing members are unaffected.
 */
export async function issueCode(_state: FormState, data: FormData): Promise<FormState> {
  await requirePlatformAdmin();

  const teamId = text(data, "team_id");
  if (!teamId) return { error: "Missing team." };

  const client = requireAdminClient();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await client
      .from("team_secrets")
      .upsert({ team_id: teamId, team_code: newCode(), updated_at: new Date().toISOString() }, { onConflict: "team_id" });
    if (!error) {
      revalidatePath(PATH);
      return { ok: true, message: "Team code issued" };
    }
    // Another team already has that code; draw again.
    if (error.code !== "23505") return { error: error.message };
  }
  return { error: "Couldn't find an unused code. Try again." };
}

/**
 * Makes a phone number the team's captain. Someone already on the team is
 * promoted now; anyone else becomes captain when they sign in with that
 * number and enter the team code, which is how `join_team` consumes invites.
 */
export async function inviteCaptain(_state: FormState, data: FormData): Promise<FormState> {
  await requirePlatformAdmin();

  const teamId = text(data, "team_id");
  const phone = phoneDigits(data);
  if (!teamId) return { error: "Missing team." };
  if (!phone) return { error: "Enter a 10-digit US phone number." };

  const client = requireAdminClient();
  const { data: contact } = await client.from("people_contacts").select("person_id").eq("phone", phone).maybeSingle();

  if (contact) {
    const { data: membership } = await client
      .from("memberships")
      .select("id")
      .eq("team_id", teamId)
      .eq("person_id", contact.person_id)
      .maybeSingle();
    if (membership) {
      const { error } = await client
        .from("memberships")
        .update({ role: "captain", status: "active", is_new: false })
        .eq("id", membership.id);
      if (error) return { error: error.message };
      revalidatePath(PATH);
      return { ok: true, message: "Already on the team: now captain" };
    }
  }

  const { error } = await client
    .from("team_invites")
    .upsert({ team_id: teamId, phone, role: "captain", accepted_at: null }, { onConflict: "team_id,phone" });
  if (error) return { error: error.message };

  revalidatePath(PATH);
  return { ok: true, message: "Captain invited" };
}

export async function cancelInvite(_state: FormState, data: FormData): Promise<FormState> {
  await requirePlatformAdmin();

  const teamId = text(data, "team_id");
  const phone = text(data, "phone");
  if (!teamId || !phone) return { error: "Missing invite." };

  const { error } = await requireAdminClient().from("team_invites").delete().eq("team_id", teamId).eq("phone", phone);
  if (error) return { error: error.message };

  revalidatePath(PATH);
  return { ok: true, message: "Invite cancelled" };
}
