import { type NextRequest, NextResponse } from "next/server";

/**
 * Fixture, the team app, moved off this site to SLLAB's own domains. These
 * redirects keep every old link working:
 *
 * - app.ucsdmcs.com/<path>, ucsdmcs.com/team/<path> and ucsdmcs.com/admin/…
 *   go to the same place on app.sllab.io, so links in reminder texts already
 *   sent still land on their event.
 * - /privacy, /terms and /support were Fixture's App Store pages; they now
 *   live on sllab.io.
 *
 * Temporary redirects: a permanent one is cached by browsers indefinitely,
 * and these cost nothing to keep serving.
 */
const PLATFORM_APP = "https://app.sllab.io";

const FIXTURE_PAGES: Record<string, string> = {
  "/privacy": "https://sllab.io/fixture/privacy",
  "/terms": "https://sllab.io/fixture/terms",
  "/support": "https://sllab.io/fixture/support",
};

const within = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`);

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = (request.headers.get("host") ?? "").toLowerCase();

  if (host.startsWith("app.")) {
    return NextResponse.redirect(`${PLATFORM_APP}${pathname}${search}`, 307);
  }
  if (within(pathname, "/team")) {
    return NextResponse.redirect(`${PLATFORM_APP}${pathname.slice("/team".length) || "/"}${search}`, 307);
  }
  if (within(pathname, "/admin")) {
    return NextResponse.redirect(`${PLATFORM_APP}${pathname}${search}`, 307);
  }
  const page = FIXTURE_PAGES[pathname];
  if (page) return NextResponse.redirect(page, 307);

  return NextResponse.next();
}

export const config = {
  // Everything but Next's build output, files with an extension, and
  // /.well-known: Apple fetches app.ucsdmcs.com's association file directly
  // and refuses one behind a redirect.
  matcher: ["/((?!_next/|\\.well-known/|.*\\.[^/]*$).*)"],
};
