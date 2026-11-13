# SLLAB

SLLAB is a platform for running a college club sports team: schedules and availability, people and messaging, stats and standings, public club sites, and game film, all on one backend.

Club teams are run by students with no staff, and their officers change every year or two. SLLAB gives a club the logistics and polish of a staffed program, without the cost.

It started with, and is used daily by, the UC San Diego Men's Club Soccer team.

> **Write-up:** [`docs/writeup/sllab.pdf`](docs/writeup/sllab.pdf) covers the architecture, the data model, the tracking camera, and the roadmap in detail.

## What's here

| | Status | What it does |
|---|---|---|
| **[Fixture by SLLAB](apps/fixture-ios)** (iOS) | [On the App Store](https://apps.apple.com/us/app/fixture-management/id6812923949) | Players see the schedule and mark availability. Captains create events, track attendance, and text reminders. |
| **[Fixture by SLLAB](apps/web)** (web) | At [app.sllab.io](https://app.sllab.io) | Fixture in the browser, plus an admin dashboard for each team's season data. |
| **[Film by SLLAB](apps/film-ios)** (iOS) | Working prototype | Records games on a phone mounted on a motorized base that follows play using on-device detection. |
| **[Hardware by SLLAB](hardware)** | Working prototype | ESP32 firmware, a custom PCB, and 3D-printed parts for Film's pan base. |
| **[UCSDMCS by SLLAB](apps/club-sites)** (web) | Live at [ucsdmcs.com](https://www.ucsdmcs.com) | Public schedule, scores, standings, roster and tryouts. |
| **[sllab.io](apps/www)** (web) | Live | The project's own site, and Fixture's privacy policy, terms and support pages. |
| **[Detection model](ml)** | In progress | Training and Core ML export for Film's detector. |

## Layout

```
supabase/          the database: migrations, access rules, seed data
apps/
  api/             platform API: SMS reminders today, at api.sllab.io
  web/             Fixture on the web and the admin dashboard, at app.sllab.io
  club-sites/      club public sites; today, the UC San Diego site
  www/             sllab.io
  fixture-ios/     Fixture
  film-ios/        Film
packages/
  db/              shared database types and queries for the web apps (planned)
  swift/           SLLABKit, shared code for the iOS apps (planned)
hardware/          firmware, PCB, CAD for the tracking mount
ml/                detection model training and export
docs/              write-up
```

`SLLAB.xcworkspace` opens both iOS apps together.

Each folder has its own README with setup instructions. Pieces marked *planned* hold a README that defines their job, so the boundaries are fixed before the code arrives.

## Architecture

Every app reads and writes one Supabase (Postgres) project.

- **The iOS apps** read and write simple data directly, protected by the database's access rules.
- **The platform API** handles anything that needs secrets or crosses accounts, such as SMS, invites and payments.
- **The web apps** render pages from the same database.

The API's first route, SMS reminders, serves Fixture on iOS and on the web alike. More move into it as the platform grows; the write-up's roadmap covers the order.

## Principles

- **One backend.** The schema lives in `supabase/migrations` as ordered SQL files. Changes are made as migrations, never by hand in the dashboard.
- **Logic lives in the API.** Web apps render, and iOS apps call the API for anything beyond simple reads and writes. No business logic is duplicated per client.
- **New features are new tables, routes and screens, not new apps.** A new app is justified only by a new kind of user or device, the way Film needs the camera.
- **Shared records are platform-wide.** Schools, teams, crests, fields and leagues exist once, and every club points to them.

## Development

| To work on | You need |
|---|---|
| Web apps | Node.js 20.9+; then `npm ci` and `npm run dev` in the app's folder |
| iOS apps | Xcode 26; open `SLLAB.xcworkspace` |
| Database | Docker and the Supabase CLI; see [`supabase/README.md`](supabase/README.md) |
| Hardware | Arduino IDE with the ESP32 board package |
| Model | Python with `ultralytics`; see [`ml/README.md`](ml/README.md) |

CI builds and lints the web apps on every change to them.

## History

This repository was assembled in November 2026 from five earlier repositories, with their full commit history:

| Path | Former repository |
|---|---|
| `apps/fixture-ios` | `ucsd-mcs-app` |
| `apps/film-ios` | `project-2` |
| `apps/club-sites` | `ucsdmcs-website` |
| `apps/www` | `sllab.io` |
| `hardware` | `sllab-hardware` |

Older names still appear in code: Fixture's Xcode project is `ucsdmcs`, and Film's source folder is `project-2`.

## AI Disclosure

Parts of this codebase and readme were written with the help of AI. All files were reviewed by a human, but it is provided as-is, with no guarantee that it is correct, secure, or fit for any particular purpose.
