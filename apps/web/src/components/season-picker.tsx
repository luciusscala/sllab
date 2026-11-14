import { buttonClass } from "@/components/ui/button";
import type { Season } from "@/lib/data/season";

/**
 * Plain GET form, so switching seasons needs no JavaScript. Submits to the
 * current path, which also closes any open drawer.
 */
export function SeasonPicker({ seasons, selected }: { seasons: Season[]; selected: Season | null }) {
  if (seasons.length < 2) return null;

  return (
    <form method="get" className="flex items-center gap-1.5">
      <label htmlFor="season" className="sr-only">
        Season
      </label>
      <select id="season" name="season" defaultValue={selected?.year ?? seasons[0].year} className="field h-8 w-auto py-0">
        {seasons.map((option) => (
          <option key={option.id} value={option.year}>
            {option.year}
          </option>
        ))}
      </select>
      <button type="submit" className={buttonClass("secondary", "sm")}>
        Go
      </button>
    </form>
  );
}
