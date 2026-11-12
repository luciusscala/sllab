import type { Metadata } from "next";
import Link from "next/link";

import { continueAsGuest } from "@/app/auth/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { OnboardingCard } from "@/components/team/onboarding-card";
import { PENDING, readPending } from "@/lib/pending";
import { supabaseUser } from "@/lib/supabase-server";
import { teamBase, teamRedirect } from "@/lib/team-path";

export const metadata: Metadata = { title: "Who are you?" };

/**
 * The fork after the code: on the team, or just looking. A player signs in
 * with their number so the team knows it's them; a guest is done with one
 * tap and sees the schedule, nothing more.
 */
export default async function WhoPage() {
  const code = await readPending(PENDING.code);
  if (!code) return teamRedirect("/join");

  const { data } = await (await supabaseUser()).rpc("lookup_team", { p_code: code });
  const team = (data as { name: string }[] | null)?.[0];
  if (!team) return teamRedirect("/join");

  const base = await teamBase();

  return (
    <OnboardingCard title={team.name} subtitle="How do you want to join?">
      <Link
        href={`${base}/join/phone`}
        className="block w-full rounded-md bg-navy px-4 py-3 text-center text-sm font-semibold text-yellow transition hover:opacity-90"
      >
        I&rsquo;m on the team
      </Link>
      <p className="mt-2 text-center text-xs text-muted">
        Players, captains and coaches. We&rsquo;ll text you a code.
      </p>

      <div className="mt-6">
        <AdminForm action={continueAsGuest} submitLabel="Just looking">
          <p className="mb-1 text-center text-xs text-muted">
            See the schedule without signing in. You won&rsquo;t be able to respond to events.
          </p>
        </AdminForm>
      </div>
    </OnboardingCard>
  );
}
