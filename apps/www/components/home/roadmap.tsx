import { Section } from "@/components/home/section";
import { Reveal } from "@/components/ui";

type Step = { title: string; body: string; state: "Done" | "Now" | "Next" };

const STEPS: Step[] = [
  {
    title: "Accounts and access",
    body: "Sign-in by phone, a membership per team, and captain as a role granted by another captain instead of a shared code.",
    state: "Done",
  },
  {
    title: "A platform API",
    body: "Server work moves off the club's website into one service, so no app depends on a club's domain.",
    state: "Done",
  },
  {
    title: "Many teams",
    body: "A shared directory of schools, teams, fields and seasons that every club references, and a console to bring a team on without a developer.",
    state: "Now",
  },
  {
    title: "Matches and statistics",
    body: "Lineups and match events, from which player profiles, career statistics and standings follow.",
    state: "Next",
  },
  {
    title: "Club sites as data",
    body: "One deployment renders every club's site from its domain, themed with its colours and crest.",
    state: "Next",
  },
  {
    title: "Film on the platform",
    body: "Videos attached to their games, from Film or anywhere else, and visible in Fixture.",
    state: "Next",
  },
];

export function Roadmap() {
  return (
    <Section
      id="roadmap"
      index="04"
      label="Where it's going"
      title="From one team's tools to a platform any club can join."
    >
      <ol className="border-t border-line">
        {STEPS.map((step, i) => (
          <Reveal
            as="li"
            key={step.title}
            delay={i * 60}
            className="grid gap-2 border-b border-line py-6 md:grid-cols-[3rem_1fr_2fr_5rem] md:items-baseline md:gap-6"
          >
            <span className="label">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="text-[17px] font-medium tracking-tight">{step.title}</h3>
            <p className="lede text-sm text-muted">{step.body}</p>
            <span className={`label md:text-right ${step.state === "Next" ? "" : "text-fg"}`}>{step.state}</span>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}
