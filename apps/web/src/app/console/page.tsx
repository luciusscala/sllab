import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { requirePlatformAdmin } from "@/lib/platform";
import { requireAdminClient } from "@/lib/supabase-admin";

export const metadata: Metadata = { title: "Console" };

const COUNTS = [
  { table: "orgs", label: "Schools" },
  { table: "teams", label: "Teams", href: "/console/teams" },
  { table: "fields", label: "Fields" },
  { table: "seasons", label: "Seasons" },
  { table: "people", label: "People" },
];

export default async function ConsoleHome() {
  await requirePlatformAdmin();
  const client = requireAdminClient();

  const counts = await Promise.all(
    COUNTS.map(async (item) => {
      const { count, error } = await client.from(item.table).select("id", { count: "exact", head: true });
      if (error) throw new Error(`Failed to count ${item.table}: ${error.message}`);
      return { ...item, count: count ?? 0 };
    }),
  );

  return (
    <>
      <PageHeader
        title="Overview"
        description="Everything on the platform that belongs to no one team."
      />

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {counts.map((item) => {
          const body = (
            <>
              <dt className="section-label">{item.label}</dt>
              <dd className="headline mt-1 text-2xl tabular-nums">{item.count}</dd>
            </>
          );
          return item.href ? (
            <Link key={item.table} href={item.href} className="card p-4 transition hover:bg-surface-raised">
              {body}
            </Link>
          ) : (
            <div key={item.table} className="card p-4">
              {body}
            </div>
          );
        })}
      </dl>

      <section className="card mt-6 p-5">
        <h2 className="headline text-lg">Coming to the console</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-muted">
          <li>Schools and teams: create a team, issue its code, invite its first captain.</li>
          <li>Fields: edit, merge and verify what teams have added.</li>
          <li>Seasons: open the next academic year for every team at once.</li>
          <li>Leagues: who is in which league, standings, results that need a second look.</li>
        </ul>
      </section>
    </>
  );
}
