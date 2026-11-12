import { isStaff, readBearerMembership } from "@/lib/auth";
import { deliverReminder } from "@/lib/reminders";

type Body = { teamId?: unknown; eventId?: unknown; rosterIds?: unknown; message?: unknown };

/** Swift spells UUIDs in upper case; Postgres hands them back in lower. */
const uuid = (value: unknown) => (typeof value === "string" ? value.toLowerCase() : null);

/**
 * The app's Send Reminder: the web composer's action, behind the app's
 * Supabase session rather than the cookie. Takes roster ids, never phone
 * numbers, and only from a captain or coach of the team named.
 */
export async function POST(request: Request) {
  const body: Body | null = await request.json().catch(() => null);
  const teamId = uuid(body?.teamId);
  if (!teamId) return Response.json({ error: "Missing team." }, { status: 400 });

  const membership = await readBearerMembership(request, teamId);
  if (!membership || !isStaff(membership)) {
    return Response.json(
      { error: "Only captains and coaches can send reminders." },
      { status: 401 },
    );
  }

  const rosterIds = Array.isArray(body?.rosterIds)
    ? body.rosterIds.flatMap((id) => (typeof id === "string" ? [id.toLowerCase()] : []))
    : [];
  const message = typeof body?.message === "string" ? body.message : "";

  const result = await deliverReminder(
    teamId,
    rosterIds,
    message,
    membership.personId,
    uuid(body?.eventId),
  );
  return Response.json(result, { status: "error" in result ? 400 : 200 });
}
