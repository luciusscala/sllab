import { HiveGraphic } from "@/components/hive-graphic";
import { Reveal } from "@/components/ui";

/** The whole site: one picture of how SLLAB fits together, and one line. */
export default function Home() {
  return (
    <section className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col items-center justify-center px-6 py-6 md:px-10">
      <Reveal delay={120} className="flex w-full justify-center">
        <HiveGraphic />
      </Reveal>
      <Reveal delay={520} as="p" className="label mt-8 text-center md:mt-10">
        The all-in-one platform for club sports
      </Reveal>
    </section>
  );
}
