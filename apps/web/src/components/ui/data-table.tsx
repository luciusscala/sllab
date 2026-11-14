"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";

export type Column<Row> = {
  id: string;
  header: string;
  cell: (row: Row) => ReactNode;
  /** The value to sort by; omit to make the column unsortable. */
  sort?: (row: Row) => string | number | null;
  align?: "left" | "right";
  className?: string;
};

/**
 * How every dashboard lists its records: a table that filters as you type,
 * sorts by a column when its header is clicked, and opens a row's drawer
 * when the row is clicked. Rows are plain data; the component that defines
 * the columns is the client boundary, so no functions cross from the server.
 */
export function DataTable<Row extends { id: string }>({
  columns,
  rows,
  rowHref,
  searchText,
  searchPlaceholder = "Search",
  initialSort,
  empty,
}: {
  columns: Column<Row>[];
  rows: Row[];
  /** Where a row goes when clicked, usually `?edit=<id>`. */
  rowHref?: (row: Row) => string;
  /** The text a row is matched against; omit to hide the search box. */
  searchText?: (row: Row) => string;
  searchPlaceholder?: string;
  /** The id of the column to sort by at first. */
  initialSort?: string;
  empty: { title: string; description?: string; action?: ReactNode };
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ id: string; direction: 1 | -1 } | null>(
    initialSort ? { id: initialSort, direction: 1 } : null,
  );

  const visible = useMemo(() => {
    let list = rows;
    if (query && searchText) {
      const needle = query.toLowerCase();
      list = list.filter((row) => searchText(row).toLowerCase().includes(needle));
    }
    const column = sort ? columns.find((candidate) => candidate.id === sort.id) : undefined;
    if (sort && column?.sort) {
      const value = column.sort;
      list = [...list].sort((a, b) => {
        const left = value(a);
        const right = value(b);
        if (left == null && right == null) return 0;
        if (left == null) return 1;
        if (right == null) return -1;
        return (left < right ? -1 : left > right ? 1 : 0) * sort.direction;
      });
    }
    return list;
  }, [rows, query, sort, columns, searchText]);

  if (rows.length === 0) return <EmptyState {...empty} />;

  const open = (row: Row) => {
    if (rowHref) router.push(rowHref(row), { scroll: false });
  };

  const toggleSort = (id: string) =>
    setSort((current) =>
      current?.id === id ? { id, direction: current.direction === 1 ? -1 : 1 } : { id, direction: 1 },
    );

  return (
    <div className="card overflow-hidden">
      {searchText && (
        <div className="flex items-center gap-3 border-b border-border px-3 py-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="field max-w-xs"
          />
          <span className="ml-auto text-xs text-muted tabular-nums">
            {visible.length === rows.length ? rows.length : `${visible.length} of ${rows.length}`}
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={`section-label px-3 py-2 ${column.align === "right" ? "text-right" : "text-left"} ${column.className ?? ""}`}
                >
                  {column.sort ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.id)}
                      className="inline-flex items-center gap-1 uppercase transition hover:text-foreground"
                    >
                      {column.header}
                      {sort?.id === column.id && (
                        <span aria-hidden="true">{sort.direction === 1 ? "↑" : "↓"}</span>
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.id}
                onClick={() => open(row)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") open(row);
                }}
                tabIndex={rowHref ? 0 : undefined}
                className={`border-t border-border ${
                  rowHref
                    ? "cursor-pointer transition hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:outline-none"
                    : ""
                }`}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={`px-3 py-2.5 align-middle ${column.align === "right" ? "text-right" : ""} ${column.className ?? ""}`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {visible.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted">Nothing matches “{query}”.</p>
        )}
      </div>
    </div>
  );
}
