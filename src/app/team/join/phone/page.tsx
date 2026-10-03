import type { Metadata } from "next";
import Link from "next/link";
import { savePhone, skipPhone } from "@/app/team/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { OnboardingCard } from "@/components/team/onboarding-card";
import { teamRedirect } from "@/lib/team-path";
import { isComplete, readTeamSession } from "@/lib/team-session";

export const metadata: Metadata = { title: "Your phone number" };

export default async function PhoneStepPage() {
  const session = await readTeamSession();
  if (!session) return teamRedirect("/join");
  if (!session.rosterId) return teamRedirect("/join/roster");
  if (isComplete(session)) return teamRedirect("");

  return (
    <OnboardingCard
      title="Your Phone Number"
      subtitle="Optional — it's how captains send you reminders"
    >
      <AdminForm action={savePhone} submitLabel="Get Text Reminders">
        <label className="field-label" htmlFor="phone">
          Phone <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="5551234567"
          className="field text-center text-lg"
        />

        {/* Unticked by default, as carriers require of an SMS opt-in. */}
        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" name="sms_consent" className="mt-0.5 size-4 shrink-0 accent-navy" />
          <span>
            Text me reminders about UCSD Men&rsquo;s Club Soccer practices,
            games and team events.
          </span>
        </label>

        <p className="mt-3 text-xs text-muted">
          Usually a few messages a week during the season. Message and data
          rates may apply. Reply HELP for help or STOP to opt out at any time,
          or remove your number in Settings. See our{" "}
          <Link href="/terms" className="underline underline-offset-4">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>
          . Leave it blank and you&rsquo;ll see the schedule as usual, just
          without the reminders.
        </p>
      </AdminForm>

      {/* Its own form: a second button inside the one above would post the
          number the player may have started typing. */}
      <form action={skipPhone} className="mt-4 text-center">
        <button
          type="submit"
          className="text-sm text-muted underline underline-offset-4 transition hover:text-foreground"
        >
          Skip for now
        </button>
      </form>
    </OnboardingCard>
  );
}
