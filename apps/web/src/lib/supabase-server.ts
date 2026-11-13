import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import "server-only";

/**
 * The signed-in person's Supabase client: the publishable key plus their
 * session from the auth cookies, so every query runs under row-level security
 * as them. This is the client the team app reads and writes with; what a
 * player, coach or guest may do is decided by the database, not by this code.
 *
 * Contrast `supabase-admin.ts`, whose secret key bypasses RLS and is kept for
 * the admin dashboard and the reminder composer's "can be texted" hint, each
 * behind its own check.
 */
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;

/** False without credentials, so a build with no `.env.local` still succeeds. */
export const isAuthConfigured = () => Boolean(url && key);

export async function supabaseUser(): Promise<SupabaseClient> {
  const store = await cookies();
  if (!url || !key) {
    throw new Error("SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY is not set.");
  }

  return createServerClient(new URL(url).origin, key, {
    cookieOptions: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        // Server Components can read cookies but not set them; a refreshed
        // token is written by `proxy.ts` on the next request instead.
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {}
      },
    },
  });
}
