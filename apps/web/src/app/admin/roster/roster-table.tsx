"use client";

import { muted } from "@/components/admin/columns";
import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { classRank, positionRank } from "@/lib/data/roster";

export type PlayerRow = {
  id: string;
  name: string;
  hometown: string | null;
  number: number | null;
  position: string;
  year: string;
  hasPhone: boolean;
};

const COLUMNS: Column<PlayerRow>[] = [
  {
    id: "number",
    header: "#",
    sort: (row) => row.number,
    className: "w-12 tabular-nums",
    cell: (row) => muted(row.number === null ? null : String(row.number)),
  },
  {
    id: "name",
    header: "Name",
    sort: (row) => row.name,
    cell: (row) => (
      <div>
        <p className="font-semibold text-foreground">{row.name}</p>
        {row.hometown && <p className="text-xs text-muted">{row.hometown}</p>}
      </div>
    ),
  },
  { id: "position", header: "Position", sort: (row) => positionRank(row.position), cell: (row) => muted(row.position) },
  {
    id: "year",
    header: "Class",
    sort: (row) => classRank(row.year),
    className: "hidden sm:table-cell",
    cell: (row) => muted(row.year),
  },
  {
    id: "phone",
    header: "Sign-in",
    align: "right",
    className: "hidden md:table-cell",
    sort: (row) => (row.hasPhone ? 1 : 0),
    cell: (row) => (row.hasPhone ? <Badge tone="accent">Number on file</Badge> : <Badge>No number</Badge>),
  },
];

export function RosterTable({ players, editPrefix }: { players: PlayerRow[]; editPrefix: string }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={players}
      initialSort="number"
      rowHref={(row) => `${editPrefix}${row.id}`}
      searchText={(row) => `${row.name} ${row.hometown ?? ""} ${row.position} ${row.number ?? ""}`}
      searchPlaceholder="Search players"
      empty={{
        title: "No one on this season's roster",
        description: "Players who join with the team code land here on their own. Add anyone who hasn't yet.",
      }}
    />
  );
}
