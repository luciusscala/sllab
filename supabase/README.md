# supabase

The single backend's source of truth: every table, database rule (row-level security
policy), function and storage bucket, as ordered migrations.

The live project is the one the apps point at (`uossjvkayfchytbycumd`). Changes are made
here as migrations and pushed, never edited by hand in the dashboard.

## First-time setup: capture the live schema

`migrations/` is empty until the live project is pulled once. This needs your Supabase
login and the project's database password (Project Settings → Database).

```sh
npx supabase@3.1.0 login
npx supabase@3.1.0 link --project-ref uossjvkayfchytbycumd
npx supabase@3.1.0 db pull --remote # writes migrations/<timestamp>_remote_schema.sql
```

The CLI is pinned to 3.1.0. From v3, database commands target the local stack unless
given `--remote`. `db pull` uses Docker to diff the schema, so Docker must be running.
When it asks to confirm writing to the hosted database, answer yes: it only records the
baseline in the migration history, so a later `db push --remote` will not recreate existing tables. Check that
`[db] major_version` in `config.toml` matches the live project's Postgres version first.

Commit the generated migration. It is the baseline: every later change is a new file.

## Day to day

```sh
npx supabase@3.1.0 start                      # local Postgres, Auth and Storage in Docker
npx supabase@3.1.0 migration new <name>       # write the change as SQL
npx supabase@3.1.0 db reset                   # rebuild local from migrations + seed.sql
npx supabase@3.1.0 db push --remote           # apply new migrations to the live project
```
