"use client";

import { cancelInvite, inviteCaptain, issueCode, removeTeam } from "@/app/console/teams/actions";
import { Badge } from "@/components/ui/badge";
import { FormField, Input } from "@/components/ui/field";
import { RemoveForm } from "@/components/ui/remove-form";
import { ResourceForm } from "@/components/ui/resource-form";
import type { TeamAccess } from "@/lib/data/console";

const CLOSE = "/console/teams";

const masked = (phone: string) => `•••• ${phone.slice(-4)}`;

/**
 * Below a team's details in its drawer: how people get onto it. The code is
 * what members enter; the captain invite is how a new team gets its first
 * staff without SQL.
 */
export function TeamAccessPanel({
  teamId,
  teamName,
  access,
  removable,
}: {
  teamId: string;
  teamName: string;
  access: TeamAccess;
  removable: boolean;
}) {
  const self = `${CLOSE}?edit=${teamId}`;
  const pending = access.invites.filter((invite) => !invite.accepted);

  return (
    <div className="mt-8 space-y-6 border-t border-border pt-6">
      <section>
        <h3 className="section-label">Team code</h3>
        {access.code ? (
          <p className="mt-2 font-mono text-2xl tracking-[0.2em]">{access.code}</p>
        ) : (
          <p className="mt-2 text-sm text-muted">No code yet, so nobody can join. Issue one to bring the team onto Fixture.</p>
        )}
        <ResourceForm
          action={issueCode}
          submitLabel={access.code ? "Replace code" : "Issue code"}
          variant="secondary"
          closeHref={self}
          className="mt-1"
          confirm={
            access.code
              ? {
                  title: "Replace the team code?",
                  message: "The old code stops working for anyone who hasn't joined yet. Current members aren't affected.",
                }
              : undefined
          }
        >
          <input type="hidden" name="team_id" value={teamId} />
        </ResourceForm>
      </section>

      <section>
        <h3 className="section-label">Staff</h3>
        {access.staff.length ? (
          <ul className="mt-2 space-y-1 text-sm">
            {access.staff.map((person) => (
              <li key={`${person.role}-${person.name}`} className="flex items-center justify-between">
                {person.name}
                <Badge>{person.role === "captain" ? "Captain" : "Coach"}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No captain or coach yet.</p>
        )}

        {pending.length > 0 && (
          <ul className="mt-3 space-y-2">
            {pending.map((invite) => (
              <li key={invite.phone} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {masked(invite.phone)} <span className="text-muted">invited as {invite.role}</span>
                </span>
                <ResourceForm action={cancelInvite} submitLabel="Cancel" variant="ghost" closeHref={self} className="space-y-0 [&>div]:pt-0">
                  <input type="hidden" name="team_id" value={teamId} />
                  <input type="hidden" name="phone" value={invite.phone} />
                </ResourceForm>
              </li>
            ))}
          </ul>
        )}

        <ResourceForm action={inviteCaptain} submitLabel="Invite captain" variant="secondary" closeHref={self} className="mt-4">
          <input type="hidden" name="team_id" value={teamId} />
          <FormField
            label="Captain's phone"
            htmlFor="invite_phone"
            hint={`They become ${teamName}'s captain when they sign in with this number and enter the team code.`}
          >
            <Input id="invite_phone" name="phone" type="tel" inputMode="numeric" placeholder="(555) 123-4567" required />
          </FormField>
        </ResourceForm>
      </section>

      {removable && (
        <RemoveForm
          action={removeTeam}
          hidden={{ id: teamId }}
          label="Remove team"
          title={`Remove ${teamName}?`}
          message="Nothing refers to this team yet, so nothing else is affected."
          closeHref={CLOSE}
        />
      )}
    </div>
  );
}
