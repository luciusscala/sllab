import type { Metadata } from "next";
import Link from "next/link";

import { signOut } from "@/app/auth/actions";
import { leaveTeam, updateProfile } from "@/app/(team)/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { SectionHeading } from "@/components/section-heading";
import { ROLE_LABEL, STATUS_LABEL, adminMembership, getViewer, requireMember } from "@/lib/auth";
import { getCurrentSeason, getRoster } from "@/lib/data/team";

export const metadata: Metadata = { title: "Team Settings" };

/** "(415) 555-0100" from the stored digits, for showing a person their own number. */
const formatPhone = (digits: string) =>
  digits.length === 11 && digits.startsWith("1")
    ? `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    : `+${digits}`;

export default async function TeamSettingsPage() {
  const membership = await requireMember();
  const [{ phone }, admin, season] = await Promise.all([
    getViewer(),
    adminMembership(),
    getCurrentSeason(),
  ]);

  const me = season
    ? (await getRoster(season.id, membership.teamId)).find(
        (member) => member.rosterId === membership.rosterId,
      )
    : undefined;
  const guest = membership.role === "guest";

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="card p-4 text-foreground sm:p-6">
        <h1 className="headline text-xl sm:text-2xl">Settings</h1>

        <SectionHeading>Profile</SectionHeading>
        <dl className="mt-3 divide-y divide-border text-sm">
          <div className="flex justify-between py-2.5">
            <dt className="text-muted">Team</dt>
            <dd>{membership.teamName}</dd>
          </div>
          {!guest && (
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">Name</dt>
              <dd>{membership.personName}</dd>
            </div>
          )}
          <div className="flex justify-between py-2.5">
            <dt className="text-muted">Role</dt>
            <dd>
              {ROLE_LABEL[membership.role]}
              {membership.status !== "active" && (
                <span className="ml-2 text-muted">({STATUS_LABEL[membership.status]})</span>
              )}
            </dd>
          </div>
          {me?.number !== null && me?.number !== undefined && (
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">Number</dt>
              <dd>#{me.number}</dd>
            </div>
          )}
          {phone && (
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">Phone</dt>
              <dd className="tabular-nums">{formatPhone(phone)}</dd>
            </div>
          )}
        </dl>

        {!guest && (
          <AdminForm action={updateProfile} submitLabel="Save Changes" className="mt-2">
            <label className="field-label" htmlFor="hometown">
              Hometown
            </label>
            <input
              id="hometown"
              name="hometown"
              defaultValue={me?.hometown ?? ""}
              placeholder="Add hometown"
              className="field"
            />
          </AdminForm>
        )}

        {admin && (
          <>
            <SectionHeading>Team admin</SectionHeading>
            <p className="mt-3 text-sm">
              <Link href="/admin" className="text-accent underline underline-offset-4">
                Open the admin dashboard
              </Link>
              <span className="ml-2 text-muted">— rosters, results, fields and opponents.</span>
            </p>
          </>
        )}

        <SectionHeading>Account</SectionHeading>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold transition hover:bg-surface-raised"
            >
              Sign out
            </button>
          </form>
          {!guest && (
            <Link href="/settings/delete-account" className="text-sm text-muted underline underline-offset-4 hover:text-foreground">
              Delete account
            </Link>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">
          Signing out only affects this browser. Your team and roster aren&rsquo;t touched.
        </p>

        <div className="mt-8 border-t border-border pt-6">
          <AdminForm
            action={leaveTeam}
            submitLabel="Leave Team"
            destructive
            confirm={`Leave ${membership.teamName}? You stay on this season's roster, and you can rejoin with the team code.`}
          >
            <p className="mb-3 text-sm text-muted">
              You&rsquo;ll stay on this season&rsquo;s roster but stop getting reminders and drop
              off the response lists. Rejoin any time with the team code.
            </p>
          </AdminForm>
        </div>
      </div>
    </div>
  );
}
