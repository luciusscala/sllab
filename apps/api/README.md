# api

The platform's server: a [Hono](https://hono.dev) service, deployed on Railway.

Not built yet. Its first jobs move here from `apps/club-sites`: captain unlock
(`/api/captain/unlock`) and SMS reminders (`/api/reminders`).

## Rules

- **All platform logic lives here**: messaging, invites, roster claims, stats, payments.
  The web apps render pages and call this API; they don't hold business logic.
- **Routes are versioned from the first one** (`/v1/...`). Phones run old builds for months.
- **This is the only app with the Supabase secret key** and the Twilio and Stripe
  credentials. Callers are identified by verifying their Supabase access token.
- Simple reads and writes don't go through here: the apps call Supabase directly,
  protected by the database rules in `supabase/`.
