# Fixture by SLLAB

Fixture by SLLAB is the iOS app players and captains use every day. Players see the team schedule and mark whether they're going. Captains create events, see who's coming, track attendance over the season, and text reminders to the players who haven't answered.

It's part of [SLLAB](../../README.md) and is [on the App Store](https://apps.apple.com/us/app/fixture-management/id6812923949) as Fixture Management. The same features are available on the web, in [`apps/club-sites`](../club-sites).

<!-- MEDIA: screenshots of the schedule, an event with team responses, the message composer, and the captain dashboard -->

## Features

**For players**
- Join with a team code, pick your name off the roster, and add a phone number. No account or password.
- See upcoming and past practices and games, with the field and a link to directions.
- Mark yourself going or not going, and see who else is.

**For captains**
- Create games and practices, including a repeating practice schedule: pick the weekdays and a date range, and every session is created at once.
- Edit or delete any event.
- See each event's responses, grouped into going, not going and no response.
- Text a reminder to chosen players, filtered by response. Phone numbers are looked up on the server and never sent to the app.
- Track attendance across the season. Players are ranked by an issue score that weighs not responding 1.5 times more than declining, since silence is harder for a captain to plan around than a no. Each player's page lists the events they attended and the ones they missed, and why.

**App behavior**
- Event links (`app.ucsdmcs.com/events/<id>`) open the event directly in the app.
- A minimum supported version is stored in the database. Older builds show an update screen. If the check can't reach the server, the app opens normally rather than blocking players.

## Requirements

- Xcode 26
- iOS 18.6 or later

## Getting started

1. Open `SLLAB.xcworkspace` at the repository root, or `ucsdmcs.xcodeproj` here.
2. Xcode resolves the one package dependency, [supabase-swift](https://github.com/supabase/supabase-swift), automatically.
3. Select your development team under **Signing & Capabilities**, then build and run.

Run the tests with **Product → Test** (⌘U). They cover the models, JSON decoding, availability grouping, attendance statistics and the data service.

## Project structure

```
ucsdmcs/
├── Models/       Events and their types, teams, roster, availability, attendance stats
├── Services/     Supabase client, website API, captain session, Keychain, deep links, update check
├── Views/        Screens; Admin/ holds the captain-only ones
├── Components/   Reusable UI pieces
└── Theme/        Shared colors and spacing
ucsdmcsTests/     Unit tests
```

The Xcode project and source folder are still named `ucsdmcs`, the app's original name.

## Backend

- **Supabase** stores teams, rosters, events and availability. The app reads and writes it directly.
- **The website's API** (`www.ucsdmcs.com/api`) handles the two things that need a server: unlocking captain mode, which exchanges the team's captain code for a signed token kept in the Keychain, and sending SMS reminders.
- **Universal links** are served by the website at `/.well-known/apple-app-site-association`.

Both server pieces move to the platform's own API and domain as SLLAB grows; see the [write-up](../../docs/writeup/sllab.pdf).

## AI Disclosure

Parts of this codebase and readme were written with the help of AI. All files were reviewed by a human, but it is provided as-is, with no guarantee that it is correct, secure, or fit for any particular purpose.
