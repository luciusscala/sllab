# @sllab/db

Database types generated from `supabase/`, plus read queries shared by `api`, `web` and
`club-sites`. Not built yet.

Regenerate types after every migration:

```sh
npx supabase@3.1.0 gen types typescript --local > packages/db/src/database.types.ts
```

## AI Disclosure

Parts of this codebase and readme were written with the help of AI. All files were reviewed by a human, but it is provided as-is, with no guarantee that it is correct, secure, or fit for any particular purpose.
