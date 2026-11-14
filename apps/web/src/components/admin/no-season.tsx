import { EmptyState } from "@/components/ui/empty-state";

/** Shown wherever a dashboard page needs a season and none is open. */
export function NoSeason() {
  return (
    <EmptyState
      title="No season is open"
      description="Seasons run on the academic year and SLLAB opens them for every team at once. Once one is open, its games, practices and roster live here."
    />
  );
}
