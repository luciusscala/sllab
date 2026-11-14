"use client";

import { muted, whenColumn } from "@/components/admin/columns";
import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import type { DatedCells } from "@/lib/data/rows";

export type PracticeRow = DatedCells & { id: string; field: string; notes: string | null; hasFilm: boolean };

const COLUMNS: Column<PracticeRow>[] = [
  whenColumn(),
  { id: "field", header: "Field", sort: (row) => row.field, cell: (row) => <span className="text-foreground">{row.field}</span> },
  { id: "notes", header: "Notes", className: "hidden md:table-cell", cell: (row) => muted(row.notes) },
  {
    id: "film",
    header: "Film",
    align: "right",
    className: "hidden sm:table-cell",
    cell: (row) => (row.hasFilm ? <Badge tone="accent">Film</Badge> : muted(null)),
  },
];

export function PracticesTable({ practices, editPrefix }: { practices: PracticeRow[]; editPrefix: string }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={practices}
      initialSort="when"
      rowHref={(row) => `${editPrefix}${row.id}`}
      searchText={(row) => `${row.field} ${row.notes ?? ""}`}
      searchPlaceholder="Search practices"
      empty={{
        title: "No practices this season",
        description: "Weekly practices are quickest to add from the team app, which can repeat one across the season.",
      }}
    />
  );
}
