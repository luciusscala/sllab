# Fixture by SLLAB on the web

The web version of [Fixture by SLLAB](../fixture-ios), at [app.sllab.io](https://app.sllab.io): the team app and the admin dashboard every team on SLLAB uses. It also hosts the file that lets event links open in the iOS app.

It's part of [SLLAB](../../README.md). It's built with Next.js 16, React 19 and Tailwind CSS 4.

<!-- MEDIA: the schedule, an event with the availability picker, and the admin roster page, on mobile and desktop -->

## What's on it

**The team app** (`/`). Everything Fixture does on iOS: joining a team with its code, the schedule, availability, and for captains and coaches, creating games and practices (one-off or repeating), managing members and sending SMS reminders. Someone on several teams switches between them in Settings.

**The team dashboard** (`/admin`). A team's season data: the roster, the schedule and results, practices, socials and tournaments. Open to the captains and coaches of the team being viewed, with the same sign-in as the team app. Each page is a table of the records with a drawer for the one being edited (`?new`, `?edit=<id>`, alongside `?season=`), so a reload lands back on the same record. Fields and opponent teams are shared by every team, so here they can be added but not edited.

**The console** (`/console`). The records that belong to no one team: schools, teams, fields and seasons. For SLLAB, gated by a `platform_roles` row rather than a team membership. Bringing a new team onto Fixture happens here: add it, issue its team code, and invite its first captain by phone number. Removing a school, team or season is refused while anything still belongs to it, because those deletes cascade in the database.

One top bar runs across all three, with a switcher between the surfaces the signed-in person may use and their account menu.

**The universal-link file** at `/.well-known/apple-app-site-association`. Reminder texts link to `app.sllab.io/events/<id>`; with the app installed, iOS opens the event there, and everyone else gets the event page here.

A club's public site, like [ucsdmcs.com](https://www.ucsdmcs.com), is a separate deployment ([`apps/club-sites`](../club-sites)) that reads the same database. It caches for five minutes, so changes made here take up to that long to show there.

## Accounts

People sign in with their phone number (Supabase Auth texts a code), or as guests with only the team code. Each person has one membership per team with a role (guest, player, captain or coach) and a status. The roles and what each may do are set out in [`supabase/README.md`](../../supabase/README.md).

The session lives in Supabase's auth cookies, refreshed by `src/proxy.ts`. Pages and Server Actions read it through `src/lib/auth.ts` (`requireMember`, `requireStaff`, `requireCaptain`, `requireAdmin`) and query the database as the signed-in person, so row-level security decides what they see; the guards only turn a refusal into a redirect. The dashboards are the exception: they write with the secret key because they edit tables (teams, fields, seasons, team codes) that no policy opens. The team dashboard's writes sit behind `requireAdmin()` and check that each record belongs to the admin's own team; the console's sit behind `requirePlatformAdmin()`.

Phone numbers never reach the browser. The reminder composer sends roster ids to the [SLLAB API](../api) with the signed-in person's access token, the same call the iOS app makes; the API checks they're staff, looks the numbers up, texts only active members who agreed to texts, and caps a team at ten reminders a day.

## Requirements

- Node.js 20.9 or later
- A Supabase project
- For sending reminders, the [SLLAB API](../api) (production's is used by default)

## Getting started

1. Run `npm ci` in this folder.
2. Copy `.env.local.example` to `.env.local` and fill in the values. Each one is explained in the file.
3. Run `npm run dev` and open [localhost:3000](http://localhost:3000).

The app builds without a `.env.local`; pages that need data render empty instead of failing.

## Project structure

```
src/
├── app/          (team)/ the team app, admin/ the team dashboard, console/ the platform console, auth/ sign-in and sign-out actions
├── components/   brand/ the mark, shell/ the top bar and dashboard frame, ui/ primitives (buttons, fields, table, drawer, toast); fields/ and teams/ are shared by both dashboards
├── lib/          Supabase clients (per-person and admin), auth and platform roles, the API client, formatting, form helpers; admin/ the dashboards' shared writes; data/ holds all data access
└── proxy.ts      Keeps the Supabase session fresh
```

## Deploying on Vercel

1. **Add New → Project**, import `luciusscala/sllab`, and set **Root Directory** to `apps/web`.
2. Under **Environment Variables**, add the settings from `.env.local.example`.
3. Under **Domains**, add `app.sllab.io`, and add the CNAME record Vercel shows at the DNS host for `sllab.io`.

## AI Disclosure

Parts of this codebase and readme were written with the help of AI. All files were reviewed by a human, but it is provided as-is, with no guarantee that it is correct, secure, or fit for any particular purpose.
