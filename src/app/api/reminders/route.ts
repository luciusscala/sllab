import { deliverReminder } from "@/lib/reminders";
import { readBearerSession } from "@/lib/team-session";

type Body = { rosterIds?: unknown; message?: unknown };

/**
 * The app's Send Reminder: the web composer's action, behind a captain token
 * rather than the cookie. Takes roster ids, never phone numbers.
 */
export async function POST(request: Request) {
  if (!readBearerSession(request)?.captain) {
    return Response.json(
      { error: "Unlock admin mode to send reminders." },
      { status: 401 },
    );
  }

  const body: Body | null = await request.json().catch(() => null);
  // Swift spells UUIDs in upper case; Postgres hands them back in lower.
  const rosterIds = Array.isArray(body?.rosterIds)
    ? body.rosterIds
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.toLowerCase())
    : [];
  const message = typeof body?.message === "string" ? body.message : "";

  const result = await deliverReminder(rosterIds, message);
  return Response.json(result, { status: "error" in result ? 400 : 200 });
}
