import type { SendSms } from "../sms.js";
import type { ReminderStore } from "./store.js";

/** Reminders one team may send in a day, across all its captains and coaches. */
export const DAILY_LIMIT = 10;

/** Twilio's ceiling for one message, split into parts or not. */
export const MAX_MESSAGE_LENGTH = 1600;

export type ReminderRequest = {
  teamId: string;
  eventId: string | null;
  rosterIds: string[];
  message: string;
  /** The person sending, for the log. */
  sentBy: string;
};

export type ReminderOutcome =
  | { ok: true; sent: number; failed: number }
  | { ok: false; status: 400 | 429 | 502; error: string };

/**
 * Texts a message to the chosen players. The caller has already checked that
 * the sender is staff on the team.
 *
 * Players are named by roster id, never by phone number: the numbers are
 * looked up here and never leave the server. Each send is logged against the
 * team, which is what enforces the daily cap.
 */
export async function deliverReminder(
  deps: { store: ReminderStore; sendSms: SendSms; now?: () => Date },
  request: ReminderRequest,
): Promise<ReminderOutcome> {
  const { store, sendSms } = deps;
  const body = request.message.trim();

  if (!body) return { ok: false, status: 400, error: "Write a message." };
  if (body.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, status: 400, error: `Keep the message under ${MAX_MESSAGE_LENGTH} characters.` };
  }
  if (request.rosterIds.length === 0) {
    return { ok: false, status: 400, error: "Select at least one player." };
  }

  const startOfDay = deps.now?.() ?? new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  if ((await store.sentSince(request.teamId, startOfDay)) >= DAILY_LIMIT) {
    return {
      ok: false,
      status: 429,
      error: `The team has sent ${DAILY_LIMIT} reminders today. Try again tomorrow.`,
    };
  }

  const phones = await store.recipients(request.teamId, request.rosterIds);
  if (phones.length === 0) {
    return { ok: false, status: 400, error: "None of the selected players can be texted." };
  }

  const results = await Promise.allSettled(phones.map((phone) => sendSms(phone, body)));
  const failures = results.filter((result) => result.status === "rejected");
  for (const failure of failures) console.error("SMS failed:", failure.reason);

  if (failures.length === phones.length) {
    const reason = failures[0]?.reason;
    return {
      ok: false,
      status: 502,
      error: `No messages were sent: ${reason instanceof Error ? reason.message : "unknown error"}`,
    };
  }

  const sent = phones.length - failures.length;
  await store.log({
    teamId: request.teamId,
    eventId: request.eventId,
    sentBy: request.sentBy,
    recipientCount: sent,
  });
  return { ok: true, sent, failed: failures.length };
}
