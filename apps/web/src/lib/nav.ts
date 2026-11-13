/**
 * Whether a nav link points at the page currently being viewed, so the header
 * can mark it. A section owns its subpaths — `/schedule/calendar` still lights
 * up Schedule — while "/" has to match exactly or it would own everything.
 */
export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
