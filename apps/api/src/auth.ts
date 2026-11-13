import { createMiddleware } from "hono/factory";

/** The Supabase user id an access token belongs to, or null if it's not valid. */
export type VerifyToken = (token: string) => Promise<string | null>;

/** What a route behind `requireUser` can read off the context. */
export type AuthEnv = { Variables: { userId: string } };

/**
 * Callers prove who they are with their Supabase access token, the same one
 * the app already holds, sent as `Authorization: Bearer <token>`. There are no
 * API keys or shared secrets: the token is the credential, and what the person
 * may do is decided per route from their memberships.
 */
export function requireUser(verify: VerifyToken) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const [scheme, token] = (c.req.header("authorization") ?? "").split(" ");
    const userId = scheme === "Bearer" && token ? await verify(token) : null;
    if (!userId) return c.json({ error: "Sign in again to continue." }, 401);

    c.set("userId", userId);
    await next();
  });
}
