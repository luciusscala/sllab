"use server";

import { type DatedResource, removeDated, saveDated } from "@/lib/admin/dated";
import { EVENT_TYPE } from "@/lib/data/events";
import { type FormState, text } from "@/lib/forms";

const PRACTICES: DatedResource = {
  table: "practices",
  type: EVENT_TYPE.practice,
  path: "/admin/practices",
  noun: "Practice",
  required: [["field_id", "Field"]],
  columns: (data) => ({
    field_id: text(data, "field_id"),
    notes: text(data, "notes"),
    film_link: text(data, "film_link"),
  }),
};

export async function savePractice(_state: FormState, data: FormData) {
  return saveDated(PRACTICES, data);
}

export async function removePractice(_state: FormState, data: FormData) {
  return removeDated(PRACTICES, data);
}
