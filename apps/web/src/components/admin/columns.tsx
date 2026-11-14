"use client";

import type { Column } from "@/components/ui/data-table";
import type { DatedCells } from "@/lib/data/rows";

/** The date column every dated table leads with; past rows are dimmed. */
export function whenColumn<Row extends DatedCells>(): Column<Row> {
  return {
    id: "when",
    header: "When",
    sort: (row) => row.at,
    className: "whitespace-nowrap",
    cell: (row) => <span className={row.past ? "text-muted" : "text-foreground"}>{row.when}</span>,
  };
}

export const muted = (value: string | null) => <span className="text-muted">{value ?? "—"}</span>;
