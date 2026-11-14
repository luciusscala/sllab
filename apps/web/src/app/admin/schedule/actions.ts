"use server";

import { type DatedResource, removeDated, saveDated } from "@/lib/admin/dated";
import { EVENT_TYPE } from "@/lib/data/events";
import { sidesFor } from "@/lib/data/schedule";
import type { FormState } from "@/lib/forms";
import { checked, int, text } from "@/lib/forms";

/** The form speaks in "us against them", the row in home and away. */
const GAMES: DatedResource = {
  table: "games",
  type: EVENT_TYPE.game,
  path: "/admin/schedule",
  noun: "Game",
  required: [["opponent_id", "Opponent"]],
  columns: (data, teamId) => ({
    ...sidesFor(teamId, {
      opponentId: text(data, "opponent_id"),
      isHome: checked(data, "is_home"),
      ourScore: int(data, "our_score"),
      theirScore: int(data, "their_score"),
    }),
    field_id: text(data, "field_id"),
    film_link: text(data, "film_link"),
  }),
};

export async function saveGame(_state: FormState, data: FormData) {
  return saveDated(GAMES, data);
}

export async function removeGame(_state: FormState, data: FormData) {
  return removeDated(GAMES, data);
}
