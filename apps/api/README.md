# SLLAB API

The platform's server, at `api.sllab.io`: a [Hono](https://hono.dev) service on Node, deployed on Railway. It does the work that needs secrets, for every client: today that's SMS reminders, sent for Fixture by SLLAB on iOS and for the team app on the web.

It's part of [SLLAB](../../README.md).

## Rules

- **All platform logic lives here**: messaging, invites, roster claims, stats, payments. The web apps render pages and call this API; they don't hold business logic.
- **Routes are versioned from the first one** (`/v1/...`). Phones run old builds for months, so a breaking change is a new version, never an edit.
- **This is the only app with the Twilio credentials**, and the place the Supabase secret key is meant to live. Callers are identified by their Supabase access token; there are no API keys or shared secrets.
- Simple reads and writes don't go through here: the apps call Supabase directly, protected by the database rules in [`supabase/`](../../supabase).

## Routes

| Route | Who | What |
|---|---|---|
| `GET /health` | Anyone | `{ "ok": true }`, for Railway's health check |
| `POST /v1/reminders` | Active captains and coaches of the team | Texts a message to chosen players |

Every route but `/health` takes `Authorization: Bearer <Supabase access token>`, the token the app and the website already hold for the signed-in person.

### `POST /v1/reminders`

```json
{ "teamId": "…", "eventId": "…", "rosterIds": ["…"], "message": "Practice at 6, field 2" }
```

Players are named by roster id, never by phone number. The API looks the numbers up itself and texts only people who are active on that team and agreed to texts. A team can send ten reminders a day. It answers `{ "sent": 2, "failed": 0 }`, or `{ "error": "…" }` with a status code:

| Status | Meaning |
|---|---|
| 400 | Missing team, bad ids, empty or over-long message, or nobody selected can be texted |
| 401 | No token, or one Supabase doesn't recognise |
| 403 | Not an active captain or coach of that team |
| 429 | The team has hit its daily limit |
| 502 | Every text failed (Twilio's reason is in the message) |

## Getting started

Requires Node 22 or later.

```sh
cd apps/api
npm install
cp .env.example .env    # fill in Supabase and Twilio
npm run dev             # http://localhost:8787, reloads on save
```

| Command | Does |
|---|---|
| `npm test` | Unit tests (Vitest). They fake Supabase and Twilio, so they need no secrets. |
| `npm run typecheck` | TypeScript, including the tests |
| `npm run build` | Compiles to `dist/` |
| `npm start` | Runs `dist/`, as Railway does |

The server refuses to start if any setting is missing, and names the ones it needs.

To try the website against a local API, set `API_URL=http://localhost:8787` in `apps/club-sites/.env.local`.

## Project structure

```
src/
├── index.ts        Starts the server: reads settings, wires Supabase and Twilio in
├── app.ts          The Hono app: routes, 404s and errors
├── env.ts          Settings, checked at start
├── auth.ts         Bearer-token middleware
├── supabase.ts     Secret-key client and token verification
├── sms.ts          Twilio sender
└── reminders/
    ├── route.ts    POST /v1/reminders: validation and the staff check
    ├── deliver.ts  The rules: message, daily limit, who gets texted, logging
    └── store.ts    The database reads and writes, behind an interface
test/               Route tests against fake dependencies
```

Anything outside the process (Supabase, Twilio, token checks) reaches the routes through `createApp(deps)`, so tests can swap in fakes.

## Deploying on Railway

1. **New project → Deploy from GitHub repo**, and pick `luciusscala/sllab`.
2. In the service's **Settings**:
   - **Root Directory**: `apps/api`
   - **Config file path**: `/apps/api/railway.json`. Railway reads this path from the repository root, not from the root directory. The file sets the build and start commands, the `/health` check, and only redeploys when `apps/api` changes.
3. Under **Variables**, add the five settings from `.env.example`. Railway sets `PORT` itself.
4. Under **Settings → Networking → Custom Domain**, add `api.sllab.io`. Railway shows a CNAME target; add that record at the DNS host for `sllab.io`. HTTPS is issued automatically.

Twilio's console should also have **Geo permissions** limited to the countries you text, and a usage alert. The [Supabase README](../../supabase/README.md) covers sign-in texts, which Supabase Auth sends with its own copy of the Twilio settings.

## AI Disclosure

Parts of this codebase and readme were written with the help of AI. All files were reviewed by a human, but it is provided as-is, with no guarantee that it is correct, secure, or fit for any particular purpose.
