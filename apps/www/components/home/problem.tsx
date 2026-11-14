import { Section } from "@/components/home/section";
import { Reveal } from "@/components/ui";

const POINTS = [
  {
    title: "Run by students",
    body: "A club schedules practices, books fields, travels to tournaments and keeps its roster eligible, all in its officers' spare time.",
  },
  {
    title: "Tools that don't connect",
    body: "A group chat for attendance, a spreadsheet for the roster, a form for tryouts, a site nobody updates. When officers graduate, what they knew goes with them.",
  },
  {
    title: "Film costs too much",
    body: "Game film is one of the best ways to improve, and it needs either someone behind the camera every match or a $2,000 auto-tracking camera.",
  },
];

export function Problem() {
  return (
    <Section
      id="problem"
      index="01"
      label="The problem"
      title="A club does what a varsity program does, without the staff."
    >
      <div className="grid gap-px overflow-hidden rounded-[10px] border border-line bg-line md:grid-cols-3">
        {POINTS.map((point, i) => (
          <Reveal key={point.title} delay={i * 90} className="bg-bg p-6 md:p-8">
            <h3 className="text-[17px] font-medium tracking-tight">{point.title}</h3>
            <p className="lede mt-3 text-sm text-muted">{point.body}</p>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
