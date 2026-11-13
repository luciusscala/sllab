import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import "server-only";

import type { Role, Status } from "@/lib/roles";
import { isAuthConfigured, supabaseUser } from "@/lib/supabase-server";
import { teamRedirect } from "@/lib/team-path";

export { ROLE_LABEL, STATUS_LABEL, type Role, type Status } from "@/lib/roles";

/**
 * Who is signed in and where they stand on the team.
 *
 * A person signs in once, with their phone number (or anonymously as a
 * guest), and has one `memberships` row per team with a role and a status.
 * The database checks that row on every read and write; what this module
 * adds is the same answer for pages, so a coach isn't shown a button the
 * database would refuse, and the redirects when someone isn't in yet.
 */

/** One row of `my_memberships()`. */
export type Membership = {
  membershipId: string;
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  personId: string;
  personName: string;
  role: Role;
  status: Status;
  isNew: boolean;
  /** This season's roster row, for players and captains; null for staff,
   *  guests, and a player who hasn't confirmed they're back this season. */
  rosterId: string | null;
};

type MembershipRow = {
  membership_id: string;
  team_id: string;
  team_name: string;
  team_logo: string | null;
  person_id: string;
  person_name: string;
  role: Role;
  status: Status;
  is_new: boolean;
  roster_id: string | null;
};

export const toMembership = (row: MembershipRow): Membership => ({
  membershipId: row.membership_id,
  teamId: row.team_id,
  teamName: row.team_name,
  teamLogo: row.team_logo,
  personId: row.person_id,
  personName: row.person_name,
  role: row.role,
  status: row.status,
  isNew: row.is_new,
  rosterId: row.roster_id,
});

// The same tests the database's `is_staff`, `is_captain` and `can_respond`
// functions make, for deciding what to render.
export const isStaff = (m: Membership) =>
  (m.role === "captain" || m.role === "coach") && m.status === "active";
export const isCaptain = (m: Membership) => m.role === "captain" && m.status === "active";
export const canRespond = (m: Membership) =>
  (m.role === "player" || m.role === "captain") && m.status === "active" && m.rosterId !== null;

// MARK: The viewer

export type Viewer = {
  userId: string | null;
  /** The verified number, as digits with the country code; null for guests. */
  phone: string | null;
  memberships: Membership[];
};

/**
 * The signed-in user and every team they belong to. Cached per request, so
 * the layout, the page and its actions ask once between them.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  // Reading the cookies first keeps these pages dynamic even when nothing is
  // configured, which is what lets a credential-less build get through.
  await cookies();
  if (!isAuthConfigured()) return { userId: null, phone: null, memberships: [] };

  const supabase = await supabaseUser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, phone: null, memberships: [] };

  const { data, error } = await supabase.rpc("my_memberships");
  if (error) throw new Error(`Failed to load memberships: ${error.message}`);

  return {
    userId: user.id,
    phone: user.phone || null,
    memberships: ((data ?? []) as MembershipRow[]).map(toMembership),
  };
});

/**
 * Which team the pages show. Most people are on one team; the cookie only
 * matters for someone on several, and is a preference, not a credential —
 * the membership it points at still comes from the database.
 */
const TEAM_COOKIE = "team";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function rememberTeam(teamId: string) {
  (await cookies()).set(TEAM_COOKIE, teamId, { ...cookieOptions, maxAge: 60 * 60 * 24 * 365 });
}

export async function forgetTeam() {
  (await cookies()).delete({ name: TEAM_COOKIE, path: "/" });
}

/** The viewer's place on the team they're looking at, or null. Someone who
 *  has left (status inactive) is sent back through the join flow to rejoin. */
export async function currentMembership(): Promise<Membership | null> {
  const { memberships } = await getViewer();
  const current = memberships.filter((m) => m.status !== "inactive");
  if (current.length === 0) return null;

  const preferred = (await cookies()).get(TEAM_COOKIE)?.value;
  return current.find((m) => m.teamId === preferred) ?? current[0];
}

// MARK: Guards

/**
 * For every member page and Server Action. Actions are reachable by direct
 * POST, so each one calls this itself rather than relying on the layout.
 * The database would refuse the write anyway; this gives a redirect instead
 * of an error.
 */
export async function requireMember(): Promise<Membership> {
  const membership = await currentMembership();
  if (!membership) return teamRedirect("/join");
  return membership;
}

/** Captains and coaches: the event forms, reminders and the members page. */
export async function requireStaff(): Promise<Membership> {
  const membership = await requireMember();
  if (!isStaff(membership)) return teamRedirect("");
  return membership;
}

/** Captains alone: promoting captains and adding coaches. */
export async function requireCaptain(): Promise<Membership> {
  const membership = await requireMember();
  if (!isCaptain(membership)) return teamRedirect("");
  return membership;
}

/**
 * The admin dashboard edits the team the person is viewing, and belongs to
 * that team's captains and coaches, with the same sign-in as the team app.
 * Someone on several teams switches team in Settings.
 */
export async function adminMembership(): Promise<Membership | null> {
  const membership = await currentMembership();
  return membership && isStaff(membership) ? membership : null;
}

export const isAdmin = async () => (await adminMembership()) !== null;

export async function requireAdmin(): Promise<Membership> {
  const membership = await adminMembership();
  if (!membership) redirect("/admin/login");
  return membership;
}
