"use server";

import { revalidatePath } from "next/cache";

import { CLUB_TEAM_ID } from "@/lib/club";
import { EVENT_TYPE } from "@/lib/data/events";
import {
  deleteWithEvent,
  insertWithEvent,
  revalidatePublic,
  updateWithEvent,
} from "@/lib/data/events-write";
import { requireAdmin } from "@/lib/auth";
import { sidesFor } from "@/lib/data/schedule";
import { fromDateTimeLocal } from "@/lib/format";
import { requireAdminClient } from "@/lib/supabase-admin";

export type ActionState = { error?: string } | null;

const text = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const int = (data: FormData, key: string) => {
  const value = text(data, key);
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

/** A typed phone as the database stores it (digits with country code), "" when blank, or null when it isn't one. */
function phoneDigits(data: FormData) {
  const raw = text(data, "phone");
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return digits;
  return null;
}

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

/** Uploads to a public bucket and returns the object key, or null if no file. */
async function uploadImage(file: FormData, key: string, bucket: string) {
  const value = file.get(key);
  if (!(value instanceof File) || value.size === 0) return null;

  const extension = value.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const objectKey = `${crypto.randomUUID()}.${extension}`;

  const { error } = await requireAdminClient()
    .storage.from(bucket)
    .upload(objectKey, value, { contentType: value.type, upsert: false });

  if (error) throw new Error(`Upload failed: ${error.message}`);
  return objectKey;
}

export async function createTeam(_state: ActionState, data: FormData) {
  await requireAdmin();

  const name = text(data, "name");
  if (!name) return { error: "Name is required." };

  const logoPath = await uploadImage(data, "logo", "logos");

  const { error } = await requireAdminClient()
    .from("teams")
    .insert({ name, logo_path: logoPath, data_alias: text(data, "data_alias") });

  if (error) return { error: error.message };

  revalidatePublic();
  revalidatePath("/admin/teams");
  return null;
}

/** The text columns on a `fields` row; the photo is handled by the caller. */
function fieldColumns(data: FormData) {
  return {
    area: text(data, "area"),
    maps_address: text(data, "maps_address"),
    recommended_parking: text(data, "recommended_parking"),
  };
}

/** Every admin page with a field dropdown, plus the fields page itself. */
function revalidateFieldPages() {
  revalidatePath("/admin/fields");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/practices");
  revalidatePath("/admin/tournaments");
}

export async function createField(_state: ActionState, data: FormData) {
  await requireAdmin();

  const name = text(data, "name");
  if (!name) return { error: "Name is required." };

  const picturePath = await uploadImage(data, "picture", "field_pictures");

  const { error } = await requireAdminClient()
    .from("fields")
    .insert({ name, ...fieldColumns(data), picture_path: picturePath });

  if (error) return { error: error.message };

  // A new field changes nothing public until a game is assigned to it, so
  // only the admin pages that list fields need refreshing.
  revalidateFieldPages();
  return null;
}

export async function updateField(_state: ActionState, data: FormData) {
  await requireAdmin();

  const id = text(data, "id");
  const name = text(data, "name");
  if (!id || !name) return { error: "Name is required." };

  // An empty file input means "keep the current photo", not "remove it".
  const picturePath = await uploadImage(data, "picture", "field_pictures");

  const { error } = await requireAdminClient()
    .from("fields")
    .update({
      name,
      ...fieldColumns(data),
      ...(picturePath ? { picture_path: picturePath } : {}),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  // Unlike a create, an edit reaches every game already played on the field.
  revalidatePublic();
  revalidateFieldPages();
  return null;
}

export async function deleteField(_state: ActionState, data: FormData) {
  await requireAdmin();

  const id = text(data, "id");
  if (!id) return { error: "Missing field." };

  // Games, practices and tournaments reference the field, so the database
  // refuses to delete one that is still in use; its message is shown as-is.
  const { error } = await requireAdminClient().from("fields").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePublic();
  revalidateFieldPages();
  return null;
}

/** A datetime-local value pinned to the team's zone, or null when unparseable. */
const dateTime = (data: FormData, key: string) => {
  const value = text(data, key);
  return value ? fromDateTimeLocal(value) : null;
};

/**
 * The columns a form can set on a `games` row; the kickoff lives on its event.
 * The form speaks in "us against them", the row in home and away.
 */
function gameColumns(data: FormData) {
  return {
    ...sidesFor(CLUB_TEAM_ID, {
      opponentId: text(data, "opponent_id"),
      isHome: data.get("is_home") === "on",
      ourScore: int(data, "our_score"),
      theirScore: int(data, "their_score"),
    }),
    field_id: text(data, "field_id"),
    film_link: text(data, "film_link"),
  };
}

export async function createGame(_state: ActionState, data: FormData) {
  await requireAdmin();

  const seasonId = text(data, "season_id");
  const opponentId = text(data, "opponent_id");
  if (!seasonId || !opponentId || !text(data, "game_date")) {
    return { error: "Season, opponent and date are required." };
  }

  const kickoff = dateTime(data, "game_date");
  if (!kickoff) return { error: "Date is not a valid date and time." };

  const error = await insertWithEvent(
    requireAdminClient(),
    "games",
    EVENT_TYPE.game,
    CLUB_TEAM_ID,
    seasonId,
    kickoff,
    gameColumns(data),
  );
  if (error) return { error };

  revalidatePublic();
  revalidatePath("/admin/schedule");
  return null;
}

/** Every field on a fixture, so a game can be corrected after it is created. */
export async function updateGame(_state: ActionState, data: FormData) {
  await requireAdmin();

  const id = text(data, "id");
  const eventId = text(data, "event_id");
  if (!id || !eventId || !text(data, "opponent_id") || !text(data, "game_date")) {
    return { error: "Opponent and date are required." };
  }

  const kickoff = dateTime(data, "game_date");
  if (!kickoff) return { error: "Date is not a valid date and time." };

  const error = await updateWithEvent(requireAdminClient(), "games", eventId, kickoff, gameColumns(data));
  if (error) return { error };

  revalidatePublic();
  revalidatePath("/admin/schedule");
  return null;
}

export async function deleteGame(_state: ActionState, data: FormData) {
  await requireAdmin();

  const id = text(data, "id");
  const eventId = text(data, "event_id");
  if (!id || !eventId) return { error: "Missing game." };

  const error = await deleteWithEvent(requireAdminClient(), eventId);
  if (error) return { error };

  revalidatePublic();
  revalidatePath("/admin/schedule");
  return null;
}

// Practices, socials and tournaments appear nowhere on the public site, so
// their actions refresh only their own admin page.

function practiceColumns(data: FormData) {
  return {
    field_id: text(data, "field_id"),
    notes: text(data, "notes"),
    film_link: text(data, "film_link"),
  };
}

export async function createPractice(_state: ActionState, data: FormData) {
  await requireAdmin();

  const seasonId = text(data, "season_id");
  if (!seasonId || !text(data, "field_id") || !text(data, "date")) {
    return { error: "Season, field and date are required." };
  }

  const date = dateTime(data, "date");
  if (!date) return { error: "Date is not a valid date and time." };

  const error = await insertWithEvent(
    requireAdminClient(),
    "practices",
    EVENT_TYPE.practice,
    CLUB_TEAM_ID,
    seasonId,
    date,
    practiceColumns(data),
  );
  if (error) return { error };

  revalidatePath("/admin/practices");
  return null;
}

export async function updatePractice(_state: ActionState, data: FormData) {
  await requireAdmin();

  const id = text(data, "id");
  const eventId = text(data, "event_id");
  if (!id || !eventId || !text(data, "field_id") || !text(data, "date")) {
    return { error: "Field and date are required." };
  }

  const date = dateTime(data, "date");
  if (!date) return { error: "Date is not a valid date and time." };

  const error = await updateWithEvent(requireAdminClient(), "practices", eventId, date, practiceColumns(data));
  if (error) return { error };

  revalidatePath("/admin/practices");
  return null;
}

export async function deletePractice(_state: ActionState, data: FormData) {
  await requireAdmin();

  const id = text(data, "id");
  const eventId = text(data, "event_id");
  if (!id || !eventId) return { error: "Missing practice." };

  const error = await deleteWithEvent(requireAdminClient(), eventId);
  if (error) return { error };

  revalidatePath("/admin/practices");
  return null;
}

function socialEventColumns(data: FormData) {
  return {
    name: text(data, "name"),
    description: text(data, "description"),
  };
}

/**
 * `social_events.event_id` is nullable in the schema, but the dashboard always
 * creates one: without an event a social has no date and belongs to no season,
 * so nothing would list it.
 */
export async function createSocialEvent(_state: ActionState, data: FormData) {
  await requireAdmin();

  const seasonId = text(data, "season_id");
  if (!seasonId || !text(data, "name") || !text(data, "date")) {
    return { error: "Season, name and date are required." };
  }

  const date = dateTime(data, "date");
  if (!date) return { error: "Date is not a valid date and time." };

  const error = await insertWithEvent(
    requireAdminClient(),
    "social_events",
    EVENT_TYPE.social,
    CLUB_TEAM_ID,
    seasonId,
    date,
    socialEventColumns(data),
  );
  if (error) return { error };

  revalidatePath("/admin/socials");
  return null;
}

export async function updateSocialEvent(_state: ActionState, data: FormData) {
  await requireAdmin();

  const id = text(data, "id");
  const eventId = text(data, "event_id");
  if (!id || !eventId || !text(data, "name") || !text(data, "date")) {
    return { error: "Name and date are required." };
  }

  const date = dateTime(data, "date");
  if (!date) return { error: "Date is not a valid date and time." };

  const error = await updateWithEvent(requireAdminClient(), "social_events", eventId, date, socialEventColumns(data));
  if (error) return { error };

  revalidatePath("/admin/socials");
  return null;
}

export async function deleteSocialEvent(_state: ActionState, data: FormData) {
  await requireAdmin();

  const id = text(data, "id");
  const eventId = text(data, "event_id");
  if (!id || !eventId) return { error: "Missing social event." };

  const error = await deleteWithEvent(requireAdminClient(), eventId);
  if (error) return { error };

  revalidatePath("/admin/socials");
  return null;
}

function tournamentColumns(data: FormData) {
  return {
    name: text(data, "name"),
    website_link: text(data, "website_link"),
    location: text(data, "location"),
    field_id: text(data, "field_id"),
  };
}

export async function createTournament(_state: ActionState, data: FormData) {
  await requireAdmin();

  const seasonId = text(data, "season_id");
  if (!seasonId || !text(data, "name") || !text(data, "date")) {
    return { error: "Season, name and date are required." };
  }

  const date = dateTime(data, "date");
  if (!date) return { error: "Date is not a valid date and time." };

  const error = await insertWithEvent(
    requireAdminClient(),
    "tournaments",
    EVENT_TYPE.tournament,
    CLUB_TEAM_ID,
    seasonId,
    date,
    tournamentColumns(data),
  );
  if (error) return { error };

  revalidatePath("/admin/tournaments");
  return null;
}

export async function updateTournament(_state: ActionState, data: FormData) {
  await requireAdmin();

  const id = text(data, "id");
  const eventId = text(data, "event_id");
  if (!id || !eventId || !text(data, "name") || !text(data, "date")) {
    return { error: "Name and date are required." };
  }

  const date = dateTime(data, "date");
  if (!date) return { error: "Date is not a valid date and time." };

  const error = await updateWithEvent(requireAdminClient(), "tournaments", eventId, date, tournamentColumns(data));
  if (error) return { error };

  revalidatePath("/admin/tournaments");
  return null;
}

export async function deleteTournament(_state: ActionState, data: FormData) {
  await requireAdmin();

  const id = text(data, "id");
  const eventId = text(data, "event_id");
  if (!id || !eventId) return { error: "Missing tournament." };

  const error = await deleteWithEvent(requireAdminClient(), eventId);
  if (error) return { error };

  revalidatePath("/admin/tournaments");
  return null;
}

export async function createPlayer(_state: ActionState, data: FormData) {
  await requireAdmin();
  const client = requireAdminClient();

  const name = text(data, "name");
  const seasonId = text(data, "season_id");
  const playerClass = text(data, "class");
  const position = text(data, "position");
  if (!name || !seasonId || !playerClass || !position) {
    return { error: "Name, season, class and position are required." };
  }
  const phone = phoneDigits(data);
  if (phone === null) return { error: "Enter a 10-digit phone number, or leave it blank." };

  const picturePath = await uploadImage(data, "picture", "player_pictures");

  const { data: inserted, error: personError } = await client
    .from("people")
    .insert({ name, hometown: text(data, "hometown"), picture_path: picturePath })
    .select("id")
    .single();

  if (personError) return { error: personError.message };

  const { error: rosterError } = await client.from("roster").insert({
    person_id: inserted.id,
    team_id: CLUB_TEAM_ID,
    season_id: seasonId,
    class: playerClass,
    position,
    number: int(data, "number"),
  });

  // The person exists but is on no roster; removing them keeps the tables
  // consistent rather than leaving an orphan behind.
  if (rosterError) {
    await client.from("people").delete().eq("id", inserted.id);
    return { error: rosterError.message };
  }

  // On the roster means on the team: an active player, already reviewed.
  await client
    .from("memberships")
    .upsert(
      { team_id: CLUB_TEAM_ID, person_id: inserted.id, role: "player", status: "active", is_new: false },
      { onConflict: "team_id,person_id" },
    );

  if (phone) {
    const phoneError = await savePhone(inserted.id, phone);
    if (phoneError) return { error: `Player added, but the number wasn't saved: ${phoneError}` };
  }

  revalidatePublic();
  revalidatePath("/admin/roster");
  return null;
}

export async function updatePlayer(_state: ActionState, data: FormData) {
  await requireAdmin();
  const client = requireAdminClient();

  const personId = text(data, "person_id");
  const entryId = text(data, "entry_id");
  const name = text(data, "name");
  if (!personId || !entryId || !name) return { error: "Missing player." };
  const phone = phoneDigits(data);
  if (phone === null) return { error: "Enter a 10-digit phone number, or leave it blank." };

  const picturePath = await uploadImage(data, "picture", "player_pictures");

  const { error: personError } = await client
    .from("people")
    .update({
      name,
      hometown: text(data, "hometown"),
      // Only overwrite the picture when a new file was actually chosen.
      ...(picturePath ? { picture_path: picturePath } : {}),
    })
    .eq("id", personId);

  if (personError) return { error: personError.message };

  const { error: rosterError } = await client
    .from("roster")
    .update({
      class: text(data, "class"),
      position: text(data, "position"),
      number: int(data, "number"),
    })
    .eq("id", entryId);

  if (rosterError) return { error: rosterError.message };

  const phoneError = await savePhone(personId, phone);
  if (phoneError) return { error: phoneError };

  revalidatePublic();
  revalidatePath("/admin/roster");
  return null;
}

/**
 * Removes a player from this season's squad.
 *
 * The `roster` entry always goes. The `people` row only follows when no other
 * season still lists that person, so deleting a graduate from 2026 can't erase
 * them from the 2025 roster. Deleting the roster entry first also keeps the
 * foreign key satisfied at every step.
 */
export async function deletePlayer(_state: ActionState, data: FormData) {
  await requireAdmin();
  const client = requireAdminClient();

  const personId = text(data, "person_id");
  const entryId = text(data, "entry_id");
  if (!personId || !entryId) return { error: "Missing player." };

  const { error: entryError } = await client
    .from("roster")
    .delete()
    .eq("id", entryId);

  if (entryError) return { error: entryError.message };

  const { data: remaining, error: lookupError } = await client
    .from("roster")
    .select("id")
    .eq("person_id", personId)
    .limit(1);

  if (lookupError) return { error: lookupError.message };

  if ((remaining ?? []).length === 0) {
    const { error: personError } = await client
      .from("people")
      .delete()
      .eq("id", personId);

    if (personError) return { error: personError.message };
  }

  revalidatePublic();
  revalidatePath("/admin/roster");
  return null;
}
