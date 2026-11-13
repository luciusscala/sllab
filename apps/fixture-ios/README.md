# Fixture by SLLAB

Fixture by SLLAB is the iOS app players and captains use every day. Players see the team schedule and mark whether they're going. Captains create events, see who's coming, track attendance over the season, manage who's on the team, and text reminders to the players who haven't answered.

It's part of [SLLAB](../../README.md) and is [on the App Store](https://apps.apple.com/us/app/fixture-management/id6812923949) as Fixture Management. The same features are available on the web, in [`apps/club-sites`](../club-sites).

<!-- MEDIA: screenshots of the join flow, the schedule, an event with team responses, the members screen, the message composer, and the captain dashboard -->

## Features

**Signing in**
- Enter the team code from your captain, then say whether you're on the team or just looking.
- Players sign in with their phone number and a texted code. No password. A number the team already knows is recognised and put straight back on the roster; a new one is asked for a name, position, class and number, and the captains confirm them.
- Guests get the schedule, read-only, with no number asked.
- Returning players are asked once a season whether they're playing, and can take a break or leave the team themselves.

**For players**
- See upcoming and past practices and games, with the field and a link to directions.
- Mark yourself going or not going, and see who else is.

**For captains and coaches**
- Create games and practices, including a repeating practice schedule: pick the weekdays and a date range, and every session is created at once.
- Edit or delete any event.
- See each event's responses, grouped into going, not going and no response. People who are away or have left are left out.
- Members: confirm or remove new joins, mark players away or active, see who hasn't responded to the last eight events, and add a phone number ahead of time so someone arrives already on the team with the right role. Captains can also make someone a captain or coach.
- Text a reminder to chosen players, filtered by response. Phone numbers are looked up on the server and never sent to the app.
- Track attendance across the season, counting each player only over the stretches they were on the team. Players are ranked by an issue score that weighs not responding 1.5 times more than declining, since silence is harder for a captain to plan around than a no. Each player's page lists the events they attended and the ones they missed, and why.

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

Run the tests with **Product → Test** (⌘U). They cover the models, JSON decoding, membership rules, phone number handling, active periods, availability grouping, attendance statistics and the data service.

## Project structure

```
ucsdmcs/
├── Models/       Events and their types, teams, roster, memberships, availability, attendance stats
├── Services/     Supabase client and session, website API, data service, deep links, update check
├── Views/        Screens; Join/ is signing in, Admin/ holds the captain-only ones
├── Components/   Reusable UI pieces
└── Theme/        Shared colors and spacing
ucsdmcsTests/     Unit tests
```

The Xcode project and source folder are still named `ucsdmcs`, the app's original name.

## Backend

- **Supabase Auth** signs people in by phone (SMS one-time code) or anonymously as a guest. The session lives in the Keychain and refreshes itself; the app never sees a password or a token it has to protect.
- **Supabase** stores teams, memberships, rosters, events and availability. The app reads and writes it directly as the signed-in person, and row-level security decides what each role may see and change. Joining, leaving, reviewing members and changing roles go through database functions documented in [`supabase/README.md`](../../supabase/README.md). Phone numbers live in a table the app has no access to.
- **The [SLLAB API](../api)** (`api.sllab.io`) sends SMS reminders. The app presents its Supabase access token; the API checks it belongs to a captain or coach of the team and looks the numbers up itself.
- **Universal links** are served by the website at `/.well-known/apple-app-site-association`.

Universal links move to the platform's own domain with the web team app; see the [write-up](../../docs/writeup/sllab.pdf).

## AI Disclosure

Parts of this codebase and readme were written with the help of AI. All files were reviewed by a human, but it is provided as-is, with no guarantee that it is correct, secure, or fit for any particular purpose.
