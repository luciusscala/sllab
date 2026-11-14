import type { CSSProperties } from "react";

import { MediaPlaceholder } from "@/components/media-placeholder";
import { ArrowLink, Reveal } from "@/components/ui";

const HEADLINE = ["Making film", "and stats more", "accessible."];

export function Hero() {
  return (
    <section className="mx-auto w-full max-w-[1120px] px-6 pt-16 pb-12 md:px-10 md:pt-24">
      <Reveal delay={80}>
        <p className="label">Sports Logic Lab</p>
      </Reveal>

      <h1 className="display mt-8 text-[clamp(2.4rem,7vw,5.5rem)]">
        {HEADLINE.map((line, i) => (
          <span
            key={line}
            className="mask-line"
            data-reveal=""
            style={{ "--reveal-delay": `${200 + i * 110}ms` } as CSSProperties}
          >
            <span>{line}</span>
          </span>
        ))}
      </h1>

      <div className="mt-10 grid gap-10 md:mt-14 md:grid-cols-[1fr_auto] md:items-end">
        <Reveal delay={620}>
          <p className="lede max-w-xl text-[17px] text-muted">
            College club teams are run by students, with no staff and officers who change every year. SLLAB
            gives them what a staffed program has: one schedule, a team that answers, a public site, and
            film of every game.
          </p>
        </Reveal>
        <Reveal delay={720} className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <ArrowLink href="https://app.sllab.io">Open Fixture</ArrowLink>
          <ArrowLink href="/contact">Bring your team</ArrowLink>
        </Reveal>
      </div>

      <Reveal delay={820} className="mt-16 md:mt-20">
        <MediaPlaceholder
          aspect="16/9"
          label="MEDIA: Fixture by SLLAB on iPhone and on the web, side by side: the schedule, an event's responses, the team dashboard"
        />
        <p className="label mt-4 normal-case tracking-[0.04em]">
          In daily use by UC San Diego Men&rsquo;s Club Soccer. Fixture is on the App Store.
        </p>
      </Reveal>
    </section>
  );
}
