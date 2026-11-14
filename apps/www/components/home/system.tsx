import type { ReactNode } from "react";

import { Section } from "@/components/home/section";
import { Reveal } from "@/components/ui";

function Node({ title, detail, emphasis = false }: { title: string; detail: string; emphasis?: boolean }) {
  return (
    <div className={`rounded-[10px] border p-4 ${emphasis ? "border-fg" : "border-line"}`}>
      <p className="text-sm font-medium tracking-tight">{title}</p>
      <p className="mt-1 font-mono text-[11px] text-muted">{detail}</p>
    </div>
  );
}

/** A labelled vertical rule between tiers: what passes from one to the next. */
function Link({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-3 pl-6" aria-hidden="true">
      <span className="h-10 w-px bg-line" />
      <span className="label normal-case tracking-[0.04em]">{children}</span>
    </div>
  );
}

function Tier({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="label mb-3">{label}</p>
      {children}
    </div>
  );
}

/**
 * The architecture as three tiers, drawn in HTML so it reflows to a phone:
 * the apps people use, the one backend they share, and the services it
 * talks to. Mirrors the architecture figure in the write-up.
 */
export function System() {
  return (
    <Section
      id="system"
      index="03"
      label="How it fits"
      title="Every app reads and writes one database."
      lede="Access rules live in the database, so each app sees only its own team's data. Anything that needs a secret, like sending a text, runs on the platform's API instead of on a phone."
    >
      <Reveal>
        <figure aria-label="SLLAB architecture: apps, the shared backend, and outside services">
          <Tier label="Apps">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Node title="Fixture" detail="iOS" />
              <Node title="Fixture on the web" detail="app.sllab.io" />
              <Node title="Club sites" detail="ucsdmcs.com" />
              <Node title="Film" detail="iOS + mount, over BLE" />
            </div>
          </Tier>

          <Link>sign in by phone · read and write under access rules</Link>

          <Tier label="Platform">
            <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
              <Node emphasis title="One database" detail="Postgres on Supabase: people, teams, seasons, events, availability" />
              <Node title="API" detail="api.sllab.io" />
            </div>
          </Tier>

          <Link>texts, uploads, standings</Link>

          <Tier label="Services">
            <div className="grid grid-cols-3 gap-3">
              <Node title="Twilio" detail="SMS" />
              <Node title="YouTube" detail="film" />
              <Node title="SportsEngine" detail="standings" />
            </div>
          </Tier>
        </figure>
      </Reveal>
    </Section>
  );
}
