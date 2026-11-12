import type { Metadata } from "next";

import { completeProfile } from "@/app/team/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { OnboardingCard } from "@/components/team/onboarding-card";
import { CLASSES, POSITIONS } from "@/lib/data/roster";
import { PENDING, readPending } from "@/lib/pending";
import { teamRedirect } from "@/lib/team-path";

export const metadata: Metadata = { title: "About you" };

/**
 * Only for someone the team hasn't seen before: a number that matches the
 * roster skips this. What's asked is what the roster shows for everyone.
 */
export default async function ProfilePage() {
  if (!(await readPending(PENDING.code))) return teamRedirect("/join");

  return (
    <OnboardingCard title="Welcome" subtitle="Tell the team who you are">
      <AdminForm action={completeProfile} submitLabel="Join the team">
        <label className="field-label" htmlFor="name">
          Full name
        </label>
        <input id="name" name="name" required autoComplete="name" className="field" />

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="position">
              Position
            </label>
            <select id="position" name="position" required defaultValue="" className="field">
              <option value="" disabled>
                Choose…
              </option>
              {POSITIONS.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="class">
              Class
            </label>
            <select id="class" name="class" required defaultValue="" className="field">
              <option value="" disabled>
                Choose…
              </option>
              {CLASSES.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="field-label mt-4" htmlFor="number">
          Number <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id="number" name="number" type="number" min="0" max="99" className="field" />

        {/* Unticked by default, as carriers require of an SMS opt-in. */}
        <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" name="sms_consent" className="mt-0.5 size-4 shrink-0 accent-navy" />
          <span>
            Text me reminders about practices, games and team events. Usually a
            few a week in season. Reply STOP to any message to opt out.
          </span>
        </label>
      </AdminForm>
    </OnboardingCard>
  );
}
