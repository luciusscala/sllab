import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui";
import { Magnetic } from "@/components/magnetic";

export const metadata: Metadata = {
  description: "Get in touch",
};

const EMAIL = "lscala@ucsd.edu";

const DETAILS = [
  { label: "Based in", value: "San Diego, California" },
  { label: "Replies within", value: "1–2 days" },
  { label: "Early access", value: "A few teams at a time" },
];

export default function ContactPage() {
  return (
    <section className="mx-auto w-full max-w-[1120px] px-6 py-20 md:px-10 md:py-28">
      <Reveal delay={60}>
        <Link href="/" className="label link-wipe">
          ← sllab
        </Link>
      </Reveal>

      <h1 className="display mt-12 text-[clamp(2.4rem,6vw,4.5rem)]">
        <span
          className="mask-line"
          data-reveal=""
          style={{ "--reveal-delay": "160ms" } as React.CSSProperties}
        >
          <span>Contact</span>
        </span>
      </h1>

      <Reveal delay={320}>
        <p className="lede mt-6 max-w-md text-sm text-muted">
          Ask for access for your team or ask what we are building.
        </p>
      </Reveal>

      <Reveal delay={440} className="mt-16 border-t border-line pt-12">
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
            delay={520 + i * 90}
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
