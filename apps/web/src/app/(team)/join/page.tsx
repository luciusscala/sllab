import type { Metadata } from "next";
import Link from "next/link";

import { signOut } from "@/app/auth/actions";
import { lookupTeam, rejoinTeam, switchTeam } from "@/app/(team)/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { OnboardingCard } from "@/components/team/onboarding-card";
import { ROLE_LABEL, getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Join your team" };

/**
 * The first screen for anyone not on a team here, and the way onto another
 * one. A code names the team; who you are comes next. Someone signed in
 * already sees the teams they're on (and any they've left) above the box.
 */
export default async function JoinPage() {
  const { userId, memberships } = await getViewer();
  const current = memberships.filter((m) => m.status !== "inactive");
  const left = memberships.filter((m) => m.status === "inactive");

  return (
    <OnboardingCard
      title={current.length ? "Your Teams" : "Join Your Team"}
      subtitle={
        current.length
          ? "Pick a team, or enter a code to join another"
          : "Enter the team code provided by your captain"
      }
    >
      {current.length > 0 && (
        <ul className="mb-6 divide-y divide-border border-y border-border">
          {current.map((m) => (
            <li key={m.membershipId}>
              <form action={switchTeam}>
                <input type="hidden" name="team_id" value={m.teamId} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between py-3 text-left text-sm transition hover:bg-surface-raised"
                >
                  <span>
                    <span className="font-medium">{m.teamName}</span>
                    <span className="ml-2 text-xs text-muted">{ROLE_LABEL[m.role]}</span>
                  </span>
                  <span aria-hidden className="text-muted">
                    ›
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {left.length > 0 && (
        <ul className="mb-6 divide-y divide-border border-y border-border">
          {left.map((m) => (
            <li key={m.membershipId} className="flex items-center justify-between py-3 text-sm">
              <span className="text-muted">You left {m.teamName}</span>
              <form action={rejoinTeam}>
                <input type="hidden" name="membership_id" value={m.membershipId} />
                <button type="submit" className="font-medium text-foreground underline underline-offset-4">
                  Rejoin
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <AdminForm action={lookupTeam} submitLabel="Continue">
        <label className="field-label" htmlFor="team_code">
          Team code
        </label>
        <input
          id="team_code"
          name="team_code"
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="field text-center font-mono text-lg uppercase tracking-widest"
        />
      </AdminForm>

      <p className="mt-6 text-center text-xs text-muted">
        {userId ? (
          <form action={signOut} className="inline">
            <button type="submit" className="underline underline-offset-4">
              Sign out
            </button>
          </form>
        ) : (
          <>
            By continuing you agree to the{" "}
            <Link href="/terms" className="underline underline-offset-4">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </>
        )}
      </p>
    </OnboardingCard>
  );
}
