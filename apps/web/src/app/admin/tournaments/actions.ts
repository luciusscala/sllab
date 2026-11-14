"use server";

import { type DatedResource, removeDated, saveDated } from "@/lib/admin/dated";
import { EVENT_TYPE } from "@/lib/data/events";
import { type FormState, text } from "@/lib/forms";

const TOURNAMENTS: DatedResource = {
  table: "tournaments",
  type: EVENT_TYPE.tournament,
  path: "/admin/tournaments",
  noun: "Tournament",
  required: [["name", "Name"]],
  columns: (data) => ({
    name: text(data, "name"),
    website_link: text(data, "website_link"),
    location: text(data, "location"),
    field_id: text(data, "field_id"),
  }),
};

export async function saveTournament(_state: FormState, data: FormData) {
  return saveDated(TOURNAMENTS, data);
}

export async function removeTournament(_state: FormState, data: FormData) {
  return removeDated(TOURNAMENTS, data);
}
