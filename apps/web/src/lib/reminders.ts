import "server-only";

import { requireAdminClient } from "@/lib/supabase-admin";

export type ReminderResult = { error: string } | { sent: number; failed: number };

/**
 * The platform API, which sends reminders for the app and this site alike.
 * Its default is production; point it at `http://localhost:8787` to run both
 * locally.
 */
const API_URL = process.env.API_URL ?? "https://api.sllab.io";

/**
 * Sends a reminder through the platform API as the signed-in person. Their
 * Supabase access token is the credential, exactly as from the app; the API
 * checks they're staff on the team, looks up the numbers and enforces the
 * daily cap, so none of that, nor the Twilio keys, lives here.
 */
export async function requestReminder(
  accessToken: string,
  reminder: { teamId: string; eventId: string | null; rosterIds: string[]; message: string },
): Promise<ReminderResult> {
  try {
    const response = await fetch(`${API_URL}/v1/reminders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(reminder),
      cache: "no-store",
    });
    const body = (await response.json().catch(() => null)) as Partial<
      { error: string; sent: number; failed: number }
    > | null;

    if (!response.ok || typeof body?.sent !== "number") {
      return { error: body?.error ?? `The reminder service responded ${response.status}.` };
    }
    return { sent: body.sent, failed: body.failed ?? 0 };
  } catch {
    return { error: "Couldn't reach the reminder service. Try again in a moment." };
  }
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
