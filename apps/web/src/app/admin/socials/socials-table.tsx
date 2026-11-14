"use client";

import { muted, whenColumn } from "@/components/admin/columns";
import { type Column, DataTable } from "@/components/ui/data-table";
import type { DatedCells } from "@/lib/data/rows";

export type SocialRow = DatedCells & { id: string; name: string; description: string | null };

const COLUMNS: Column<SocialRow>[] = [
  whenColumn(),
  { id: "name", header: "Name", sort: (row) => row.name, cell: (row) => <span className="font-semibold text-foreground">{row.name}</span> },
  { id: "description", header: "Details", className: "hidden md:table-cell", cell: (row) => muted(row.description) },
];

export function SocialsTable({ socials, editPrefix }: { socials: SocialRow[]; editPrefix: string }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={socials}
      initialSort="when"
      rowHref={(row) => `${editPrefix}${row.id}`}
      searchText={(row) => `${row.name} ${row.description ?? ""}`}
      searchPlaceholder="Search socials"
      empty={{ title: "No socials this season", description: "Team dinners, banquets, alumni games." }}
    />
  );
}
