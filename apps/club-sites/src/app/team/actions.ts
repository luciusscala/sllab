"use server";

import { revalidatePath } from "next/cache";

import { EVENT_TYPE } from "@/lib/data/events";
import {
  TABLE_FOR,
  deleteWithEvent,
  insertWithEvent,
  revalidatePublic,
  updateWithEvent,
} from "@/lib/data/events-write";
import { type AvailabilityStatus, isStatus } from "@/lib/data/availability";
import {
  getCurrentSeason,
  getEvent,
  getRoster,
  getTeamByCode,
} from "@/lib/data/team";
import { sidesFor } from "@/lib/data/schedule";
import { fromDateTimeLocal } from "@/lib/format";
import { deliverReminder } from "@/lib/reminders";
import { requireAdminClient } from "@/lib/supabase-admin";
import { teamRedirect } from "@/lib/team-path";
import {
  clearTeamSession,
  isAdminCode,
  readTeamSession,
  requireCaptain,
  requireTeamSession,
  writeTeamSession,
} from "@/lib/team-session";

/** Same shape as the admin actions, so `AdminForm` serves both sections. */
export type ActionState = { error?: string } | null;

const text = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

/**
 * A phone field as digits, the way the app stores it, or "" when it was left
 * blank. Ten digits is a US number without the country code; eleven starting
 * with 1 is the same number with it.
 */
const digits = (data: FormData) => (text(data, "phone") ?? "").replace(/\D/g, "");

/** The complaint about a number that was typed but isn't one. Blank is fine. */
const badPhone = (phone: string) =>
  phone && phone.length < 10 ? "Enter a 10-digit phone number." : null;

/** The caller's own row in `people`, which is where a profile edit lands. */
async function findMe(rosterId: string, teamId: string) {
  const season = await getCurrentSeason();
  if (!season) return undefined;
  return (await getRoster(season.id, teamId)).find((entry) => entry.rosterId === rosterId);
}

/** Every page under /team, in one call. Writes here are small enough that
 *  refreshing the whole section beats tracking which page shows what. */
const revalidateTeam = () => revalidatePath("/team", "layout");

// MARK: Onboarding — the app's TeamSelection → RosterSelection → PhoneNumberEntry

export async function joinTeam(_state: ActionState, data: FormData) {
  const code = text(data, "team_code");
  if (!code) return { error: "Enter your team code." };

  const team = await getTeamByCode(code);
  if (!team) return { error: "Invalid team code. Please try again." };

  await writeTeamSession({
    teamId: team.id,
    rosterId: null,
    phoneEntered: false,
    captain: false,
  });
  return teamRedirect("/join/roster");
}

/**
 * A tap on a name is the whole step. The list is server-rendered from the
 * roster, so an id that doesn't match can only be a forged request; it just
 * lands back on the list.
 */
export async function selectRoster(data: FormData) {
  const session = await readTeamSession();
  if (!session) return teamRedirect("/join");

  const rosterId = text(data, "roster_id");
  const season = await getCurrentSeason();
  const member = season
    ? (await getRoster(season.id, session.teamId)).find((entry) => entry.rosterId === rosterId)
    : undefined;
  if (!member) return teamRedirect("/join/roster");

  // A player who already gave the app their number isn't asked twice.
  const phoneEntered = Boolean(member.phone);

  await writeTeamSession({ ...session, rosterId: member.rosterId, phoneEntered });
  return teamRedirect(phoneEntered ? "" : "/join/phone");
}

/**
  * The number is optional. Leaving the field blank — or tapping Skip, which
  * posts nothing at all — finishes onboarding with no number on file; the
  * player simply won't be in a captain's reminder. `phoneEntered` records
  * that the step is behind them, not that a number exists, and Settings is
  * where one gets added later.
  */
export async function savePhone(_state: ActionState, data: FormData) {
  const session = await readTeamSession();
  if (!session?.rosterId) return teamRedirect("/join");

  const phone = digits(data);
  const complaint = badPhone(phone);
  if (complaint) return { error: complaint };

  // A number is only kept with the box ticked: that tick is the SMS opt-in.
  if (phone && data.get("sms_consent") !== "on") {
    return { error: "Tick the box to get text reminders, or leave the number blank." };
  }

  if (phone) {
    const member = await findMe(session.rosterId, session.teamId);
    if (!member) return { error: "Your roster entry could not be found." };

    const { error } = await requireAdminClient()
      .from("people")
      .update({ phone })
      .eq("id", member.personId);
    if (error) return { error: error.message };
  }

  await writeTeamSession({ ...session, phoneEntered: true });
  return teamRedirect("");
}

/** The "Skip" button under the phone form: the same, with nothing typed. */
export async function skipPhone() {
  const session = await readTeamSession();
  if (!session?.rosterId) return teamRedirect("/join");

  await writeTeamSession({ ...session, phoneEntered: true });
  return teamRedirect("");
}

// MARK: Availability

/**
 * Called straight from the picker rather than through a form, so the client
 * can show the tap immediately and settle it afterwards.
 */
export async function setAvailability(eventId: string, status: AvailabilityStatus) {
  const session = await requireTeamSession();
  if (!isStatus(status)) return;

  const { error } = await requireAdminClient()
    .from("availability")
    .upsert(
      { event_id: eventId, roster_id: session.rosterId, status },
      { onConflict: "event_id,roster_id" },
    );
  if (error) throw new Error(error.message);

  revalidateTeam();
}

/**
 * The selection bar's one action. `intent` is the button that submitted:
 * "yes" or "no" marks every checked event, "delete" removes them (captains).
 */
export async function bulkAction(_state: ActionState, data: FormData) {
  const session = await requireTeamSession();

  const eventIds = data
    .getAll("event_id")
    .filter((value): value is string => typeof value === "string" && value !== "");
  if (eventIds.length === 0) return { error: "Select at least one event." };

  const intent = text(data, "intent");

  if (intent === "delete") {
    if (!session.captain) return { error: "Only captains can delete events." };

    for (const eventId of eventIds) {
      const event = await getEvent(eventId, session.teamId);
      if (!event) continue;
      const error = await deleteWithEvent(TABLE_FOR[event.type], eventId);
      if (error) return { error };
      if (event.type === "game") revalidatePublic();
    }

    revalidateTeam();
    return null;
  }

  if (!isStatus(intent)) return { error: "Choose Going or Not Going." };

  const { error } = await requireAdminClient()
    .from("availability")
    .upsert(
      eventIds.map((eventId) => ({
        event_id: eventId,
        roster_id: session.rosterId,
        status: intent,
      })),
      { onConflict: "event_id,roster_id" },
    );
  if (error) return { error: error.message };

  revalidateTeam();
  return null;
}

// MARK: Settings

/** Settings' one profile form. An emptied phone field takes the number off
 *  file, which is how a player opts back out of reminders. */
export async function updateProfile(_state: ActionState, data: FormData) {
  const session = await requireTeamSession();

  const phone = digits(data);
  const complaint = badPhone(phone);
  if (complaint) return { error: complaint };

  const member = await findMe(session.rosterId, session.teamId);
  if (!member) return { error: "Your roster entry could not be found." };

  const { error } = await requireAdminClient()
    .from("people")
    .update({ hometown: text(data, "hometown") ?? "", phone: phone || null })
    .eq("id", member.personId);
  if (error) return { error: error.message };

  revalidateTeam();
  return null;
}

export async function unlockCaptain(_state: ActionState, data: FormData) {
  const session = await requireTeamSession();

  const code = text(data, "admin_code");
  if (!code) return { error: "Enter the admin code." };

  if (!(await isAdminCode(session.teamId, code))) {
    return { error: "Invalid admin code." };
  }

  await writeTeamSession({ ...session, captain: true });
  revalidateTeam();
  return null;
}

export async function disableCaptain() {
  const session = await requireTeamSession();
  await writeTeamSession({ ...session, captain: false });
  revalidateTeam();
}

/** The app's "Leave Team": forget everything and start over. */
export async function leaveTeam() {
  await clearTeamSession();
  return teamRedirect("/join");
}

/** The same, in the shape `AdminForm` wants so it can ask for confirmation. */
export async function leaveTeamConfirmed(): Promise<ActionState> {
  await leaveTeam();
  return null;
}

// MARK: Captain — events

/** A datetime-local value pinned to the team's zone, or null when unparseable. */
const dateTime = (data: FormData, key: string) => {
  const value = text(data, key);
  return value ? fromDateTimeLocal(value) : null;
};

/** The columns the app's practice form sets; the date lives on the event. */
const practiceColumns = (data: FormData) => ({
  field_id: text(data, "field_id"),
  notes: text(data, "notes"),
});

/** The app's game form has no scores, so `sidesFor` leaves them untouched. */
const gameColumns = (data: FormData, teamId: string) => ({
  ...sidesFor(teamId, {
    opponentId: text(data, "opponent_id"),
    isHome: data.get("is_home") === "on",
  }),
  field_id: text(data, "field_id"),
});

export async function createPractice(_state: ActionState, data: FormData) {
  const session = await requireCaptain();

  const season = await getCurrentSeason();
  if (!season) return { error: "No current season." };
  if (!text(data, "field_id")) return { error: "Choose a field." };

  const date = dateTime(data, "date");
  if (!date) return { error: "Date is not a valid date and time." };

  const error = await insertWithEvent(
    "practices",
    EVENT_TYPE.practice,
    session.teamId,
    season.id,
    date,
    practiceColumns(data),
  );
  if (error) return { error };

  revalidateTeam();
  return teamRedirect("");
}

/**
 * The app's repeating form: every chosen weekday between two dates, at one
 * time, on one field. Dates are walked in UTC purely as calendar arithmetic;
 * each one is then pinned to the team's zone like any other form date.
 */
export async function createRepeatingPractices(_state: ActionState, data: FormData) {
  const session = await requireCaptain();

  const season = await getCurrentSeason();
  if (!season) return { error: "No current season." };

  const days = new Set(
    data.getAll("day").map(Number).filter((day) => Number.isInteger(day)),
  );
  const start = text(data, "start_date");
  const end = text(data, "end_date");
  const time = text(data, "time");
  const fieldId = text(data, "field_id");

  if (days.size === 0) return { error: "Choose at least one day of the week." };
  if (!start || !end || !time || !fieldId) {
    return { error: "Dates, time and field are required." };
  }
  if (end < start) return { error: "The end date is before the start date." };

  const parse = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  const DAY_MS = 86_400_000;

  const dates: string[] = [];
  for (let at = parse(start); at <= parse(end); at += DAY_MS) {
    const cursor = new Date(at);
    if (!days.has(cursor.getUTCDay())) continue;
    const iso = fromDateTimeLocal(`${cursor.toISOString().slice(0, 10)}T${time}`);
    if (iso) dates.push(iso);
  }
  if (dates.length === 0) return { error: "No practices fall in that range." };
  if (dates.length > 100) return { error: "That would create more than 100 practices." };

  const columns = practiceColumns(data);
  for (const date of dates) {
    const error = await insertWithEvent(
      "practices",
      EVENT_TYPE.practice,
      session.teamId,
      season.id,
      date,
      columns,
    );
    if (error) return { error };
  }

  revalidateTeam();
  return teamRedirect("");
}

export async function createGame(_state: ActionState, data: FormData) {
  const session = await requireCaptain();

  const season = await getCurrentSeason();
  if (!season) return { error: "No current season." };
  if (!text(data, "opponent_id") || !text(data, "field_id")) {
    return { error: "Opponent and field are required." };
  }

  const date = dateTime(data, "date");
  if (!date) return { error: "Date is not a valid date and time." };

  const error = await insertWithEvent(
    "games",
    EVENT_TYPE.game,
    session.teamId,
    season.id,
    date,
    gameColumns(data, session.teamId),
  );
  if (error) return { error };

  revalidatePublic();
  revalidateTeam();
  return teamRedirect("");
}

export async function updatePractice(_state: ActionState, data: FormData) {
  await requireCaptain();

  const eventId = text(data, "event_id");
  if (!eventId) return { error: "Missing practice." };
  if (!text(data, "field_id")) return { error: "Choose a field." };

  const date = dateTime(data, "date");
  if (!date) return { error: "Date is not a valid date and time." };

  const error = await updateWithEvent("practices", eventId, date, {
    ...practiceColumns(data),
    // An emptied notes field clears the note, as the app does.
    notes: text(data, "notes") ?? "",
  });
  if (error) return { error };

  revalidateTeam();
  return teamRedirect(`/events/${eventId}`);
}

export async function updateGame(_state: ActionState, data: FormData) {
  const session = await requireCaptain();

  const eventId = text(data, "event_id");
  if (!eventId) return { error: "Missing game." };
  if (!text(data, "opponent_id") || !text(data, "field_id")) {
    return { error: "Opponent and field are required." };
  }

  const date = dateTime(data, "date");
  if (!date) return { error: "Date is not a valid date and time." };

  const error = await updateWithEvent("games", eventId, date, gameColumns(data, session.teamId));
  if (error) return { error };

  revalidatePublic();
  revalidateTeam();
  return teamRedirect(`/events/${eventId}`);
}

export async function deleteEvent(_state: ActionState, data: FormData) {
  const session = await requireCaptain();

  const eventId = text(data, "event_id");
  const event = eventId ? await getEvent(eventId, session.teamId) : null;
  if (!eventId || !event) return { error: "Missing event." };

  const error = await deleteWithEvent(TABLE_FOR[event.type], eventId);
  if (error) return { error };

  if (event.type === "game") revalidatePublic();
  revalidateTeam();
  return teamRedirect("");
}

// MARK: Captain — reminders

export type ReminderState = { error?: string; sent?: number; failed?: number } | null;

/** The web composer's Send. The app reaches the same `deliverReminder` through `/api/reminders`. */
export async function sendReminder(
  _state: ReminderState,
  data: FormData,
): Promise<ReminderState> {
  const session = await requireCaptain();

  const rosterIds = data
    .getAll("roster_id")
    .filter((value): value is string => typeof value === "string");

  return deliverReminder(session.teamId, rosterIds, text(data, "message") ?? "");
}
