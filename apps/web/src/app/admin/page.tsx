import type { Metadata } from "next";
import Link from "next/link";

import { NoSeason } from "@/components/admin/no-season";
import { SetupNotice } from "@/components/admin/setup-notice";
import { PageHeader } from "@/components/shell/page-header";
import { requireAdmin } from "@/lib/auth";
import {
  listGames,
  listPractices,
  listRoster,
  listSeasons,
  listSocialEvents,
  listTournaments,
} from "@/lib/data/admin";
import { gameSummary } from "@/lib/data/rows";
import { formatGameDate } from "@/lib/format";
import { isAdminConfigured } from "@/lib/supabase-admin";

export const metadata: Metadata = { title: "Team dashboard" };

export default async function AdminHome() {
  const { teamId, teamName } = await requireAdmin();
  if (!isAdminConfigured()) return <SetupNotice />;

  const seasons = await listSeasons();
  const current = seasons.find((season) => season.is_current) ?? seasons[0];
  if (!current) return <NoSeason />;

  const [roster, games, practices, socials, tournaments] = await Promise.all([
    listRoster(teamId, current.id),
    listGames(teamId, current.id),
    listPractices(teamId, current.id),
    listSocialEvents(teamId, current.id),
    listTournaments(teamId, current.id),
  ]);

  const { next, awaitingResult } = gameSummary(games);
  const noNumber = roster.filter((entry) => entry.phone === null).length;

  const cards = [
    { href: "/admin/roster", label: "Roster", value: roster.length, detail: noNumber ? `${noNumber} without a number` : "All can sign in" },
    {
      href: "/admin/schedule",
      label: "Games",
      value: games.length,
      detail: next ? `Next: ${next.isHome ? "vs" : "at"} ${next.opponent}, ${formatGameDate(next.gameDate)}` : "None upcoming",
    },
    { href: "/admin/practices", label: "Practices", value: practices.length },
    { href: "/admin/socials", label: "Socials", value: socials.length },
    { href: "/admin/tournaments", label: "Tournaments", value: tournaments.length },
  ];

  return (
    <>
      <PageHeader title={`${current.year} season`} description={`${teamName}'s data: what the team app and the club site show.`} />

      {awaitingResult > 0 && (
        <Link
          href="/admin/schedule"
          className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm transition hover:bg-warning/15"
        >
          <span>
            <span className="font-semibold text-warning">
              {awaitingResult} {awaitingResult === 1 ? "game needs" : "games need"} a result.
            </span>{" "}
            <span className="text-muted">Scores feed the club site.</span>
          </span>
          <span aria-hidden="true" className="text-warning">→</span>
        </Link>
      )}

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="card p-4 transition hover:bg-surface-raised">
            <dt className="section-label">{card.label}</dt>
            <dd className="headline mt-1 text-2xl tabular-nums">{card.value}</dd>
            {card.detail && <dd className="mt-1 truncate text-xs text-muted">{card.detail}</dd>}
          </Link>
        ))}
      </dl>
    </>
  );
}
