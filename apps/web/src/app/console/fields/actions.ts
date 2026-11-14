"use server";

import { deleteField, writeField } from "@/lib/admin/shared";
import type { FormState } from "@/lib/forms";
import { requirePlatformAdmin } from "@/lib/platform";

export async function saveField(_state: FormState, data: FormData): Promise<FormState> {
  await requirePlatformAdmin();
  return writeField(data, { allowUpdate: true });
}

export async function removeField(_state: FormState, data: FormData): Promise<FormState> {
  await requirePlatformAdmin();
  return deleteField(data);
}
