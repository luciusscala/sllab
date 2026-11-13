import { redirect } from "next/navigation";

/**
 * `redirect()` within the team app. It is the whole of app.sllab.io, so a
 * path is used as given; "" and "?…" mean its home page.
 */
export function teamRedirect(path: string): never {
  redirect(path.startsWith("/") ? path : `/${path}`);
}
