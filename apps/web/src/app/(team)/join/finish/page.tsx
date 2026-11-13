import type { Metadata } from "next";

import { finishJoin } from "@/app/(team)/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { AutoSubmit } from "@/components/auto-submit";
import { OnboardingCard } from "@/components/team/onboarding-card";
import { PENDING, readPending } from "@/lib/pending";
import { teamRedirect } from "@/lib/team-path";

export const metadata: Metadata = { title: "Joining…" };

/**
 * The step between a sign-in and the schedule. Joining writes cookies, which
 * a page can't, so it's an action the page submits on arrival; the button is
 * for when scripts haven't run.
 */
export default async function FinishPage() {
  if (!(await readPending(PENDING.code))) return teamRedirect("/join");

  return (
    <OnboardingCard title="One moment" subtitle="Putting you on the team">
      <AdminForm action={finishJoin} submitLabel="Continue">
        <AutoSubmit />
      </AdminForm>
    </OnboardingCard>
  );
}
