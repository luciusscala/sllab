"use client";

import { muted, whenColumn } from "@/components/admin/columns";
import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import type { DatedCells } from "@/lib/data/rows";

export type GameRow = DatedCells & {
  id: string;
  opponent: string;
  isHome: boolean;
  field: string | null;
  ourScore: number | null;
  theirScore: number | null;
};

const RESULT = (row: GameRow) => {
  if (row.ourScore === null || row.theirScore === null) return null;
  if (row.ourScore > row.theirScore) return { label: "W", tone: "accent" as const };
  if (row.ourScore < row.theirScore) return { label: "L", tone: "danger" as const };
  return { label: "D", tone: "neutral" as const };
};

const COLUMNS: Column<GameRow>[] = [
  whenColumn(),
  {
    id: "match",
    header: "Match",
    sort: (row) => row.opponent,
    cell: (row) => (
      <span className="font-semibold text-foreground">
        <span className="font-normal text-muted">{row.isHome ? "vs" : "at"}</span> {row.opponent}
      </span>
    ),
  },
  { id: "field", header: "Field", className: "hidden md:table-cell", cell: (row) => muted(row.field) },
  {
    id: "score",
    header: "Score",
    align: "right",
    cell: (row) => {
      const result = RESULT(row);
      return result ? (
        <span className="inline-flex items-center gap-2 tabular-nums">
          {row.ourScore}–{row.theirScore}
          <Badge tone={result.tone}>{result.label}</Badge>
        </span>
      ) : (
        muted(null)
      );
    },
  },
];

export function GamesTable({ games, editPrefix }: { games: GameRow[]; editPrefix: string }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={games}
      initialSort="when"
      rowHref={(row) => `${editPrefix}${row.id}`}
      searchText={(row) => `${row.opponent} ${row.field ?? ""}`}
      searchPlaceholder="Search games"
      empty={{ title: "No games this season", description: "Add the season's fixtures and their results here." }}
    />
  );
}
