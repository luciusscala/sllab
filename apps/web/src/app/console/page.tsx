import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { isPlatformAdmin } from "@/lib/platform";
import { requireAdminClient } from "@/lib/supabase-admin";

export const metadata: Metadata = { title: "Console" };

const COUNTS = [
  { table: "orgs", label: "Schools", href: "/console/schools" },
  { table: "teams", label: "Teams", href: "/console/teams" },
  { table: "fields", label: "Fields", href: "/console/fields" },
  { table: "seasons", label: "Seasons", href: "/console/seasons" },
  { table: "people", label: "People" },
];

/** Open to every console user; the layout has already checked for a platform role. */
export default async function ConsoleHome() {
  const client = requireAdminClient();
  const admin = await isPlatformAdmin();

  const counts = await Promise.all(
    COUNTS.map(async (item) => {
      const { count, error } = await client.from(item.table).select("id", { count: "exact", head: true });
      if (error) throw new Error(`Failed to count ${item.table}: ${error.message}`);
      return { ...item, count: count ?? 0 };
    }),
  );

  return (
    <>
      <PageHeader title="Overview" description="Everything on the platform that belongs to no one team." />

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {counts.map((item) => {
          const body = (
            <>
              <dt className="section-label">{item.label}</dt>
              <dd className="headline mt-1 text-2xl tabular-nums">{item.count}</dd>
            </>
          );
          return admin && item.href ? (
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
        <h2 className="headline text-lg">Bringing a team onto Fixture</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted">
          <li>Add the school under Schools, if it isn&rsquo;t there.</li>
          <li>Under Teams, add the team (or open the opponent it already is) and place it in its school.</li>
          <li>In the team&rsquo;s drawer, issue a team code and invite its first captain by phone number.</li>
          <li>Send the captain the code. When they sign in with that number and enter it, they&rsquo;re captain.</li>
        </ol>
      </section>
    </>
  );
}
