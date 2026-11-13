import { unstable_cache } from "next/cache";

/**
 * One tag covering every Supabase read the public pages make.
 *
 * One tag rather than one per table, so the whole public site can be purged
 * at once if a refresh hook is ever added.
 */
export const PUBLIC_DATA = "public-data";

/** How long a public read is served from the cache before it is re-read. */
export const PUBLIC_REVALIDATE_SECONDS = 300;

/**
 * Persists a database read across requests for five minutes.
 *
 * Without this every visitor pays their own round trip to Supabase for data
 * that changes a few times a season. With it, one request in five minutes
 * pays, and everyone else is served from the cache.
 *
 * A timer rather than a purge on write: games and rosters are edited in
 * Fixture (iOS, app.sllab.io and its admin dashboard), which is a separate
 * deployment and doesn't know this site exists. Five minutes is the most a
 * change takes to show here.
 *
 * `keyPart` is only for legibility — `unstable_cache` already keys on the
 * function's arguments, so `getGames(seasonId)` can't collide across seasons.
 */
export function cached<Args extends unknown[], Result>(
  keyPart: string,
  read: (...args: Args) => Promise<Result>,
) {
  return unstable_cache(read, [keyPart], {
    tags: [PUBLIC_DATA],
    revalidate: PUBLIC_REVALIDATE_SECONDS,
  });
}
