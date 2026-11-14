import "server-only";

import { requireAdminClient } from "@/lib/supabase-admin";

/**
 * What the console reads. Everything here is platform-wide, so it reads with
 * the secret key behind `requirePlatformAdmin()`.
 */

export type ConsoleSchool = { id: string; name: string; teams: number };
export type ConsoleSport = { id: string; name: string };
export type ConsoleSeason = { id: string; year: number; isCurrent: boolean; events: number; rosterRows: number };

export type ConsoleTeam = {
  id: string;
  name: string;
  data_alias: string | null;
  logo_path: string | null;
  org_id: string | null;
  sport_id: string | null;
  division: string | null;
  /** Active memberships: zero for a team that's only ever been an opponent. */
  members: number;
  hasCode: boolean;
};

export type TeamAccess = {
  code: string | null;
  staff: { name: string; role: string }[];
  invites: { phone: string; role: string; accepted: boolean }[];
};

const fail = (what: string, error: { message: string } | null) => {
  if (error) throw new Error(`Failed to load ${what}: ${error.message}`);
};

/** How many rows of `table` point at each value of `column`. */
async function countBy(table: string, column: string, filter?: [string, string]) {
  let query = requireAdminClient().from(table).select(column);
  if (filter) query = query.eq(filter[0], filter[1]);
  const { data, error } = await query;
  fail(table, error);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as unknown as Record<string, string | null>[]) {
    const key = row[column];
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export async function listSchools(): Promise<ConsoleSchool[]> {
  const [{ data, error }, teams] = await Promise.all([
    requireAdminClient().from("orgs").select("id, name").order("name"),
    countBy("teams", "org_id"),
  ]);
  fail("schools", error);
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, teams: teams.get(row.id) ?? 0 }));
}

export async function listSports(): Promise<ConsoleSport[]> {
  const { data, error } = await requireAdminClient().from("sports").select("id, name").order("name");
  fail("sports", error);
  return data ?? [];
}

export async function listConsoleTeams(): Promise<ConsoleTeam[]> {
  const client = requireAdminClient();
  const [{ data, error }, members, { data: secrets, error: secretsError }] = await Promise.all([
    client.from("teams").select("id, name, data_alias, logo_path, org_id, sport_id, division").order("name"),
    countBy("memberships", "team_id", ["status", "active"]),
    client.from("team_secrets").select("team_id"),
  ]);
  fail("teams", error);
  fail("team codes", secretsError);
  const coded = new Set((secrets ?? []).map((row) => row.team_id as string));
  return (data ?? []).map((row) => ({ ...row, members: members.get(row.id) ?? 0, hasCode: coded.has(row.id) }));
}

/** A team's way in: its code, its staff, and the numbers invited to join it. */
export async function teamAccess(teamId: string): Promise<TeamAccess> {
  const client = requireAdminClient();
  const [{ data: secret }, { data: staff, error: staffError }, { data: invites, error: invitesError }] =
    await Promise.all([
      client.from("team_secrets").select("team_code").eq("team_id", teamId).maybeSingle(),
      client
        .from("memberships")
        .select("role, person:people(name)")
        .eq("team_id", teamId)
        .eq("status", "active")
        .in("role", ["captain", "coach"]),
      client.from("team_invites").select("phone, role, accepted_at").eq("team_id", teamId).order("created_at"),
    ]);
  fail("staff", staffError);
  fail("invites", invitesError);

  return {
    code: (secret?.team_code as string | undefined) ?? null,
    staff: ((staff ?? []) as unknown as { role: string; person: { name: string } | { name: string }[] | null }[]).map(
      (row) => ({
        role: row.role,
        name: (Array.isArray(row.person) ? row.person[0]?.name : row.person?.name) ?? "Unknown",
      }),
    ),
    invites: (invites ?? []).map((row) => ({
      phone: row.phone as string,
      role: row.role as string,
      accepted: row.accepted_at !== null,
    })),
  };
}

export async function listConsoleSeasons(): Promise<ConsoleSeason[]> {
  const [{ data, error }, events, roster] = await Promise.all([
    requireAdminClient().from("seasons").select("id, year, is_current").order("year", { ascending: false }),
    countBy("events", "season_id"),
    countBy("roster", "season_id"),
  ]);
  fail("seasons", error);
  return (data ?? []).map((row) => ({
    id: row.id,
    year: row.year,
    isCurrent: row.is_current,
    events: events.get(row.id) ?? 0,
    rosterRows: roster.get(row.id) ?? 0,
  }));
}
