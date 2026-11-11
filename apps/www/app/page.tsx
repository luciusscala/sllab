import { ArrowLink, Reveal } from "@/components/ui";

const HEADLINE = ["Making film", "and stats more", "accessible."];

export default function Home() {
  return (
    <section className="mx-auto flex min-h-[calc(100svh-72px)] w-full max-w-[1120px] flex-col justify-center px-6 py-20 md:px-10">
      <h1 className="display mt-10 text-[clamp(2rem,6vw,5rem)]">
        {HEADLINE.map((line, i) => (
          <span
            key={line}
            className="mask-line"
            data-reveal=""
            style={{ "--reveal-delay": `${220 + i * 110}ms` } as React.CSSProperties}
          >
            <span>{line}</span>
          </span>
        ))}
      </h1>

      <Reveal delay={720} className="mt-14 border-t border-line pt-8 md:mt-20">
        <ArrowLink href="/contact">Get in touch</ArrowLink>
      </Reveal>
    </section>
  );
}
