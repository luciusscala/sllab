import type { Metadata } from "next";
import { EMAIL } from "@/lib/content";
import { Reveal } from "@/components/ui";
import { Magnetic } from "@/components/magnetic";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Sllab — Sports Logic Lab.",
};

const DETAILS = [
  { label: "Based in", value: "San Diego, California" },
  { label: "Replies within", value: "2–3 days" },
  { label: "Early access", value: "A few teams at a time" },
];

export default function ContactPage() {
  return (
    <section className="mx-auto w-full max-w-[1120px] px-6 py-24 md:px-10 md:py-32">
      <h1 className="display text-[clamp(2.4rem,6vw,4.5rem)]">
        <span
          className="mask-line"
          data-reveal=""
          style={{ "--reveal-delay": "60ms" } as React.CSSProperties}
        >
          <span>Say hello</span>
        </span>
      </h1>

      <Reveal delay={220}>
        <p className="lede mt-6 max-w-md text-sm text-muted">
          Tell us about your team, or ask what we are building. Placeholder copy
          until launch.
        </p>
      </Reveal>

      <Reveal delay={340} className="mt-16 border-t border-line pt-12">
        <Magnetic strength={0.14}>
          <a
            href={`mailto:${EMAIL}`}
            className="display group inline-block text-[clamp(1.8rem,5.4vw,4rem)]"
          >
            <span className="link-wipe">{EMAIL}</span>
          </a>
        </Magnetic>
      </Reveal>

      <div className="mt-20 grid gap-px sm:grid-cols-3">
        {DETAILS.map((detail, i) => (
          <Reveal
            key={detail.label}
            delay={420 + i * 90}
            className="border-t border-line py-6 pr-6"
          >
            <p className="label">{detail.label}</p>
            <p className="mt-3 text-base tracking-tight">{detail.value}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
