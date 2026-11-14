"use client";

import { ButtonLink } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import type { ConsoleSchool } from "@/lib/data/console";

const COLUMNS: Column<ConsoleSchool>[] = [
  { id: "name", header: "School", sort: (row) => row.name, cell: (row) => <span className="font-semibold text-foreground">{row.name}</span> },
  { id: "teams", header: "Teams", align: "right", sort: (row) => row.teams, cell: (row) => <span className="tabular-nums text-muted">{row.teams}</span> },
];

export function SchoolsTable({ schools }: { schools: ConsoleSchool[] }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={schools}
      initialSort="name"
      rowHref={(row) => `/console/schools?edit=${row.id}`}
      searchText={(row) => row.name}
      searchPlaceholder="Search schools"
      empty={{
        title: "No schools yet",
        action: (
          <ButtonLink href="/console/schools?new=1" variant="primary">
            New school
          </ButtonLink>
        ),
      }}
    />
  );
}
