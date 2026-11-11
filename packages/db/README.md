# @sllab/db

Database types generated from `supabase/`, plus read queries shared by `api`, `web` and
`club-sites`. Not built yet.

Regenerate types after every migration:

```sh
npx supabase gen types typescript --local > packages/db/src/database.types.ts
```
