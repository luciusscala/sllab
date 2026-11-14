/**
 * Whether a nav link points at the page currently being viewed, so the header
 * can mark it. A section owns its subpaths — `/schedule/calendar` still lights
 * up Schedule — while "/" has to match exactly or it would own everything.
 */
export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * A path with its query, skipping empty values. Dashboard links carry the
 * season being viewed (`?season=2026`) alongside the drawer's `edit`/`new`,
 * so opening and closing a record never jumps to another season.
 */
export function withQuery(path: string, params: Record<string, string | number | null | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") query.set(key, String(value));
  }
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}
