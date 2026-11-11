import { getCurrentSeason, getRoster } from "@/lib/data/team";
import { encodeSession, isAdminCode } from "@/lib/team-session";

type Body = { teamId?: unknown; rosterId?: unknown; adminCode?: unknown };

/** Swift spells UUIDs in upper case; Postgres hands them back in lower. */
const uuid = (value: unknown) =>
  typeof value === "string" ? value.toLowerCase() : null;

/**
 * The app's "Unlock Admin": trades the team's admin code for a captain token,
 * the same signed session the website keeps in its cookie. The app stores it
 * in the Keychain and sends it to the captain-only endpoints.
 */
export async function POST(request: Request) {
  const body: Body | null = await request.json().catch(() => null);
  const teamId = uuid(body?.teamId);
  const rosterId = uuid(body?.rosterId);
  const adminCode = typeof body?.adminCode === "string" ? body.adminCode.trim() : "";

  if (!teamId || !rosterId || !adminCode) {
    return Response.json({ error: "Enter the admin code." }, { status: 400 });
  }

  if (!(await isAdminCode(teamId, adminCode))) {
    return Response.json({ error: "Invalid admin code." }, { status: 401 });
  }

  // Only sign a roster entry that exists, as the web's `selectRoster` does.
  const season = await getCurrentSeason();
  const roster = season ? await getRoster(season.id, teamId) : [];
  if (!roster.some((member) => member.rosterId === rosterId)) {
    return Response.json(
      { error: "Your roster entry could not be found." },
      { status: 404 },
    );
  }

  const token = encodeSession({ teamId, rosterId, phoneEntered: true, captain: true });
  return Response.json({ token });
}
