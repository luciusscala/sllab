"use server";

import { type DatedResource, removeDated, saveDated } from "@/lib/admin/dated";
import { EVENT_TYPE } from "@/lib/data/events";
import { type FormState, text } from "@/lib/forms";

const SOCIALS: DatedResource = {
  table: "social_events",
  type: EVENT_TYPE.social,
  path: "/admin/socials",
  noun: "Social",
  required: [["name", "Name"]],
  columns: (data) => ({ name: text(data, "name"), description: text(data, "description") }),
};

export async function saveSocial(_state: FormState, data: FormData) {
  return saveDated(SOCIALS, data);
}

export async function removeSocial(_state: FormState, data: FormData) {
  return removeDated(SOCIALS, data);
}
