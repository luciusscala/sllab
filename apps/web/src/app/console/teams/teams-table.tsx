"use client";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";

export type TeamRow = {
  id: string;
  name: string;
  alias: string | null;
  school: string | null;
  members: number;
  hasCode: boolean;
  hasCrest: boolean;
};

const COLUMNS: Column<TeamRow>[] = [
  {
    id: "name",
    header: "Team",
    sort: (row) => row.name,
    cell: (row) => (
      <div>
        <p className="font-semibold text-foreground">{row.name}</p>
        {row.alias && <p className="text-xs text-muted">Standings: {row.alias}</p>}
      </div>
    ),
  },
  {
    id: "school",
    header: "School",
    className: "hidden md:table-cell",
    sort: (row) => row.school,
    cell: (row) => <span className="text-muted">{row.school ?? "—"}</span>,
  },
  {
    id: "fixture",
    header: "On Fixture",
    sort: (row) => row.members + (row.hasCode ? 0.5 : 0),
    cell: (row) =>
      row.members > 0 ? (
        <Badge tone="accent">{row.members} members</Badge>
      ) : row.hasCode ? (
        <Badge tone="warning">Code issued</Badge>
      ) : (
        <Badge>Opponent only</Badge>
      ),
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
      rowHref={(row) => `/console/teams?edit=${row.id}`}
      searchText={(row) => `${row.name} ${row.alias ?? ""} ${row.school ?? ""}`}
      searchPlaceholder="Search teams"
      empty={{
        title: "No teams yet",
        action: (
          <ButtonLink href="/console/teams?new=1" variant="primary">
            New team
          </ButtonLink>
        ),
      }}
    />
  );
}
