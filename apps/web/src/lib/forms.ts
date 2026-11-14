/**
 * What a Server Action behind a `ResourceForm` returns. `ok` closes the form
 * and shows the message as a toast; `error` shows beneath the fields. The
 * initial state is null. Kept free of server imports so client components
 * can share the type.
 */
export type FormState = { ok: true; message?: string } | { error: string } | null;

/** A trimmed string field, or null when blank. */
export const text = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

/** An integer field, or null when blank or not a whole number. */
export const int = (data: FormData, key: string) => {
  const value = text(data, key);
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};
