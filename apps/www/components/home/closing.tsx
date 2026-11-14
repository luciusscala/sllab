import { Magnetic } from "@/components/magnetic";
import { ArrowLink, Reveal } from "@/components/ui";
import { CONTACT_EMAIL } from "@/lib/contact";

export function Closing() {
  return (
    <section className="mx-auto w-full max-w-[1120px] px-6 py-24 md:px-10 md:py-36">
      <Reveal className="border-t border-line pt-6">
        <span className="label">Early access</span>
      </Reveal>
      <Reveal delay={80}>
        <h2 className="display mt-8 max-w-3xl text-[clamp(2rem,5vw,4rem)]">Bring your team onto SLLAB.</h2>
      </Reveal>
      <Reveal delay={160}>
        <p className="lede mt-6 max-w-xl text-[15px] text-muted">
          We&rsquo;re adding a few club teams at a time. Tell us your school and sport, and we&rsquo;ll set your team up
          and hand your captain the code.
        </p>
      </Reveal>
      <Reveal delay={240} className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-5">
        <Magnetic>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex h-11 items-center rounded-full bg-fg px-6 text-sm font-medium text-bg transition-opacity hover:opacity-85"
          >
            {CONTACT_EMAIL}
          </a>
        </Magnetic>
        <ArrowLink href="/contact">More about early access</ArrowLink>
      </Reveal>
    </section>
  );
}
