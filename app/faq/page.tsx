import type { Metadata } from "next";
import { FAQS } from "@/lib/content";
import { Accordion } from "@/components/accordion";
import { ArrowLink, Reveal } from "@/components/ui";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Common questions about Sllab — Sports Logic Lab.",
};

export default function FaqPage() {
  return (
    <section className="mx-auto w-full max-w-[1120px] px-6 py-24 md:px-10 md:py-32">
      <h1 className="display text-[clamp(2.4rem,6vw,4.5rem)]">
        <span
          className="mask-line"
          data-reveal=""
          style={{ "--reveal-delay": "60ms" } as React.CSSProperties}
        >
          <span>Questions</span>
        </span>
      </h1>

      <Reveal delay={220}>
        <p className="lede mt-6 max-w-md text-sm text-muted">
          Placeholder answers below. They will be replaced once the product is
          closer to launch.
        </p>
      </Reveal>

      <Reveal delay={320} className="mt-16">
        <Accordion items={FAQS} />
      </Reveal>

      <Reveal delay={400} className="mt-14">
        <ArrowLink href="/contact">Still have a question?</ArrowLink>
      </Reveal>
    </section>
  );
}
