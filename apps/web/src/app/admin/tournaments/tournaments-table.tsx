"use client";

import { muted, whenColumn } from "@/components/admin/columns";
import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import type { DatedCells } from "@/lib/data/rows";

export type TournamentRow = DatedCells & { id: string; name: string; where: string | null; hasWebsite: boolean };

const COLUMNS: Column<TournamentRow>[] = [
  whenColumn(),
  { id: "name", header: "Name", sort: (row) => row.name, cell: (row) => <span className="font-semibold text-foreground">{row.name}</span> },
  { id: "where", header: "Where", className: "hidden md:table-cell", cell: (row) => muted(row.where) },
  {
    id: "website",
    header: "Website",
    align: "right",
    className: "hidden sm:table-cell",
    cell: (row) => (row.hasWebsite ? <Badge tone="accent">Link</Badge> : muted(null)),
  },
];

export function TournamentsTable({ tournaments, editPrefix }: { tournaments: TournamentRow[]; editPrefix: string }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={tournaments}
      initialSort="when"
      rowHref={(row) => `${editPrefix}${row.id}`}
      searchText={(row) => `${row.name} ${row.where ?? ""}`}
      searchPlaceholder="Search tournaments"
      empty={{ title: "No tournaments this season" }}
    />
  );
}
