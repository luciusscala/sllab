# Club Sites by SLLAB

The public websites for clubs on SLLAB. Today this is one site, UCSDMCS by SLLAB at [ucsdmcs.com](https://www.ucsdmcs.com), for the UC San Diego Men's Club Soccer team. It only reads public data; the team app and the admin dashboard are [Fixture by SLLAB](../web) at [app.sllab.io](https://app.sllab.io).

It's part of [SLLAB](../../README.md). It's built with Next.js 16, React 19 and Tailwind CSS 4.

<!-- MEDIA: the schedule page and the standings page, desktop and mobile -->

## What's on it

**The public site**
- **Schedule and scores**, by season: each game with the opponent's crest, home or away, the field with a directions link, and the result. A summary shows the overall record, win percentage, current streak, home and away records, and goal difference.
- **Add to calendar.** `/schedule/calendar` serves the schedule as a calendar feed, so games appear and update in players' and parents' calendars.
- **Standings** for the league division, fetched from SportsEngine's public API and cached for a day.
- **Roster**, by season, with number, position, class and hometown.
- **Tryouts**: dates, times, location, what to bring, and the registration form with a QR code.
- **Club information**: the club's description, accolades and officers on the home page. Contact, FAQ and donation pages are placeholders for now. The footer links to Fixture's support, privacy and terms pages on [sllab.io](https://sllab.io/fixture/support).

Every database read is cached for five minutes (`src/lib/data/cache.ts`), so most visits never touch the database. Games and rosters are edited in Fixture, a separate deployment, so a change takes up to five minutes to show here.

**Redirects** (`src/proxy.ts`). Fixture used to live on this site, and old links still work: `app.ucsdmcs.com`, `/team` and `/admin` go to the same page on app.sllab.io, and `/privacy`, `/terms` and `/support` go to sllab.io/fixture.

**The universal-link file** at `/.well-known/apple-app-site-association`. Reminder texts used to link to app.ucsdmcs.com, and the iOS app still claims that domain, so those links open in the app.

## Requirements

- Node.js 20.9 or later
- A Supabase project

## Getting started

1. Run `npm ci` in this folder.
2. Copy `.env.local.example` to `.env.local` and fill in the values. Each one is explained in the file.
3. Run `npm run dev` and open [localhost:3000](http://localhost:3000).

The site builds without a `.env.local`; pages that need data render empty instead of failing.

## Project structure

```
src/
├── app/          Pages and routes
├── components/   UI pieces
├── lib/          The Supabase client, club details, formatting; data/ holds all data access
└── proxy.ts      Redirects for Fixture's old addresses
public/           Static images and logos
```

The package is still named `ucsdmcsc-website`, from its former repository.

## Backend

- **Supabase** stores the club's data and hosts team crests in Storage.
- **SportsEngine** provides league standings.

## Where this is going

This folder becomes one deployment that serves every club's public site, picking the club from the domain and rendering pages from data instead of code. The [write-up](../../docs/writeup/sllab.pdf) covers the plan.

## AI Disclosure

Parts of this codebase and readme were written with the help of AI. All files were reviewed by a human, but it is provided as-is, with no guarantee that it is correct, secure, or fit for any particular purpose.
