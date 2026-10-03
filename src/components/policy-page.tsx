import { SectionHeading } from "@/components/section-heading";
import { TEAM_EMAIL } from "@/lib/club";

export type PolicySection = { heading: string; paragraphs: string[] };

/**
 * The shared layout of the Privacy Policy and the Terms: a title, the date
 * the text took effect, prose sections, and the club's email to finish.
 */
export function PolicyPage({
  title,
  effective,
  sections,
  contactLabel,
}: {
  title: string;
  effective: string;
  sections: PolicySection[];
  contactLabel: string;
}) {
  return (
    <div className="container-page py-8 sm:py-10">
      <div className="rounded-xl bg-background p-4 text-foreground sm:p-6">
        <h1 className="headline text-xl sm:text-2xl">{title}</h1>
        <p className="mt-1 text-sm text-muted">Effective {effective}</p>

        {sections.map((section) => (
          <section key={section.heading}>
            <SectionHeading>{section.heading}</SectionHeading>
            <div className="mt-3 space-y-3 text-sm leading-relaxed sm:text-base">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}

        <SectionHeading>Contact</SectionHeading>
        <p className="mt-3 text-sm leading-relaxed sm:text-base">
          {contactLabel}{" "}
          <a
            href={`mailto:${TEAM_EMAIL}`}
            className="font-medium text-blue underline underline-offset-4 transition duration-200 ease-out hover:opacity-70 active:opacity-60"
          >
            {TEAM_EMAIL}
          </a>
        </p>
      </div>
    </div>
  );
}
