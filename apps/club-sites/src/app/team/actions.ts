"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/app/auth/actions";
import { type Membership, canRespond, getViewer, rememberTeam, requireCaptain, requireMember, requireStaff, toMembership } from "@/lib/auth";
import { EVENT_TYPE } from "@/lib/data/events";
import {
  deleteWithEvent,
  insertWithEvent,
  revalidatePublic,
  updateWithEvent,
} from "@/lib/data/events-write";
import { type AvailabilityStatus, isStatus } from "@/lib/data/availability";
import { getCurrentSeason, getEvent } from "@/lib/data/team";
import { sidesFor } from "@/lib/data/schedule";
import { fromDateTimeLocal } from "@/lib/format";
import { PENDING, clearPending, readPending, setPending } from "@/lib/pending";
import { requestReminder } from "@/lib/reminders";
import { supabaseUser } from "@/lib/supabase-server";
import { teamRedirect } from "@/lib/team-path";

export type { ActionState } from "@/app/auth/actions";

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

/** Every page under /team, in one call. Writes here are small enough that
 *  refreshing the whole section beats tracking which page shows what. */
const revalidateTeam = () => revalidatePath("/team", "layout");

/** The database's error names, in words a person can act on. */
const explain = (message: string) => {
  if (message.includes("invalid_code")) return "That team code isn't right. Check it with your captain.";
  if (message.includes("phone_in_use")) return "That roster spot is already linked to another account.";
  if (message.includes("no_current_season")) return "There's no current season yet. Ask a captain to set one.";
  if (message.includes("last_captain")) return "The team needs at least one captain.";
  if (message.includes("not_allowed")) return "You can't do that for this member.";
  return message;
};

// MARK: Joining

/** The first screen: a code names a team. Nothing is joined yet. */
export async function lookupTeam(_state: ActionState, data: FormData): Promise<ActionState> {
  const code = text(data, "team_code");
  if (!code) return { error: "Enter your team code." };

  const { data: teams, error } = await (await supabaseUser()).rpc("lookup_team", { p_code: code });
  if (error) return { error: error.message };
  if (!teams?.length) return { error: "That team code isn't right. Check it with your captain." };

  await setPending(PENDING.code, code);

  // Already signed in: no need to ask who they are again.
  const { userId } = await getViewer();
  return teamRedirect(userId ? "/join/finish" : "/join/who");
}

type JoinRow = {
  needs_profile: boolean;
  linked: boolean;
  membership: Parameters<typeof toMembership>[0] | null;
};

/**
 * `join_team` with whatever the flow has: the code alone first, and again
 * with the profile when the database asks for one. Returns where to go next.
 */
async function joinWithCode(profile?: {
  name: string;
  position: string | null;
  class: string | null;
  number: number | null;
  smsConsent: boolean;
}): Promise<ActionState> {
  const code = await readPending(PENDING.code);
  if (!code) return teamRedirect("/join");

  const { data, error } = await (await supabaseUser()).rpc("join_team", {
    p_code: code,
    p_name: profile?.name ?? null,
    p_position: profile?.position ?? null,
    p_class: profile?.class ?? null,
    p_number: profile?.number ?? null,
    p_sms_consent: profile?.smsConsent ?? false,
  });
  if (error) return { error: explain(error.message) };

  const row = (data as JoinRow[] | null)?.[0];
  if (!row) return { error: "Something went wrong joining the team." };
  if (row.needs_profile) return teamRedirect("/join/profile");

  const membership = toMembership(row.membership!);
  await rememberTeam(membership.teamId);
  await clearPending();
  revalidateTeam();
  return teamRedirect(row.linked ? "?welcome=back" : "");
}

/** After sign-in, with a code waiting. */
export async function finishJoin(): Promise<ActionState> {
  return joinWithCode();
}

/** The new-player screen: name, position, class, number, and the SMS tick. */
export async function completeProfile(_state: ActionState, data: FormData): Promise<ActionState> {
  const name = text(data, "name");
  if (!name) return { error: "Enter your name." };

  return joinWithCode({
    name,
    position: text(data, "position"),
    class: text(data, "class"),
    number: int(data, "number"),
    smsConsent: data.get("sms_consent") === "on",
  });
}

/** Someone on several teams picking which to look at. */
export async function switchTeam(data: FormData) {
  const teamId = text(data, "team_id");
  const { memberships } = await getViewer();
  if (teamId && memberships.some((m) => m.teamId === teamId && m.status !== "inactive")) {
    await rememberTeam(teamId);
  }
  return teamRedirect("");
}

/** "Are you playing this season?" — Yes. */
export async function continueSeason(): Promise<ActionState> {
  const membership = await requireMember();
  const { error } = await (await supabaseUser()).rpc("continue_season", {
    p_team_id: membership.teamId,
  });
  if (error) return { error: explain(error.message) };
  revalidateTeam();
  return null;
}

// MARK: Availability

/** The member's own roster row, which is the only one they may answer for. */
function ownRoster(membership: Membership) {
  if (!canRespond(membership)) {
    throw new Error("Only active players can respond to events.");
  }
  return membership.rosterId!;
}

/**
 * Called straight from the picker rather than through a form, so the client
 * can show the tap immediately and settle it afterwards.
 */
export async function setAvailability(eventId: string, status: AvailabilityStatus) {
  const membership = await requireMember();
  if (!isStatus(status)) return;

  const { error } = await (await supabaseUser())
    .from("availability")
    .upsert(
      { event_id: eventId, roster_id: ownRoster(membership), status },
      { onConflict: "event_id,roster_id" },
    );
  if (error) throw new Error(error.message);

  revalidateTeam();
}

/**
 * The selection bar's one action. `intent` is the button that submitted:
 * "yes" or "no" marks every checked event, "delete" removes them (staff).
 */
export async function bulkAction(_state: ActionState, data: FormData): Promise<ActionState> {
  const membership = await requireMember();
  const supabase = await supabaseUser();

  const eventIds = data
    .getAll("event_id")
    .filter((value): value is string => typeof value === "string" && value !== "");
  if (eventIds.length === 0) return { error: "Select at least one event." };

  const intent = text(data, "intent");

  if (intent === "delete") {
    await requireStaff();
    for (const eventId of eventIds) {
      const event = await getEvent(eventId, membership.teamId);
      if (!event) continue;
      const error = await deleteWithEvent(supabase, eventId);
      if (error) return { error };
      if (event.type === "game") revalidatePublic();
    }
    revalidateTeam();
    return null;
  }

  if (!isStatus(intent)) return { error: "Choose Going or Not Going." };
  if (!canRespond(membership)) return { error: "Only active players can respond to events." };

  const { error } = await supabase
    .from("availability")
    .upsert(
      eventIds.map((eventId) => ({
        event_id: eventId,
        roster_id: membership.rosterId,
        status: intent,
      })),
      { onConflict: "event_id,roster_id" },
    );
  if (error) return { error: error.message };

  revalidateTeam();
  return null;
}

// MARK: Settings

/** Settings' profile form: the hometown, which is the one thing a person
 *  edits about themselves here. */
export async function updateProfile(_state: ActionState, data: FormData): Promise<ActionState> {
  const membership = await requireMember();

  const { error } = await (await supabaseUser())
    .from("people")
    .update({ hometown: text(data, "hometown") ?? "" })
    .eq("id", membership.personId);
  if (error) return { error: error.message };

  revalidateTeam();
  revalidatePublic();
  return null;
}

/** Leave Team: the membership closes; the account and roster history stay. */
export async function leaveTeam(): Promise<ActionState> {
  const membership = await requireMember();
  const { error } = await (await supabaseUser()).rpc("set_member_status", {
    p_membership_id: membership.membershipId,
    p_status: "inactive",
  });
  if (error) return { error: explain(error.message) };

  revalidateTeam();
  return teamRedirect("/join");
}

/** Rejoin a team left earlier, from the join page. */
export async function rejoinTeam(data: FormData) {
  const membershipId = text(data, "membership_id");
  const { memberships } = await getViewer();
  const mine = memberships.find((m) => m.membershipId === membershipId);
  if (!mine) return teamRedirect("/join");

  const { error } = await (await supabaseUser()).rpc("set_member_status", {
    p_membership_id: mine.membershipId,
    p_status: "active",
  });
  if (error) throw new Error(explain(error.message));

  await rememberTeam(mine.teamId);
  revalidateTeam();
  return teamRedirect("");
}

// MARK: Staff — members

async function memberRpc(fn: string, args: Record<string, unknown>): Promise<ActionState> {
  const { error } = await (await supabaseUser()).rpc(fn, args);
  if (error) return { error: explain(error.message) };
  revalidateTeam();
  revalidatePublic();
  return null;
}

/** Keep (true) or Remove (false) from the New Members list. */
export async function reviewMember(_state: ActionState, data: FormData): Promise<ActionState> {
  await requireStaff();
  return memberRpc("review_member", {
    p_membership_id: text(data, "membership_id"),
    p_keep: data.get("keep") === "true",
  });
}

export async function setMemberStatus(_state: ActionState, data: FormData): Promise<ActionState> {
  await requireStaff();
  return memberRpc("set_member_status", {
    p_membership_id: text(data, "membership_id"),
    p_status: text(data, "status"),
  });
}

export async function setMemberRole(_state: ActionState, data: FormData): Promise<ActionState> {
  await requireCaptain();
  return memberRpc("set_member_role", {
    p_membership_id: text(data, "membership_id"),
    p_role: text(data, "role"),
  });
}

/** Add by phone number. The role applies when that number signs in. */
export async function inviteMember(_state: ActionState, data: FormData): Promise<ActionState> {
  const membership = await requireStaff();
  const phone = text(data, "phone");
  if (!phone) return { error: "Enter a phone number." };

  return memberRpc("invite_member", {
    p_team_id: membership.teamId,
    p_phone: phone,
    p_role: text(data, "role") ?? "player",
  });
}

export async function cancelInvite(_state: ActionState, data: FormData): Promise<ActionState> {
  await requireStaff();
  const { error } = await (await supabaseUser())
    .from("team_invites")
    .delete()
    .eq("id", text(data, "invite_id") ?? "");
  if (error) return { error: error.message };
  revalidateTeam();
  return null;
}

// MARK: Staff — events

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

export async function createPractice(_state: ActionState, data: FormData): Promise<ActionState> {
  const membership = await requireStaff();

  const season = await getCurrentSeason();
  if (!season) return { error: "No current season." };
  if (!text(data, "field_id")) return { error: "Choose a field." };

  const date = dateTime(data, "date");
  if (!date) return { error: "Date is not a valid date and time." };

  const error = await insertWithEvent(
    await supabaseUser(),
    "practices",
    EVENT_TYPE.practice,
    membership.teamId,
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
export async function createRepeatingPractices(_state: ActionState, data: FormData): Promise<ActionState> {
  const membership = await requireStaff();

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

  const supabase = await supabaseUser();
  const columns = practiceColumns(data);
  for (const date of dates) {
    const error = await insertWithEvent(
      supabase,
      "practices",
      EVENT_TYPE.practice,
      membership.teamId,
      season.id,
      date,
      columns,
    );
    if (error) return { error };
  }

  revalidateTeam();
  return teamRedirect("");
}

export async function createGame(_state: ActionState, data: FormData): Promise<ActionState> {
  const membership = await requireStaff();

  const season = await getCurrentSeason();
  if (!season) return { error: "No current season." };
  if (!text(data, "opponent_id") || !text(data, "field_id")) {
    return { error: "Opponent and field are required." };
  }

  const date = dateTime(data, "date");
  if (!date) return { error: "Date is not a valid date and time." };

  const error = await insertWithEvent(
    await supabaseUser(),
    "games",
    EVENT_TYPE.game,
    membership.teamId,
    season.id,
    date,
    gameColumns(data, membership.teamId),
  );
  if (error) return { error };

  revalidatePublic();
  revalidateTeam();
  return teamRedirect("");
}

export async function updatePractice(_state: ActionState, data: FormData): Promise<ActionState> {
  await requireStaff();

  const eventId = text(data, "event_id");
  if (!eventId) return { error: "Missing practice." };
  if (!text(data, "field_id")) return { error: "Choose a field." };

  const date = dateTime(data, "date");
  if (!date) return { error: "Date is not a valid date and time." };

  const error = await updateWithEvent(await supabaseUser(), "practices", eventId, date, {
    ...practiceColumns(data),
    // An emptied notes field clears the note, as the app does.
    notes: text(data, "notes") ?? "",
  });
  if (error) return { error };

  revalidateTeam();
  return teamRedirect(`/events/${eventId}`);
}

export async function updateGame(_state: ActionState, data: FormData): Promise<ActionState> {
  const membership = await requireStaff();

  const eventId = text(data, "event_id");
  if (!eventId) return { error: "Missing game." };
  if (!text(data, "opponent_id") || !text(data, "field_id")) {
    return { error: "Opponent and field are required." };
  }

  const date = dateTime(data, "date");
  if (!date) return { error: "Date is not a valid date and time." };

  const error = await updateWithEvent(
    await supabaseUser(),
    "games",
    eventId,
    date,
    gameColumns(data, membership.teamId),
  );
  if (error) return { error };

  revalidatePublic();
  revalidateTeam();
  return teamRedirect(`/events/${eventId}`);
}

export async function deleteEvent(_state: ActionState, data: FormData): Promise<ActionState> {
  const membership = await requireStaff();

  const eventId = text(data, "event_id");
  const event = eventId ? await getEvent(eventId, membership.teamId) : null;
  if (!eventId || !event) return { error: "Missing event." };

  const error = await deleteWithEvent(await supabaseUser(), eventId);
  if (error) return { error };

  if (event.type === "game") revalidatePublic();
  revalidateTeam();
  return teamRedirect("");
}

// MARK: Staff — reminders

export type ReminderState = { error?: string; sent?: number; failed?: number } | null;

/** The web composer's Send, through the same platform API the app uses. */
export async function sendReminder(
  _state: ReminderState,
  data: FormData,
): Promise<ReminderState> {
  const membership = await requireStaff();

  const supabase = await supabaseUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Sign in again to send reminders." };

  return requestReminder(session.access_token, {
    teamId: membership.teamId,
    eventId: text(data, "event_id"),
    rosterIds: data.getAll("roster_id").filter((value): value is string => typeof value === "string"),
    message: text(data, "message") ?? "",
  });
}
