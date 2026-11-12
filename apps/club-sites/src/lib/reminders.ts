import "server-only";

import { requireAdminClient } from "@/lib/supabase-admin";
import { sendSms } from "@/lib/twilio";

export type ReminderResult = { error: string } | { sent: number; failed: number };

/** Reminders one team may send in a day, across all its captains. */
export const DAILY_LIMIT = 10;

/**
 * Texts a message to the chosen players. Shared by the web composer's action
 * and the app's `/api/reminders`, each of which checks for staff first.
 *
 * Callers name players by roster id, never by phone number. The numbers are
 * looked up here with the secret key, since `people_contacts` is closed to
 * every API role, and only for people who are active on the team and ticked
 * the box: status is a filter, so someone marked away isn't texted, and
 * consent is the carriers' rule as much as ours.
 *
 * Each send is logged against the team, which is what enforces the daily cap.
 */
export async function deliverReminder(
  teamId: string,
  rosterIds: string[],
  message: string,
  sentBy: string,
  eventId: string | null,
): Promise<ReminderResult> {
  const body = message.trim();
  if (!body) return { error: "Write a message." };
  if (rosterIds.length === 0) return { error: "Select at least one player." };

  const admin = requireAdminClient();

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await admin
    .from("reminder_log")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .gte("created_at", since.toISOString());
  if (countError) return { error: countError.message };
  if ((count ?? 0) >= DAILY_LIMIT) {
    return { error: `The team has sent ${DAILY_LIMIT} reminders today. Try again tomorrow.` };
  }

  // Roster rows → people, restricted to this team so one team's captain can't
  // name another's players.
  const { data: rows, error: rosterError } = await admin
    .from("roster")
    .select("person_id")
    .eq("team_id", teamId)
    .in("id", rosterIds);
  if (rosterError) return { error: rosterError.message };
  const personIds = (rows ?? []).map((row) => row.person_id as string);

  const phones = await phonesFor(teamId, personIds);
  if (phones.length === 0) {
    return { error: "None of the selected players can be texted." };
  }

  const results = await Promise.allSettled(phones.map((phone) => sendSms(phone, body)));
  const failures = results.filter((result) => result.status === "rejected");
  for (const failure of failures) console.error("SMS failed:", failure.reason);

  if (failures.length === phones.length) {
    return { error: `No messages were sent: ${(failures[0].reason as Error).message}` };
  }

  const sent = phones.length - failures.length;
  await admin.from("reminder_log").insert({
    team_id: teamId,
    event_id: eventId,
    sent_by: sentBy,
    recipient_count: sent,
  });

  return { sent, failed: failures.length };
}

/** The numbers to text among `personIds`: active on the team, with consent. */
async function phonesFor(teamId: string, personIds: string[]): Promise<string[]> {
  if (personIds.length === 0) return [];
  const admin = requireAdminClient();

  const [{ data: members }, { data: contacts }] = await Promise.all([
    admin
      .from("memberships")
      .select("person_id")
      .eq("team_id", teamId)
      .eq("status", "active")
      .in("person_id", personIds),
    admin
      .from("people_contacts")
      .select("person_id, phone")
      .eq("sms_consent", true)
      .in("person_id", personIds),
  ]);

  const active = new Set((members ?? []).map((row) => row.person_id as string));
  return (contacts ?? [])
    .filter((row) => active.has(row.person_id as string))
    .map((row) => row.phone as string);
}

/**
 * Which of these people a reminder would reach, for the composer's "(no
 * phone)" hint. The numbers themselves never leave the server.
 */
export async function textablePersonIds(teamId: string, personIds: string[]) {
  const reachable = new Set<string>();
  if (personIds.length === 0) return reachable;

  const admin = requireAdminClient();
  const [{ data: members }, { data: contacts }] = await Promise.all([
    admin
      .from("memberships")
      .select("person_id")
      .eq("team_id", teamId)
      .eq("status", "active")
      .in("person_id", personIds),
    admin
      .from("people_contacts")
      .select("person_id")
      .eq("sms_consent", true)
      .in("person_id", personIds),
  ]);

  const active = new Set((members ?? []).map((row) => row.person_id as string));
  for (const row of contacts ?? []) {
    if (active.has(row.person_id as string)) reachable.add(row.person_id as string);
  }
  return reachable;
}
