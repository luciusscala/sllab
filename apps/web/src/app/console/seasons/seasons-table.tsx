"use client";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import type { ConsoleSeason } from "@/lib/data/console";

const COLUMNS: Column<ConsoleSeason>[] = [
  {
    id: "year",
    header: "Season",
    sort: (row) => -row.year,
    cell: (row) => (
      <span className="flex items-center gap-2 font-semibold text-foreground">
        {row.year}–{String(row.year + 1).slice(2)}
        {row.isCurrent && <Badge tone="accent">Current</Badge>}
      </span>
    ),
  },
  { id: "events", header: "Events", align: "right", sort: (row) => row.events, cell: (row) => <span className="tabular-nums text-muted">{row.events}</span> },
  { id: "roster", header: "Roster spots", align: "right", sort: (row) => row.rosterRows, cell: (row) => <span className="tabular-nums text-muted">{row.rosterRows}</span> },
];

export function SeasonsTable({ seasons }: { seasons: ConsoleSeason[] }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={seasons}
      initialSort="year"
      rowHref={(row) => `/console/seasons?edit=${row.id}`}
      empty={{
        title: "No seasons yet",
        description: "Every team's games, practices and roster belong to a season.",
        action: (
          <ButtonLink href="/console/seasons?new=1" variant="primary">
            New season
          </ButtonLink>
        ),
      }}
    />
  );
}
