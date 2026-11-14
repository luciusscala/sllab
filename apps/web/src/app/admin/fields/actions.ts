"use server";

import { writeField } from "@/lib/admin/shared";
import { requireAdmin } from "@/lib/auth";
import type { FormState } from "@/lib/forms";

/** A team may add a field; editing and removing shared fields happens in the console. */
export async function addField(_state: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();
  return writeField(data, { allowUpdate: false });
}
