import "server-only";

import { getCurrentSeason, getRoster } from "@/lib/data/team";
import { sendSms } from "@/lib/twilio";

export type ReminderResult = { error: string } | { sent: number; failed: number };

/**
 * Texts a message to the chosen players. Shared by the web composer's action
 * and the app's `/api/reminders`, each of which checks for a captain first.
 *
 * Callers name players by roster id, never by phone number: the numbers are
 * looked up here, so neither client has to hold them, and nobody outside the
 * squad can be texted through this.
 */
export async function deliverReminder(
  teamId: string,
  rosterIds: string[],
  message: string,
): Promise<ReminderResult> {
  const body = message.trim();
  if (!body) return { error: "Write a message." };
  if (rosterIds.length === 0) return { error: "Select at least one player." };

  const chosen = new Set(rosterIds);
  const season = await getCurrentSeason();
  const roster = season ? await getRoster(season.id, teamId) : [];
  const phones = roster
    .filter((member) => chosen.has(member.rosterId))
    .flatMap((member) => (member.phone ? [member.phone] : []));
  if (phones.length === 0) {
    return { error: "None of the selected players has a phone number." };
  }

  const results = await Promise.allSettled(phones.map((phone) => sendSms(phone, body)));
  const failures = results.filter((result) => result.status === "rejected");
  for (const failure of failures) console.error("SMS failed:", failure.reason);

  if (failures.length === phones.length) {
    return { error: `No messages were sent: ${(failures[0].reason as Error).message}` };
  }
  return { sent: phones.length - failures.length, failed: failures.length };
}
