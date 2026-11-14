import type { ReactNode } from "react";

import { Reveal } from "@/components/ui";

/** The frame of a home-page section: a numbered label, a heading, and what follows. */
export function Section({
  id,
  index,
  label,
  title,
  lede,
  children,
}: {
  id: string;
  index: string;
  label: string;
  title: ReactNode;
  lede?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mx-auto w-full max-w-[1120px] scroll-mt-8 px-6 py-20 md:px-10 md:py-28">
      <Reveal className="flex items-center gap-3 border-t border-line pt-6">
        <span className="label">{index}</span>
        <span className="label">{label}</span>
      </Reveal>
      <Reveal delay={80}>
        <h2 className="display mt-8 max-w-3xl text-[clamp(1.75rem,4vw,3rem)]">{title}</h2>
      </Reveal>
      {lede && (
        <Reveal delay={140}>
          <p className="lede mt-6 max-w-2xl text-[15px] text-muted">{lede}</p>
        </Reveal>
      )}
      <div className="mt-12 md:mt-16">{children}</div>
    </section>
  );
}
