import { ArrowLink, Reveal } from "@/components/ui";

const HEADLINE = ["Making film", "and stats more", "accessible."];

export default function Home() {
  return (
    <section className="mx-auto flex min-h-[calc(100svh-72px-88px)] w-full max-w-[1120px] flex-col justify-center px-6 py-24 md:px-10">

      <h1 className="display mt-10 text-[clamp(2rem,6vw,5rem)]">
        {HEADLINE.map((line, i) => (
          <span
            key={line}
            className="mask-line"
            data-reveal=""
            style={{ "--reveal-delay": `${180 + i * 110}ms` } as React.CSSProperties}
          >
            <span>{line}</span>
          </span>
        ))}
      </h1>

      <div className="mt-14 flex flex-col gap-8 border-t border-line pt-8 sm:flex-row sm:items-start sm:justify-between md:mt-20">
        <Reveal delay={720} className="flex items-center gap-8">
          <ArrowLink href="/faq">FAQ</ArrowLink>
          <ArrowLink href="/contact">Get in touch</ArrowLink>
        </Reveal>
      </div>
    </section>
  );
}
