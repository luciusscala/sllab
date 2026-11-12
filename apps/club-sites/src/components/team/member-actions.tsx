"use client";

import { useActionState } from "react";

import type { ActionState } from "@/app/team/actions";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import type { TeamMember } from "@/lib/data/team";

type Action = (state: ActionState, data: FormData) => Promise<ActionState>;

const BUTTON =
  "rounded-md border border-border-strong px-2.5 py-1 text-xs font-medium transition hover:bg-surface disabled:opacity-50";

/**
 * The controls beside one member: mark away or active, remove, and (for
 * captains) change role. Each is a tiny form posting to the matching
 * database function; the error from the last one shows beneath.
 */
export function MemberActions({
  member,
  roles,
  setStatus,
  setRole,
}: {
  member: TeamMember;
  /** Roles the viewer may assign; empty hides the role control. */
  roles: Role[];
  setStatus: Action;
  setRole: Action;
}) {
  const [statusState, statusAction, statusPending] = useActionState(setStatus, null);
  const [roleState, roleAction, rolePending] = useActionState(setRole, null);
  const error = statusState?.error ?? roleState?.error;

  const statusButton = (status: "active" | "away" | "inactive", label: string, confirmText?: string) => (
    <form action={statusAction} className="inline">
      <input type="hidden" name="membership_id" value={member.membershipId} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        disabled={statusPending}
        onClick={(event) => {
          if (confirmText && !window.confirm(confirmText)) event.preventDefault();
        }}
        className={`${BUTTON} ${status === "inactive" ? "text-red-700" : ""}`}
      >
        {label}
      </button>
    </form>
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {member.status === "away"
          ? statusButton("active", "Mark active")
          : statusButton("away", "Mark away")}
        {statusButton("inactive", "Remove", `Remove ${member.name} from the team?`)}

        {roles.length > 0 && (
          <form action={roleAction} className="inline">
            <input type="hidden" name="membership_id" value={member.membershipId} />
            <select
              name="role"
              defaultValue={member.role}
              disabled={rolePending}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
              aria-label={`Role for ${member.name}`}
              className={`${BUTTON} bg-background`}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </select>
          </form>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-orange-700">
          {error}
        </p>
      )}
    </div>
  );
}
