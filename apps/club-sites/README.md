# Club Sites by SLLAB

The public websites for clubs on SLLAB. Today this is one site, UCSDMCS by SLLAB at [ucsdmcs.com](https://www.ucsdmcs.com), for the UC San Diego Men's Club Soccer team. It also holds two pieces of the platform that will move out: the web version of [Fixture by SLLAB](../fixture-ios) and the club's admin dashboard.

It's part of [SLLAB](../../README.md). It's built with Next.js 16, React 19 and Tailwind CSS 4.

<!-- MEDIA: the schedule page and the standings page, desktop and mobile -->

## What's on it

**The public site**
- **Schedule and scores**, by season: each game with the opponent's crest, home or away, the field with a directions link, and the result. A summary shows the overall record, win percentage, current streak, home and away records, and goal difference.
- **Add to calendar.** `/schedule/calendar` serves the schedule as a calendar feed, so games appear and update in players' and parents' calendars.
- **Standings** for the league division, fetched from SportsEngine's public API and cached for a day.
- **Roster**, by season, with number, position, class and hometown.
- **Tryouts**: dates, times, location, what to bring, and the registration form with a QR code.
- **Club information**: the club's description, accolades and officers on the home page, a support page, and the privacy policy and terms the App Store requires. Contact, FAQ and donation pages are placeholders for now.

**The team app** (`/team`, or `app.ucsdmcs.com`). Everything Fixture does on iOS, on the web: joining, the schedule, availability, and for captains, creating events and sending SMS reminders.

**The admin dashboard** (`/admin`). Editing the season's data: teams and crests, the roster, the schedule, practices, socials, tournaments and fields. Public pages are cached until the dashboard changes something, so most visits never touch the database.

**The iOS app's API** (`/api`). Captain unlock and SMS reminders for Fixture, plus the universal-link file at `/.well-known/apple-app-site-association`.

## Requirements

- Node.js 20.9 or later
- A Supabase project
- A Twilio Messaging Service, only for SMS reminders

## Getting started

1. Run `npm ci` in this folder.
2. Copy `.env.local.example` to `.env.local` and fill in the values. Each one is explained in the file.
3. Run `npm run dev` and open [localhost:3000](http://localhost:3000). The team app is at `localhost:3000/team` or `app.localhost:3000`.

The site builds without a `.env.local`; pages that need data render empty instead of failing.

## Project structure

```
src/
├── app/          Pages and routes: admin/ the dashboard, team/ the team app, api/ the iOS app's endpoints
├── components/   UI pieces; admin/ and team/ hold section-specific ones
├── lib/          Supabase and Twilio clients, sessions, formatting; data/ holds all data access
└── proxy.ts      Serves the team app from the app. subdomain
public/           Static images and logos
```

The package is still named `ucsdmcsc-website`, from its former repository.

## Backend

- **Supabase** stores the club's data and hosts team crests in Storage.
- **SportsEngine** provides league standings.
- **Twilio** sends SMS reminders, and handles STOP and HELP replies.

## Where this is going

This folder becomes one deployment that serves every club's public site, picking the club from the domain and rendering pages from data instead of code. The team app and admin dashboard move to the platform web app in [`apps/web`](../web), and the API moves to [`apps/api`](../api). The [write-up](../../docs/writeup/sllab.pdf) covers the plan.

## AI Disclosure

Parts of this codebase and readme were written with the help of AI. All files were reviewed by a human, but it is provided as-is, with no guarantee that it is correct, secure, or fit for any particular purpose.
