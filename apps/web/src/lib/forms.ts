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

/** A checkbox: present means on. */
export const checked = (data: FormData, key: string) => data.get(key) === "on";

/**
 * "Opponent and date are required." for whichever of `fields` ([name, label])
 * are blank, or null when none are.
 */
export function missing(data: FormData, fields: [string, string][]) {
  const labels = fields.filter(([key]) => !text(data, key)).map(([, label], index) =>
    index === 0 ? label : label.toLowerCase(),
  );
  if (labels.length === 0) return null;
  const list = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
  return `${list} ${labels.length === 1 ? "is" : "are"} required.`;
}

/** A database error as something a person can act on. */
export function dbMessage(error: { code?: string; message: string }) {
  if (error.code === "23503") return "Something else still refers to this, so it can't be removed.";
  if (error.code === "23505") return "One of those already exists.";
  return error.message;
}

/**
 * A typed phone as the database stores it: digits with the country code.
 * "" when blank, null when it isn't a US number.
 */
export function phoneDigits(data: FormData, key = "phone") {
  const raw = text(data, key);
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return digits;
  return null;
}
