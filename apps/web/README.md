# Fixture by SLLAB on the web

The web version of [Fixture by SLLAB](../fixture-ios), at [app.sllab.io](https://app.sllab.io): the team app and the admin dashboard every team on SLLAB uses. It also hosts the file that lets event links open in the iOS app.

It's part of [SLLAB](../../README.md). It's built with Next.js 16, React 19 and Tailwind CSS 4.

<!-- MEDIA: the schedule, an event with the availability picker, and the admin roster page, on mobile and desktop -->

## What's on it

**The team app** (`/`). Everything Fixture does on iOS: joining a team with its code, the schedule, availability, and for captains and coaches, creating games and practices (one-off or repeating), managing members and sending SMS reminders. Someone on several teams switches between them in Settings.

**The admin dashboard** (`/admin`). Editing the season's data: teams and crests, the roster, the schedule, practices, socials, tournaments and fields. Open to the captains and coaches of the team being viewed, with the same sign-in as the team app.

**The universal-link file** at `/.well-known/apple-app-site-association`. Reminder texts link to `app.sllab.io/events/<id>`; with the app installed, iOS opens the event there, and everyone else gets the event page here.

A club's public site, like [ucsdmcs.com](https://www.ucsdmcs.com), is a separate deployment ([`apps/club-sites`](../club-sites)) that reads the same database. It caches for five minutes, so changes made here take up to that long to show there.

## Accounts

People sign in with their phone number (Supabase Auth texts a code), or as guests with only the team code. Each person has one membership per team with a role (guest, player, captain or coach) and a status. The roles and what each may do are set out in [`supabase/README.md`](../../supabase/README.md).

The session lives in Supabase's auth cookies, refreshed by `src/proxy.ts`. Pages and Server Actions read it through `src/lib/auth.ts` (`requireMember`, `requireStaff`, `requireCaptain`, `requireAdmin`) and query the database as the signed-in person, so row-level security decides what they see; the guards only turn a refusal into a redirect. The admin dashboard is the exception: it writes with the secret key, behind `requireAdmin()`, because it edits tables (opponent teams, fields) that no policy opens, and every write is scoped to the admin's own team.

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
├── app/          (team)/ the team app, admin/ the dashboard, auth/ sign-in and sign-out actions
├── components/   UI pieces; team/ and admin/ hold section-specific ones
├── lib/          Supabase clients (per-person and admin), auth, the API client, formatting; data/ holds all data access
└── proxy.ts      Keeps the Supabase session fresh
```

## Deploying on Vercel

1. **Add New → Project**, import `luciusscala/sllab`, and set **Root Directory** to `apps/web`.
2. Under **Environment Variables**, add the settings from `.env.local.example`.
3. Under **Domains**, add `app.sllab.io`, and add the CNAME record Vercel shows at the DNS host for `sllab.io`.

## AI Disclosure

Parts of this codebase and readme were written with the help of AI. All files were reviewed by a human, but it is provided as-is, with no guarantee that it is correct, secure, or fit for any particular purpose.
