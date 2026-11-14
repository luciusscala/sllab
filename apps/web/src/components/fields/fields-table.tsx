"use client";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";

/** What the table needs per field, already serialisable. */
export type FieldRow = {
  id: string;
  name: string;
  area: string | null;
  address: string | null;
  parking: string | null;
  hasPhoto: boolean;
};

const COLUMNS: Column<FieldRow>[] = [
  {
    id: "name",
    header: "Field",
    sort: (row) => row.name,
    cell: (row) => (
      <div>
        <p className="font-semibold text-foreground">{row.name}</p>
        {row.area && <p className="text-xs text-muted">{row.area}</p>}
      </div>
    ),
  },
  {
    id: "address",
    header: "Address",
    className: "hidden md:table-cell",
    cell: (row) => <span className="text-muted">{row.address ?? "—"}</span>,
  },
  {
    id: "parking",
    header: "Parking",
    className: "hidden lg:table-cell",
    cell: (row) => <span className="text-muted">{row.parking ?? "—"}</span>,
  },
  {
    id: "photo",
    header: "Photo",
    align: "right",
    sort: (row) => (row.hasPhoto ? 1 : 0),
    cell: (row) => (row.hasPhoto ? <Badge tone="accent">Photo</Badge> : <Badge>None</Badge>),
  },
];

/**
 * The platform's fields. With `editPrefix` (the console) a row opens its
 * drawer; without (a team's dashboard) the list is for reference.
 */
export function FieldsTable({
  fields,
  newHref,
  editPrefix,
}: {
  fields: FieldRow[];
  newHref: string;
  editPrefix?: string;
}) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={fields}
      initialSort="name"
      rowHref={editPrefix ? (row) => `${editPrefix}${row.id}` : undefined}
      searchText={(row) => `${row.name} ${row.area ?? ""} ${row.address ?? ""}`}
      searchPlaceholder="Search fields"
      empty={{
        title: "No fields yet",
        description: "A field is anywhere a team plays or practises. One added here is available to every team.",
        action: (
          <ButtonLink href={newHref} variant="primary">
            New field
          </ButtonLink>
        ),
      }}
    />
  );
}
