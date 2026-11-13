import type { Metadata } from "next";

import {
  cancelInvite,
  inviteMember,
  reviewMember,
  setMemberRole,
  setMemberStatus,
} from "@/app/(team)/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { SectionHeading } from "@/components/section-heading";
import { MemberActions } from "@/components/team/member-actions";
import { ROLE_LABEL, type Role, isCaptain, requireStaff } from "@/lib/auth";
import {
  type TeamMember,
  getCurrentSeason,
  getMembers,
  getPendingInvites,
  getRecentResponseCounts,
  getRoster,
} from "@/lib/data/team";

export const metadata: Metadata = { title: "Members" };

/** Past this many unanswered events in a row, a player has probably gone quiet. */
const QUIET_AFTER = 8;

/**
 * The staff view of the team: who's new and needs a Keep or Remove, who runs
 * it, who plays, who seems to have drifted off, and the numbers waiting to
 * sign in. Each row's controls are the database functions, one form each.
 */
export default async function MembersPage() {
  const membership = await requireStaff();
  const captain = isCaptain(membership);

  const season = await getCurrentSeason();
  const [members, invites, roster, recent] = await Promise.all([
    getMembers(membership.teamId),
    getPendingInvites(membership.teamId),
    season ? getRoster(season.id, membership.teamId) : [],
    season
      ? getRecentResponseCounts(season.id, membership.teamId, QUIET_AFTER)
      : { events: 0, byRoster: new Map<string, number>() },
  ]);

  const numberOf = new Map(roster.map((m) => [m.personId, m.number]));
  const rosterIdOf = new Map(roster.map((m) => [m.personId, m.rosterId]));

  const newMembers = members.filter((m) => m.isNew && m.status !== "inactive");
  const staff = members.filter(
    (m) => (m.role === "captain" || m.role === "coach") && m.status !== "inactive",
  );
  const players = members.filter((m) => m.role === "player" && m.status !== "inactive" && !m.isNew);
  const guests = members.filter((m) => m.role === "guest" && m.status !== "inactive");
  const quiet =
    recent.events >= QUIET_AFTER
      ? players.filter((m) => {
          const rosterId = rosterIdOf.get(m.personId);
          return m.status === "active" && rosterId && !recent.byRoster.get(rosterId);
        })
      : [];

  const label = (m: TeamMember) => {
    const number = numberOf.get(m.personId);
    return number !== null && number !== undefined ? `#${number} ${m.name}` : m.name;
  };

  const roleOptions: Role[] = captain ? ["player", "captain", "coach"] : [];

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="rounded-xl bg-background p-4 text-foreground sm:p-6">
        <h1 className="headline text-xl sm:text-2xl">Members</h1>

        {newMembers.length > 0 && (
          <>
            <SectionHeading>New members</SectionHeading>
            <p className="mt-2 text-xs text-muted">
              Joined with the team code. Keep them, or remove anyone who shouldn&rsquo;t be here.
            </p>
            <ul className="mt-3 divide-y divide-border">
              {newMembers.map((m) => (
                <li key={m.membershipId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <span>
                    {label(m)} <span className="text-muted">· {ROLE_LABEL[m.role]}</span>
                  </span>
                  <div className="flex gap-2">
                    <AdminForm action={reviewMember} submitLabel="Keep" className="inline">
                      <input type="hidden" name="membership_id" value={m.membershipId} />
                      <input type="hidden" name="keep" value="true" />
                    </AdminForm>
                    <AdminForm
                      action={reviewMember}
                      submitLabel="Remove"
                      destructive
                      confirm={`Remove ${m.name} from the team and this season's roster?`}
                      className="inline"
                    >
                      <input type="hidden" name="membership_id" value={m.membershipId} />
                      <input type="hidden" name="keep" value="false" />
                    </AdminForm>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        <SectionHeading>Staff</SectionHeading>
        <ul className="mt-3 divide-y divide-border">
          {staff.map((m) => (
            <li key={m.membershipId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <span>
                {label(m)} <span className="text-muted">· {ROLE_LABEL[m.role]}</span>
              </span>
              {captain && m.membershipId !== membership.membershipId && (
                <MemberActions
                  member={m}
                  roles={roleOptions}
                  setStatus={setMemberStatus}
                  setRole={setMemberRole}
                />
              )}
            </li>
          ))}
        </ul>

        <SectionHeading>Players</SectionHeading>
        {players.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No players yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {players.map((m) => (
              <li key={m.membershipId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span>
                  {label(m)}
                  {m.status === "away" && <span className="ml-2 text-xs text-muted">Away</span>}
                </span>
                <MemberActions
                  member={m}
                  roles={roleOptions}
                  setStatus={setMemberStatus}
                  setRole={setMemberRole}
                />
              </li>
            ))}
          </ul>
        )}

        {quiet.length > 0 && (
          <>
            <SectionHeading>Haven&rsquo;t been around</SectionHeading>
            <p className="mt-2 text-xs text-muted">
              No response to the last {recent.events} events. Mark them away, or remove them, so
              the response lists reflect who&rsquo;s actually here.
            </p>
            <ul className="mt-3 divide-y divide-border">
              {quiet.map((m) => (
                <li key={m.membershipId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <span>{label(m)}</span>
                  <MemberActions
                    member={m}
                    roles={[]}
                    setStatus={setMemberStatus}
                    setRole={setMemberRole}
                  />
                </li>
              ))}
            </ul>
          </>
        )}

        {guests.length > 0 && (
          <>
            <SectionHeading>Guests</SectionHeading>
            <p className="mt-3 text-sm text-muted">
              {guests.length} {guests.length === 1 ? "person is" : "people are"} following the schedule.
            </p>
          </>
        )}

        <SectionHeading>Add by phone number</SectionHeading>
        <p className="mt-2 text-xs text-muted">
          The role applies when that number signs in. Someone already on the team gets it at once.
          {!captain && " Coaches can add players; captains add staff."}
        </p>
        <AdminForm action={inviteMember} submitLabel="Add" className="mt-3">
          <div className="flex flex-wrap gap-3">
            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              required
              placeholder="(555) 123-4567"
              className="field flex-1"
            />
            <select name="role" defaultValue="player" className="field w-36">
              <option value="player">Player</option>
              {captain && <option value="captain">Captain</option>}
              {captain && <option value="coach">Coach</option>}
            </select>
          </div>
        </AdminForm>

        {invites.length > 0 && (
          <ul className="mt-4 divide-y divide-border text-sm">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="tabular-nums">
                  +{invite.phone} <span className="text-muted">· {ROLE_LABEL[invite.role]}, waiting to sign in</span>
                </span>
                <AdminForm action={cancelInvite} submitLabel="Cancel" destructive className="inline">
                  <input type="hidden" name="invite_id" value={invite.id} />
                </AdminForm>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
