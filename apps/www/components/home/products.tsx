import { Section } from "@/components/home/section";
import { MediaPlaceholder } from "@/components/media-placeholder";
import { ArrowLink, Reveal } from "@/components/ui";

type Product = {
  name: string;
  status: "Live" | "Prototype";
  summary: string;
  points: string[];
  link?: { href: string; label: string };
  media: { label: string; aspect: string };
};

const PRODUCTS: Product[] = [
  {
    name: "Fixture by SLLAB",
    status: "Live",
    summary: "The app a team uses every day: the schedule, who's coming, and the reminders that get an answer.",
    points: [
      "Join with a team code and your phone number in under a minute",
      "Going or not going in one tap, with everyone else's answer beside it",
      "Captains send text reminders without ever seeing a number",
      "Attendance ranked by what a captain needs to act on",
    ],
    link: { href: "https://app.sllab.io", label: "Open Fixture on the web" },
    media: { label: "MEDIA: Fixture on iPhone: schedule, event responses, reminder composer, attendance", aspect: "4/3" },
  },
  {
    name: "Club sites by SLLAB",
    status: "Live",
    summary: "A public site for the club that keeps itself current, because it reads the same schedule the team does.",
    points: [
      "Schedule and results with crests, record and streak",
      "Live league standings",
      "A calendar feed, so a new game shows up in subscribers' calendars",
      "Roster and tryout information",
    ],
    link: { href: "https://www.ucsdmcs.com", label: "See ucsdmcs.com" },
    media: { label: "MEDIA: ucsdmcs.com: schedule and scores on desktop, standings on mobile", aspect: "16/10" },
  },
  {
    name: "Film by SLLAB",
    status: "Prototype",
    summary: "A phone on a motorized base becomes an unattended camera operator that follows play.",
    points: [
      "On-device detection finds play in the frame",
      "The base turns to keep it centred, with a deadzone so it doesn't hunt",
      "Uploads to the team's channel and attaches to the game",
    ],
    media: { label: "MEDIA: a frame from a tracking test, with the detection box", aspect: "16/10" },
  },
  {
    name: "Hardware by SLLAB",
    status: "Prototype",
    summary: "The base itself: a custom board, a quiet stepper and printed parts, for about $400 instead of $2,000.",
    points: [
      "ESP32 and a TMC2209 driver on a custom two-layer board",
      "Quiet mode keeps the motor off the recording's audio",
      "Every part replaceable without soldering",
    ],
    media: { label: "MEDIA: the assembled mount with a phone, and the controller board", aspect: "16/10" },
  },
];

export function Products() {
  return (
    <Section
      id="products"
      index="02"
      label="What's built"
      title="One platform, four parts, one schedule underneath."
      lede="The schedule a captain creates is the one players answer, the one the club site shows, and the one film attaches to. Nothing is entered twice."
    >
      <div className="space-y-20 md:space-y-28">
        {PRODUCTS.map((product, i) => (
          <article key={product.name} className="grid gap-8 md:grid-cols-2 md:items-center md:gap-14">
            <Reveal className={i % 2 ? "md:order-2" : ""}>
              <div className="flex items-center gap-3">
                <span className="label">{String(i + 1).padStart(2, "0")}</span>
                <span
                  className={`label rounded-full border px-2 py-0.5 tracking-[0.12em] ${
                    product.status === "Live" ? "border-fg text-fg" : "border-line"
                  }`}
                >
                  {product.status}
                </span>
              </div>
              <h3 className="display mt-5 text-[clamp(1.5rem,3vw,2.25rem)]">{product.name}</h3>
              <p className="lede mt-4 text-[15px] text-muted">{product.summary}</p>
              <ul className="mt-6 space-y-2.5 border-t border-line pt-6 text-sm">
                {product.points.map((point) => (
                  <li key={point} className="flex gap-3">
                    <span aria-hidden="true" className="mt-[0.6em] h-px w-3 shrink-0 bg-fg" />
                    {point}
                  </li>
                ))}
              </ul>
              {product.link && <ArrowLink href={product.link.href} className="mt-8">{product.link.label}</ArrowLink>}
            </Reveal>
            <Reveal delay={120} className={i % 2 ? "md:order-1" : ""}>
              <MediaPlaceholder label={product.media.label} aspect={product.media.aspect} />
            </Reveal>
          </article>
        ))}
      </div>
    </Section>
  );
}
