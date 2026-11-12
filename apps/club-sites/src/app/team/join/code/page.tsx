import type { Metadata } from "next";
import Link from "next/link";

import { verifyCode } from "@/app/auth/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { OnboardingCard } from "@/components/team/onboarding-card";
import { PENDING, readPending } from "@/lib/pending";
import { teamBase, teamRedirect } from "@/lib/team-path";

export const metadata: Metadata = { title: "Enter your code" };

export default async function CodePage() {
  const phone = await readPending(PENDING.phone);
  if (!phone) return teamRedirect("/join/phone");

  const base = await teamBase();
  const lastFour = phone.slice(-4);

  return (
    <OnboardingCard title="Check Your Texts" subtitle={`We sent a code to the number ending in ${lastFour}`}>
      <AdminForm action={verifyCode} submitLabel="Continue">
        <label className="field-label" htmlFor="code">
          6-digit code
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          className="field text-center font-mono text-2xl tracking-[0.5em]"
        />
      </AdminForm>

      <p className="mt-4 text-center text-xs text-muted">
        Wrong number or no text?{" "}
        <Link href={`${base}/join/phone`} className="underline underline-offset-4">
          Try again
        </Link>
      </p>
    </OnboardingCard>
  );
}
