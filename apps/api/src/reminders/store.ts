import type { SupabaseClient } from "@supabase/supabase-js";

export type Role = "guest" | "player" | "captain" | "coach";
export type Status = "active" | "away" | "inactive";

export type Member = { personId: string; role: Role; status: Status };

/**
 * The reads and writes reminders need. Kept behind this interface so the rules
 * in `deliver.ts` and the route can be tested without a database.
 */
export interface ReminderStore {
  /** The signed-in user's membership on this team, if they have one. */
  membership(userId: string, teamId: string): Promise<Member | null>;
  /** How many reminders the team has sent since `since`. */
  sentSince(teamId: string, since: Date): Promise<number>;
  /**
   * The numbers to text for these roster rows: rows on this team only, so one
   * team's captain can't name another's players, and only people who are
   * active and ticked the box. Status is a filter, so someone away isn't
   * texted, and consent is the carriers' rule as much as ours.
   */
  recipients(teamId: string, rosterIds: string[]): Promise<string[]>;
  log(entry: { teamId: string; eventId: string | null; sentBy: string; recipientCount: number }): Promise<void>;
}

export function supabaseReminderStore(admin: SupabaseClient): ReminderStore {
  const fail = (what: string, error: { message: string }): never => {
    throw new Error(`${what}: ${error.message}`);
  };

  return {
    async membership(userId, teamId) {
      const { data, error } = await admin
        .from("memberships")
        .select("person_id, role, status, people!inner(user_id)")
        .eq("team_id", teamId)
        .eq("people.user_id", userId)
        .maybeSingle();
      if (error) fail("Loading membership", error);
      return data ? { personId: data.person_id, role: data.role, status: data.status } : null;
    },

    async sentSince(teamId, since) {
      const { count, error } = await admin
        .from("reminder_log")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .gte("created_at", since.toISOString());
      if (error) fail("Counting reminders", error);
      return count ?? 0;
    },

    async recipients(teamId, rosterIds) {
      if (rosterIds.length === 0) return [];

      const { data: rows, error: rosterError } = await admin
        .from("roster")
        .select("person_id")
        .eq("team_id", teamId)
        .in("id", rosterIds);
      if (rosterError) fail("Loading roster", rosterError);
      const personIds = (rows ?? []).map((row) => row.person_id as string);
      if (personIds.length === 0) return [];

      const [members, contacts] = await Promise.all([
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
      if (members.error) fail("Loading members", members.error);
      if (contacts.error) fail("Loading contacts", contacts.error);

      const active = new Set((members.data ?? []).map((row) => row.person_id as string));
      return (contacts.data ?? [])
        .filter((row) => active.has(row.person_id as string))
        .map((row) => row.phone as string);
    },

    async log({ teamId, eventId, sentBy, recipientCount }) {
      const { error } = await admin.from("reminder_log").insert({
        team_id: teamId,
        event_id: eventId,
        sent_by: sentBy,
        recipient_count: recipientCount,
      });
      if (error) fail("Logging reminder", error);
    },
  };
}
