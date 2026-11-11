# SLLAB

One platform for running a college club sports team: availability and schedules, people
and messaging, stats and standings, public club sites, and game film, on one backend.

## Layout

| Path | What it is | Runs on |
|---|---|---|
| `supabase/` | The database: migrations, database rules, seed data | Supabase |
| `apps/api/` | Platform logic and integrations (SMS, invites, payments) | Railway |
| `apps/web/` | Platform web app: team app, manager console, site editor | Vercel |
| `apps/club-sites/` | Every club's public site, rendered from data | Vercel |
| `apps/www/` | sllab.io marketing site | Vercel |
| `apps/fixture-ios/` | Fixture: schedule, availability, messages | App Store |
| `apps/film-ios/` | Film: record games with the tracking mount | App Store |
| `packages/db/` | Shared database types and queries (TypeScript) | — |
| `packages/swift/` | SLLABKit: shared Swift models, clients and UI | — |
| `hardware/` | Tracking mount: firmware, PCB, CAD | — |
| `ml/` | Training and export for Film's detection model | — |

`SLLAB.xcworkspace` opens both iOS apps together.

## Where things stand

The monorepo was assembled from five repos, with their history:

| Path | Former repo |
|---|---|
| `apps/fixture-ios` | `ucsd-mcs-app` |
| `apps/film-ios` | `project-2` |
| `apps/club-sites` | `ucsdmcs-website` |
| `apps/www` | `sllab.io` |
| `hardware` | `sllab-hardware` |

`apps/club-sites` is still the UCSD MCS website. It currently also holds the team app,
the admin dashboard and the iOS app's API, which move to `apps/web` and `apps/api`.
`apps/api`, `apps/web` and both packages are placeholders until then.

## Principles

- **One backend.** Every app reads and writes the same Supabase project. Schema changes
  are migrations in `supabase/`, never dashboard edits.
- **Logic lives in `api`.** Web apps render; iOS apps call Supabase directly for simple
  data and the API for anything needing secrets or crossing accounts.
- **New features are new tables, routes and screens, not new apps.** A new app is
  justified only by a new kind of user or device.
- **Shared records are platform-wide.** Schools, teams, crests, fields and leagues exist
  once and every club points to them.
