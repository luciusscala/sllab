"use server";

import { writeTeam } from "@/lib/admin/shared";
import { requireAdmin } from "@/lib/auth";
import type { FormState } from "@/lib/forms";

/** A team may add an opponent; editing shared teams happens in the console. */
export async function addTeam(_state: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();
  return writeTeam(data, { allowUpdate: false, platform: false });
}
