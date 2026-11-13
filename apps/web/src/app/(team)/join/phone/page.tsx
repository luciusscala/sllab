import type { Metadata } from "next";

import { PhoneSignIn } from "@/components/phone-sign-in";
import { OnboardingCard } from "@/components/team/onboarding-card";

export const metadata: Metadata = { title: "Sign in" };

export default function PhonePage() {
  return (
    <OnboardingCard title="Your Phone Number" subtitle="It's how the team knows it's you">
      <PhoneSignIn />
    </OnboardingCard>
  );
}
