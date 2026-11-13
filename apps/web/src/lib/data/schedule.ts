import { one } from "@/lib/supabase";

/**
 * The `games` columns naming both sides. A game is stored as home against
 * away, not as us against an opponent, so every reader turns it around to one
 * team's point of view with `sideOf()`.
 */
export type Sides = {
  home_team_id: string;
  away_team_id: string;
  home_team_score: number | null;
  away_team_score: number | null;
};

export const SIDES = "home_team_id, away_team_id, home_team_score, away_team_score";

/**
 * Embeds both teams. `games` has two foreign keys to `teams`, so each embed
 * names the column it follows; a bare `teams(...)` would be ambiguous.
 */
export const bothTeams = (columns: string) =>
  `home_team:teams!home_team_id(${columns}), away_team:teams!away_team_id(${columns})`;

/** A game from `teamId`'s side: which end it is, who it faces, and the score. */
export function sideOf(row: Sides, teamId: string) {
  const isHome = row.home_team_id === teamId;
  return {
    isHome,
    opponentId: isHome ? row.away_team_id : row.home_team_id,
    ourScore: isHome ? row.home_team_score : row.away_team_score,
    theirScore: isHome ? row.away_team_score : row.home_team_score,
  };
}

/** The opposing team's embed, given which end `teamId` is. */
export const opponentOf = <T,>(
  row: { home_team: T | T[] | null; away_team: T | T[] | null },
  isHome: boolean,
) => one(isHome ? row.away_team : row.home_team);

/**
 * The reverse of `sideOf()`, for writes: a form says "home, against X" and
 * the row wants home and away ids. Scores are only included when given, so a
 * form without score fields doesn't blank them. Neutral venues aren't offered
 * by either form, matching the app, which always writes `is_neutral: false`.
 */
export function sidesFor(
  teamId: string,
  game: {
    opponentId: string | null;
    isHome: boolean;
    ourScore?: number | null;
    theirScore?: number | null;
  },
) {
  const [home, away] = game.isHome
    ? [teamId, game.opponentId]
    : [game.opponentId, teamId];
  const [homeScore, awayScore] = game.isHome
    ? [game.ourScore, game.theirScore]
    : [game.theirScore, game.ourScore];

  return {
    home_team_id: home,
    away_team_id: away,
    is_neutral: false,
    ...(game.ourScore !== undefined ? { home_team_score: homeScore ?? null } : {}),
    ...(game.theirScore !== undefined ? { away_team_score: awayScore ?? null } : {}),
  };
}

/** "John Muir Field, La Jolla" — the area is dropped when the field has none. */
export const fieldLabel = (field: { name: string; area: string | null }) =>
  field.area ? `${field.name}, ${field.area}` : field.name;
