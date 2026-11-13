/**
 * The membership vocabulary, matching the database's check constraints.
 * Kept apart from `auth.ts` (server-only) so client components can label
 * roles and statuses.
 */
export type Role = "guest" | "player" | "captain" | "coach";
export type Status = "active" | "away" | "inactive";

export const ROLE_LABEL: Record<Role, string> = {
  guest: "Guest",
  player: "Player",
  captain: "Captain",
  coach: "Coach",
};

export const STATUS_LABEL: Record<Status, string> = {
  active: "Active",
  away: "Away",
  inactive: "Left",
};
