import Link from "next/link";
import type { ReactNode } from "react";

import { CONTACT_EMAIL } from "@/lib/contact";

export type PolicySection = { heading: string; paragraphs: ReactNode[] };

const LINK = "underline underline-offset-4 decoration-line hover:decoration-current";

/** An email link in the policy pages' style. */
export function Email() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
      {CONTACT_EMAIL}
    </a>
  );
}

/** A link within the policy pages, in their style. */
export function PolicyLink({ href, children }: { href: string; children: ReactNode }) {
  return href.startsWith("/") ? (
    <Link href={href} className={LINK}>
      {children}
    </Link>
  ) : (
    <a href={href} className={LINK}>
      {children}
    </a>
  );
}

/**
 * The shared frame of Fixture's privacy policy, terms and support page: the
 * App Store listing links to all three. Static, with no entrance animation,
 * since people arrive here to read and reviewers to check.
 */
export function PolicyPage({
  title,
  intro,
  effective,
  children,
}: {
  title: string;
  intro?: ReactNode;
  effective?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-[720px] px-6 py-20 md:px-10 md:py-28">
      <Link href="/" className="label">
        ← sllab
      </Link>

      <p className="label mt-12">Fixture by SLLAB</p>
      <h1 className="display mt-4 text-[clamp(2.2rem,5vw,3.5rem)]">{title}</h1>
      {effective && <p className="mt-4 text-sm text-muted">Effective {effective}</p>}
      {intro && <div className="lede mt-6 text-muted">{intro}</div>}

      <div className="mt-12 border-t border-line">{children}</div>
    </article>
  );
}

/** Prose sections, each a heading over its paragraphs. */
export function PolicySections({ sections }: { sections: PolicySection[] }) {
  return sections.map((section) => (
    <section key={section.heading} className="border-b border-line py-8">
      <h2 className="text-lg font-medium tracking-tight">{section.heading}</h2>
      <div className="lede mt-4 space-y-4 text-[15px]">
        {section.paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </section>
  ));
}
