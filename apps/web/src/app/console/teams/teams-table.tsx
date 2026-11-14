"use client";

import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";

export type TeamRow = {
  id: string;
  name: string;
  alias: string | null;
  hasCrest: boolean;
  /** Active memberships: zero for a team that's only ever been an opponent. */
  members: number;
};

const COLUMNS: Column<TeamRow>[] = [
  {
    id: "name",
    header: "Team",
    sort: (row) => row.name,
    cell: (row) => (
      <div>
        <p className="font-semibold text-foreground">{row.name}</p>
        {row.alias && <p className="text-xs text-muted">League name: {row.alias}</p>}
      </div>
    ),
  },
  {
    id: "status",
    header: "On Fixture",
    sort: (row) => row.members,
    cell: (row) =>
      row.members > 0 ? <Badge tone="accent">{row.members} members</Badge> : <Badge>Opponent only</Badge>,
  },
  {
    id: "crest",
    header: "Crest",
    align: "right",
    className: "hidden sm:table-cell",
    sort: (row) => (row.hasCrest ? 1 : 0),
    cell: (row) => (row.hasCrest ? <Badge tone="accent">Yes</Badge> : <Badge>Missing</Badge>),
  },
];

export function TeamsTable({ teams }: { teams: TeamRow[] }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={teams}
      initialSort="name"
      searchText={(row) => `${row.name} ${row.alias ?? ""}`}
      searchPlaceholder="Search teams"
      empty={{ title: "No teams yet" }}
    />
  );
}
