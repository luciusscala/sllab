import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Keeps the Supabase session alive. Access tokens last an hour; when one has
 * expired the client here refreshes it and the new cookies ride out on the
 * response, which Server Components (which can't set cookies) rely on. Does
 * nothing when there is no session or no configuration.
 */
export default async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || request.cookies.getAll().length === 0) return response;

  const supabase = createServerClient(new URL(url).origin, key, {
    cookieOptions: { sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // The call is for its side effect: a refresh when the token has lapsed.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Everything but Next's build output, files with an extension, and
  // /.well-known, which Apple fetches with no session to refresh.
  matcher: ["/((?!_next/|\\.well-known/|.*\\.[^/]*$).*)"],
};
