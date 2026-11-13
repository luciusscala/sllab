# supabase

The single backend's source of truth: every table, database rule (row-level security
policy), function and storage bucket, as ordered migrations.

The live project is the one the apps point at (`uossjvkayfchytbycumd`). Changes are made
here as migrations and pushed, never edited by hand in the dashboard.

## Layout

```
config.toml        Auth, API and local-stack settings; pushed with `config push`
migrations/        The schema, oldest first. The first file is the live baseline.
```

## Accounts

People sign in with their phone number (a one-time code by SMS) or, as guests, with no
sign-in at all beyond a team code. Each person has one account and one `memberships`
row per team, with a **role** (`guest`, `player`, `captain`, `coach`) and a **status**
(`active`, `away`, `inactive`). Every rule checks the membership on the specific team.

What a client calls, all `SECURITY DEFINER` functions reachable through PostgREST's
`rpc`:

| Function | Who | Does |
|---|---|---|
| `lookup_team(code)` | anyone | The team's name and crest for a code, nothing else |
| `join_team(code, name?, position?, class?, number?, sms_consent?)` | signed in | The whole join: guest, returning player by phone match, invited staff, or new player. Returns `needs_profile` when it needs the optional arguments |
| `my_memberships()` | signed in | The caller's teams, roles and current roster rows |
| `continue_season(team)` | player | "Yes, I'm playing this season": carries last season's roster row forward |
| `set_member_status(membership, status)` | self, or staff | Leave, rejoin, mark away. Staff can't touch other staff; captains can |
| `set_member_role(membership, role)` | captain | Promote to captain, add or remove a coach |
| `review_member(membership, keep)` | staff | The New Members list: Keep or Remove |
| `invite_member(team, phone, role)` | staff (captains for staff roles) | Pre-add by number; the role applies when that number signs in |
| `delete_my_account()` | signed in | Keeps roster history, drops the number and the sign-in, closes memberships |

Phone numbers live in `people_contacts` and team codes in `team_secrets`. Neither is
readable through the API; only the functions above and the server's secret key reach
them. Numbers are stored as digits with the country code (`14155550100`), the form
Supabase Auth uses, so a JWT's `phone` claim matches with plain equality.

`membership_history` records every status change, so attendance can count only the
stretches a player was active. `reminder_log` records each reminder a captain sends,
which is how the server caps a team's daily volume.

## First-time setup

This needs your Supabase login and the project's database password (Project Settings →
Database).

```sh
npx supabase@3.1.0 login
npx supabase@3.1.0 link --project-ref uossjvkayfchytbycumd
```

The CLI is pinned to 3.1.0. From v3, database commands target the local stack unless
given `--remote`.

### Secrets

`config.toml` reads these from the environment; the CLI also loads a `supabase/.env`
file, which is git-ignored. None of them belong in the repo.

| Variable | From |
|---|---|
| `SUPABASE_AUTH_SMS_TWILIO_ACCOUNT_SID` | Twilio console home |
| `SUPABASE_AUTH_SMS_TWILIO_MESSAGE_SERVICE_SID` | The Messaging Service (MG…) that sends the codes |
| `SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN` | Twilio console home |
| `SUPABASE_AUTH_CAPTCHA_SECRET` | Only if `[auth.captcha]` is enabled |

For App Review, set a test phone number and code under Authentication → Providers →
Phone in the dashboard (the `[auth.sms.test_otp]` block, kept out of the repo) and put
both in the review notes.

## Day to day

```sh
npx supabase@3.1.0 start                      # local Postgres, Auth and PostgREST in Docker
npx supabase@3.1.0 migration new <name>       # write the change as SQL
npx supabase@3.1.0 db reset                   # rebuild local from migrations + seed.sql
npx supabase@3.1.0 db push --remote           # apply new migrations to the live project
npx supabase@3.1.0 config push                # apply config.toml (auth settings) to the live project
```

Before any migration that changes existing rows, take a restore point:

```sh
npx supabase@3.1.0 db dump --remote -f backup/schema.sql
npx supabase@3.1.0 db dump --remote --data-only -f backup/data.sql
```

## Cutover

The accounts migrations were additive: the new tables, functions and policies sat
alongside the original open policies, so the App Store build kept working while the
accounts release rolled out. `20261201000000_lock_down.sql` ended that window. It drops
the open policies and the columns that moved (`people.phone`, `teams.team_code`,
`teams.admin_code`), and trims the API roles' table privileges to what the policies
allow. Builds from before the accounts release no longer work against this schema.

## AI Disclosure

Parts of this codebase and readme were written with the help of AI. All files were reviewed by a human, but it is provided as-is, with no guarantee that it is correct, secure, or fit for any particular purpose.
