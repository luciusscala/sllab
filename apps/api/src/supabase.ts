import { type SupabaseClient, createClient } from "@supabase/supabase-js";

import type { Env } from "./env.js";
import type { VerifyToken } from "./auth.js";

/**
 * The secret-key client. It bypasses the database's access rules, so every
 * route checks the caller's membership itself before using it.
 */
export function adminClient(env: Env): SupabaseClient {
  return createClient(new URL(env.supabaseUrl).origin, env.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Asks Supabase Auth whose access token this is. */
export function supabaseTokenVerifier(admin: SupabaseClient): VerifyToken {
  return async (token) => {
    const { data, error } = await admin.auth.getUser(token);
    return error || !data.user ? null : data.user.id;
  };
}
