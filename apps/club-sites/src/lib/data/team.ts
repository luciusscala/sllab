import type { SupabaseClient } from "@supabase/supabase-js";

import type { Role, Status } from "@/lib/roles";
import type { AvailabilityStatus } from "@/lib/data/availability";
import { compareNumbers } from "@/lib/data/roster";
import {
  type Sides,
  SIDES,
  bothTeams,
  fieldLabel,
  opponentOf,
  sideOf,
} from "@/lib/data/schedule";
import type { EventType } from "@/lib/data/events";
import { dayKey, formatDayHeading } from "@/lib/format";
import { logoUrl, one } from "@/lib/supabase";
import { supabaseUser } from "@/lib/supabase-server";
import "server-only";

/**
 * Reads for the team section — the web port of the iOS app's `DataService`.
 *
 * Everything here runs as the signed-in person, under row-level security:
 * a guest gets the events and responses their membership allows, a coach
 * their team's and nobody else's. The `teamId` filters narrow the result to
 * the team being viewed; the database decides what's visible at all.
 * Nothing in this file is cached: availability changes by the minute and
 * the pages are per-person.
 *
 * Where the app fetches one subtype and one availability list per event, the
 * site fetches each table once for the whole schedule.
 */

export type { AvailabilityStatus } from "@/lib/data/availability";

export type Season = { id: string; year: number };

/** One roster row with its person, as the app's `RosterEntry` + `Person`. */
export type Member = {
  rosterId: string;
  personId: string;
  name: string;
  number: number | null;
  hometown: string | null;
};

/** One `availability` row, with the member it belongs to resolved. */
export type Response = {
  rosterId: string;
  status: AvailabilityStatus;
};

/** The app's `EventWithAvailability`, flattened to what the pages render. */
export type TeamEvent = {
  id: string;
  type: EventType;
  /** ISO 8601, from `events.event_date`. */
  date: string;
  /** "Practice", "vs. UCLA", the social's name, the tournament's name. */
  title: string;
  location: string | null;
  /** The field's map address, for a directions link. */
  address: string | null;
  notes: string | null;
  opponentLogo: string | null;
  /** Home/away, games only. */
  isHome: boolean | null;
  /** What the edit forms need, present only for the matching type. */
  practice: { fieldId: string; notes: string | null } | null;
  game: { opponentId: string; fieldId: string | null; isHome: boolean } | null;
};

const client = () => supabaseUser();

// MARK: Season and roster

export async function getCurrentSeason(): Promise<Season | null> {
  const { data, error } = await (await client())
    .from("seasons")
    .select("id, year")
    .eq("is_current", true)
    .limit(1);

  if (error) throw new Error(`Failed to load season: ${error.message}`);
  return (data?.[0] as Season | undefined) ?? null;
}

type RosterRow = {
  id: string;
  number: number | null;
  person: {
    id: string;
    name: string;
    hometown: string | null;
  } | null;
};

/** The season's squad, by number with unnumbered players last, then by name. */
export async function getRoster(seasonId: string, teamId: string): Promise<Member[]> {
  const { data, error } = await (await client())
    .from("roster")
    .select("id, number, person:people(id, name, hometown)")
    .eq("season_id", seasonId)
    .eq("team_id", teamId);

  if (error) throw new Error(`Failed to load roster: ${error.message}`);

  return ((data ?? []) as unknown as RosterRow[])
    .flatMap((row) => {
      const person = one(row.person);
      if (!person) return [];
      return [
        {
          rosterId: row.id,
          personId: person.id,
          name: person.name,
          number: row.number,
          hometown: person.hometown,
        },
      ];
    })
    .sort(
      (a, b) =>
        compareNumbers(a.number, b.number) || a.name.localeCompare(b.name),
    );
}

/**
 * Who answers for this season: the roster, less anyone whose membership is
 * away or gone. Status is a filter, never a response, so a player marked
 * away drops out of the response lists and reminders rather than showing
 * as "No Response".
 */
export async function getActiveRoster(seasonId: string, teamId: string): Promise<Member[]> {
  const [roster, members] = await Promise.all([
    getRoster(seasonId, teamId),
    getMembers(teamId),
  ]);
  const active = new Set(
    members.filter((m) => m.status === "active").map((m) => m.personId),
  );
  return roster.filter((member) => active.has(member.personId));
}

// MARK: Members

/** One `memberships` row with its person, for the members page. */
export type TeamMember = {
  membershipId: string;
  personId: string;
  name: string;
  role: Role;
  status: Status;
  isNew: boolean;
  joinedAt: string;
};

type MemberRow = {
  id: string;
  role: Role;
  status: Status;
  is_new: boolean;
  created_at: string;
  person: { id: string; name: string } | null;
};

/** Everyone with a membership on the team, in any role or status. */
export async function getMembers(teamId: string): Promise<TeamMember[]> {
  const { data, error } = await (await client())
    .from("memberships")
    .select("id, role, status, is_new, created_at, person:people(id, name)")
    .eq("team_id", teamId);

  if (error) throw new Error(`Failed to load members: ${error.message}`);

  return ((data ?? []) as unknown as MemberRow[])
    .flatMap((row) => {
      const person = one(row.person);
      if (!person) return [];
      return [
        {
          membershipId: row.id,
          personId: person.id,
          name: person.name,
          role: row.role,
          status: row.status,
          isNew: row.is_new,
          joinedAt: row.created_at,
        },
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type Invite = { id: string; phone: string; role: Role; createdAt: string };

/** Numbers a captain has added that haven't signed in yet. Staff only. */
export async function getPendingInvites(teamId: string): Promise<Invite[]> {
  const { data, error } = await (await client())
    .from("team_invites")
    .select("id, phone, role, created_at")
    .eq("team_id", teamId)
    .is("accepted_at", null)
    .order("created_at");

  if (error) throw new Error(`Failed to load invites: ${error.message}`);
  return ((data ?? []) as { id: string; phone: string; role: Role; created_at: string }[]).map(
    (row) => ({ id: row.id, phone: row.phone, role: row.role, createdAt: row.created_at }),
  );
}

/**
 * How many of the team's last `count` events each roster member answered,
 * for the "haven't been around" list: an active player with no response to
 * any of them has probably drifted off without saying so.
 */
export async function getRecentResponseCounts(
  seasonId: string,
  teamId: string,
  count = 8,
): Promise<{ events: number; byRoster: Map<string, number> }> {
  const db = await client();
  const { data: events, error } = await db
    .from("events")
    .select("id")
    .eq("season_id", seasonId)
    .eq("team_id", teamId)
    .lte("event_date", new Date().toISOString())
    .order("event_date", { ascending: false })
    .limit(count);
  if (error) throw new Error(`Failed to load events: ${error.message}`);

  const ids = (events ?? []).map((row) => row.id as string);
  const byRoster = new Map<string, number>();
  if (ids.length === 0) return { events: 0, byRoster };

  const { data: responses, error: responsesError } = await db
    .from("availability")
    .select("roster_id")
    .in("event_id", ids);
  if (responsesError) throw new Error(`Failed to load availability: ${responsesError.message}`);

  for (const row of responses ?? []) {
    const id = row.roster_id as string;
    byRoster.set(id, (byRoster.get(id) ?? 0) + 1);
  }
  return { events: ids.length, byRoster };
}

// MARK: Events

type EventRow = {
  id: string;
  event_type: EventType;
  event_date: string;
};

type FieldEmbed = { name: string; area: string | null; maps_address: string | null } | null;

type PracticeRow = {
  event_id: string;
  field_id: string;
  notes: string | null;
  field: FieldEmbed;
};

type TeamEmbed = { name: string; logo_path: string | null } | null;

type GameRow = Sides & {
  event_id: string;
  field_id: string | null;
  field: FieldEmbed;
  home_team: TeamEmbed;
  away_team: TeamEmbed;
};

type SocialRow = { event_id: string; name: string };

type TournamentRow = {
  event_id: string;
  name: string;
  location: string | null;
  field: FieldEmbed;
};

/**
 * Fills in the subtype half of each event. One query per subtype table,
 * filtered to the ids at hand, rather than one per event as the app does.
 * `teamId` is whose side a game is read from.
 */
async function withSubtypes(
  db: SupabaseClient,
  rows: EventRow[],
  teamId: string,
): Promise<TeamEvent[]> {
  if (rows.length === 0) return [];

  const idsOf = (type: EventType) =>
    rows.filter((row) => row.event_type === type).map((row) => row.id);

  const query = async <T,>(
    table: string,
    select: string,
    ids: string[],
  ): Promise<T[]> => {
    if (ids.length === 0) return [];
    const { data, error } = await db.from(table).select(select).in("event_id", ids);
    if (error) throw new Error(`Failed to load ${table}: ${error.message}`);
    return (data ?? []) as unknown as T[];
  };

  const [practices, games, socials, tournaments] = await Promise.all([
    query<PracticeRow>(
      "practices",
      "event_id, field_id, notes, field:fields(name, area, maps_address)",
      idsOf("practice"),
    ),
    query<GameRow>(
      "games",
      `event_id, ${SIDES}, field_id, field:fields(name, area, maps_address), ${bothTeams("name, logo_path")}`,
      idsOf("game"),
    ),
    query<SocialRow>("social_events", "event_id, name", idsOf("social")),
    query<TournamentRow>(
      "tournaments",
      "event_id, name, location, field:fields(name, area, maps_address)",
      idsOf("tournament"),
    ),
  ]);

  const byEvent = <T extends { event_id: string }>(list: T[]) =>
    new Map(list.map((row) => [row.event_id, row]));

  const practiceOf = byEvent(practices);
  const gameOf = byEvent(games);
  const socialOf = byEvent(socials);
  const tournamentOf = byEvent(tournaments);

  const base = (row: EventRow): TeamEvent => ({
    id: row.id,
    type: row.event_type,
    date: row.event_date,
    title: "",
    location: null,
    address: null,
    notes: null,
    opponentLogo: null,
    isHome: null,
    practice: null,
    game: null,
  });

  return rows.map((row) => {
    const event = base(row);

    switch (row.event_type) {
      case "practice": {
        const practice = practiceOf.get(row.id);
        const field = one(practice?.field);
        event.title = "Practice";
        event.location = field ? fieldLabel(field) : null;
        event.address = field?.maps_address ?? null;
        event.notes = practice?.notes ?? null;
        if (practice) {
          event.practice = { fieldId: practice.field_id, notes: practice.notes };
        }
        break;
      }
      case "game": {
        const game = gameOf.get(row.id);
        const field = one(game?.field);
        const side = game ? sideOf(game, teamId) : null;
        const isHome = side?.isHome ?? true;
        const opponent = game ? opponentOf(game, isHome) : null;
        event.title = `${isHome ? "vs." : "@"} ${opponent?.name ?? "TBD"}`;
        event.location = field ? fieldLabel(field) : null;
        event.address = field?.maps_address ?? null;
        event.opponentLogo = logoUrl(opponent?.logo_path ?? null);
        event.isHome = isHome;
        if (game && side) {
          event.game = {
            opponentId: side.opponentId,
            fieldId: game.field_id,
            isHome,
          };
        }
        break;
      }
      case "social": {
        event.title = socialOf.get(row.id)?.name ?? "Social Event";
        break;
      }
      case "tournament": {
        const tournament = tournamentOf.get(row.id);
        const field = one(tournament?.field);
        event.title = tournament?.name ?? "Tournament";
        event.location = tournament?.location ?? (field ? fieldLabel(field) : null);
        event.address = field?.maps_address ?? null;
        break;
      }
    }

    return event;
  });
}

/** Everything from now on in the current season, soonest first. */
export async function getUpcomingEvents(
  seasonId: string,
  teamId: string,
): Promise<TeamEvent[]> {
  const db = await client();
  const { data, error } = await db
    .from("events")
    .select("id, event_type, event_date")
    .eq("season_id", seasonId)
    .eq("team_id", teamId)
    .gte("event_date", new Date().toISOString())
    .order("event_date");

  if (error) throw new Error(`Failed to load events: ${error.message}`);
  return withSubtypes(db, (data ?? []) as EventRow[], teamId);
}

/**
 * One event by id, past or future. The app only ever lists upcoming events,
 * but a reminder link can outlive the event it points at, and a page that
 * still renders beats one that spins. Another team's event reads as missing.
 */
export async function getEvent(
  eventId: string,
  teamId: string,
): Promise<TeamEvent | null> {
  const db = await client();
  const { data, error } = await db
    .from("events")
    .select("id, event_type, event_date")
    .eq("id", eventId)
    .eq("team_id", teamId)
    .limit(1);

  if (error) throw new Error(`Failed to load event: ${error.message}`);
  const [event] = await withSubtypes(db, (data ?? []) as EventRow[], teamId);
  return event ?? null;
}

// MARK: Availability

type AvailabilityRow = {
  event_id: string;
  roster_id: string;
  status: AvailabilityStatus;
};

/** Every response for the given events, grouped by event. */
export async function getAvailability(
  eventIds: string[],
): Promise<Map<string, Response[]>> {
  const grouped = new Map<string, Response[]>();
  if (eventIds.length === 0) return grouped;

  const { data, error } = await (await client())
    .from("availability")
    .select("event_id, roster_id, status")
    .in("event_id", eventIds);

  if (error) throw new Error(`Failed to load availability: ${error.message}`);

  for (const row of (data ?? []) as AvailabilityRow[]) {
    const list = grouped.get(row.event_id) ?? [];
    list.push({ rosterId: row.roster_id, status: row.status });
    grouped.set(row.event_id, list);
  }

  return grouped;
}

/** Members who have not answered for an event — the app's `rosterWithoutResponse`. */
export function withoutResponse(roster: Member[], responses: Response[]) {
  const answered = new Set(responses.map((response) => response.rosterId));
  return roster.filter((member) => !answered.has(member.rosterId));
}

// MARK: Grouping

export type DayGroup = { key: string; heading: string; events: TeamEvent[] };

/** Events under one heading per calendar day in the team's zone, soonest first. */
export function groupByDay(events: TeamEvent[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();

  for (const event of events) {
    const key = dayKey(event.date);
    const group = groups.get(key) ?? {
      key,
      heading: formatDayHeading(event.date),
      events: [],
    };
    group.events.push(event);
    groups.set(key, group);
  }

  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}
