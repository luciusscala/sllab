"use client";

import { muted } from "@/components/admin/columns";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";

export type OpponentRow = { id: string; name: string; alias: string | null; logoUrl: string | null };

const COLUMNS: Column<OpponentRow>[] = [
  {
    id: "name",
    header: "Team",
    sort: (row) => row.name,
    cell: (row) => (
      <span className="flex items-center gap-3">
        {row.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- storage URL, sizes vary
          <img src={row.logoUrl} alt="" className="size-7 rounded bg-surface-raised object-contain p-0.5" />
        ) : (
          <span aria-hidden="true" className="size-7 rounded bg-surface-raised" />
        )}
        <span className="font-semibold text-foreground">{row.name}</span>
      </span>
    ),
  },
  { id: "alias", header: "Standings name", className: "hidden sm:table-cell", cell: (row) => muted(row.alias) },
  {
    id: "crest",
    header: "Crest",
    align: "right",
    sort: (row) => (row.logoUrl ? 1 : 0),
    cell: (row) => (row.logoUrl ? <Badge tone="accent">Yes</Badge> : <Badge>Missing</Badge>),
  },
];

export function OpponentsTable({ teams, newHref }: { teams: OpponentRow[]; newHref: string }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={teams}
      initialSort="name"
      searchText={(row) => `${row.name} ${row.alias ?? ""}`}
      searchPlaceholder="Search teams"
      empty={{
        title: "No other teams yet",
        description: "A game needs an opponent. Add the teams you play.",
        action: (
          <ButtonLink href={newHref} variant="primary">
            New team
          </ButtonLink>
        ),
      }}
    />
  );
}
