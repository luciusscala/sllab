import type { FieldRow } from "@/components/fields/fields-table";
import type { AdminField, AdminGame } from "@/lib/data/admin";
import { formatGameDate, formatTime } from "@/lib/format";

/**
 * Turning loaded records into the plain rows the client tables take. Dates
 * are formatted here, on the server, in the team's zone.
 */

export const toFieldRow = (field: AdminField): FieldRow => ({
  id: field.id,
  name: field.name,
  area: field.area,
  address: field.maps_address,
  parking: field.recommended_parking,
  hasPhoto: field.picture_path !== null,
});

/** The date columns every dated table shares. */
export type DatedCells = {
  /** "Sat, Oct 7 · 7:00 PM" */
  when: string;
  /** Milliseconds, to sort by. */
  at: number;
  past: boolean;
};

export const datedCells = (iso: string, now = Date.now()): DatedCells => {
  const at = Date.parse(iso);
  return { when: `${formatGameDate(iso)} · ${formatTime(iso)}`, at, past: at < now };
};

/** The next game, and how many played ones still have no score. */
export function gameSummary(games: AdminGame[], now = Date.now()) {
  return {
    next: games.find((game) => Date.parse(game.gameDate) >= now),
    awaitingResult: games.filter(
      (game) => Date.parse(game.gameDate) < now && (game.ourScore === null || game.theirScore === null),
    ).length,
  };
}
