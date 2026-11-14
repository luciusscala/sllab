import "server-only";

import { requireAdminClient } from "@/lib/supabase-admin";

/**
 * Uploads a form's file to a public bucket and returns the object key, or
 * null when no file was chosen. An empty file input means "keep what's
 * there", so callers only write the column when a key comes back.
 */
export async function uploadImage(data: FormData, key: string, bucket: string) {
  const value = data.get(key);
  if (!(value instanceof File) || value.size === 0) return null;

  const extension = value.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const objectKey = `${crypto.randomUUID()}.${extension}`;

  const { error } = await requireAdminClient()
    .storage.from(bucket)
    .upload(objectKey, value, { contentType: value.type, upsert: false });

  if (error) throw new Error(`Upload failed: ${error.message}`);
  return objectKey;
}
