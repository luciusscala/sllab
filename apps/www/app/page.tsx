import type { CSSProperties } from "react";

import { Magnetic } from "@/components/magnetic";
import { PlatformGraphic } from "@/components/platform-graphic";
import { ArrowLink, Reveal } from "@/components/ui";
import { CONTACT_EMAIL } from "@/lib/contact";

const HEADLINE = ["The all-in-one platform", "for club sports."];

/** The whole site: what SLLAB is, and how its pieces work together. */
export default function Home() {
  return (
    <>
      <section className="mx-auto w-full max-w-[1120px] px-6 pt-14 pb-10 md:px-10 md:pt-24 md:pb-14">
        <Reveal delay={80}>
          <p className="label">Sports Logic Lab</p>
        </Reveal>

        <h1 className="display mt-8 text-[clamp(2.4rem,7vw,5.75rem)]">
          {HEADLINE.map((line, i) => (
            <span
              key={line}
              className="mask-line"
              data-reveal=""
              style={{ "--reveal-delay": `${200 + i * 120}ms` } as CSSProperties}
            >
              <span>{line}</span>
            </span>
          ))}
        </h1>

        <div className="mt-10 grid gap-10 md:mt-14 md:grid-cols-[1fr_auto] md:items-end">
          <Reveal delay={560}>
            <p className="lede max-w-xl text-[17px] text-muted">
              Schedules, availability, reminders, a public site and game film for college club teams, on one
              platform. Run by students, it should still feel like a program.
            </p>
          </Reveal>
          <Reveal delay={660} className="flex flex-wrap items-center gap-x-8 gap-y-5">
            <Magnetic>
              <a
                href="https://app.sllab.io"
                className="inline-flex h-11 items-center rounded-full bg-fg px-6 text-sm font-medium text-bg transition-opacity hover:opacity-85"
              >
                Open Fixture
              </a>
            </Magnetic>
            <ArrowLink href={`mailto:${CONTACT_EMAIL}?subject=Early%20access`}>Get early access</ArrowLink>
          </Reveal>
        </div>
      </section>

      <section aria-label="How SLLAB works" className="mx-auto w-full max-w-[1120px] px-6 pb-24 md:px-10 md:pb-32">
        <Reveal delay={760} className="border-t border-line pt-10 md:pt-14">
          <PlatformGraphic />
        </Reveal>
      </section>
    </>
  );
}
