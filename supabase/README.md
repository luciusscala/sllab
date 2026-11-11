# supabase

The single backend's source of truth: every table, database rule (row-level security
policy), function and storage bucket, as ordered migrations.

The live project is the one the apps point at (`uossjvkayfchytbycumd`). Changes are made
here as migrations and pushed, never edited by hand in the dashboard.

## First-time setup: capture the live schema

`migrations/` is empty until the live project is pulled once. This needs your Supabase
login and the project's database password (Project Settings → Database).

```sh
npx supabase login
npx supabase link --project-ref uossjvkayfchytbycumd
npx supabase db pull          # writes migrations/<timestamp>_remote_schema.sql
```

`db pull` uses Docker to diff the schema, so Docker Desktop must be running. Check that
`[db] major_version` in `config.toml` matches the live project's Postgres version first.

Commit the generated migration. It is the baseline: every later change is a new file.

## Day to day

```sh
npx supabase start                      # local Postgres, Auth and Storage in Docker
npx supabase migration new <name>       # write the change as SQL
npx supabase db reset                   # rebuild local from migrations + seed.sql
npx supabase db push                    # apply new migrations to the live project
```
