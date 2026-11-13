-- Cutover: close the open policies the pre-accounts App Store build relied on,
-- and drop the columns that moved to the private tables. Builds older than the
-- accounts release stop working once this is applied.

-- Anything written to the old columns during the window. Those columns were
-- writable by anyone, so only gaps are filled: a person who already has a
-- contact keeps it, and a team keeps its code. A number added here could have
-- been put there by someone else, so the person's memberships are flagged new
-- and a captain confirms them when that number signs in.
WITH added AS (
  INSERT INTO public.people_contacts (person_id, phone, sms_consent)
  SELECT p.id, public.normalize_phone(p.phone), true
  FROM public.people p
  WHERE public.normalize_phone(p.phone) ~ '^[1-9][0-9]{7,14}$'
    AND NOT EXISTS (SELECT 1 FROM public.people_contacts c WHERE c.person_id = p.id)
  ON CONFLICT DO NOTHING
  RETURNING person_id
)
UPDATE public.memberships m
SET is_new = true
FROM added
WHERE m.person_id = added.person_id;

INSERT INTO public.team_secrets (team_id, team_code)
SELECT id, lower(team_code) FROM public.teams WHERE team_code IS NOT NULL
ON CONFLICT DO NOTHING;

-- The columns themselves.
ALTER TABLE public.people DROP COLUMN phone;
ALTER TABLE public.teams DROP COLUMN team_code;
ALTER TABLE public.teams DROP COLUMN admin_code;

-- The "anyone may" policies.
DROP POLICY "Allow all access" ON public.availability;
DROP POLICY "Allow delete" ON public.events;
DROP POLICY "Allow insert" ON public.events;
DROP POLICY "Allow update" ON public.events;
DROP POLICY "Enable read access for all users" ON public.events;
DROP POLICY "Allow delete" ON public.games;
DROP POLICY "Allow insert" ON public.games;
DROP POLICY "Allow update" ON public.games;
DROP POLICY "Allow update" ON public.people;
DROP POLICY "Allow delete" ON public.practices;
DROP POLICY "Allow insert" ON public.practices;
DROP POLICY "Allow update" ON public.practices;
DROP POLICY "Enable read access for all users" ON public.practices;
DROP POLICY "Enable read access for all users" ON public.social_events;
DROP POLICY "Enable read access for all users" ON public.tournaments;

-- What stays public is read-only: app_config, fields, games, orgs, people
-- (name, hometown, picture), roster, seasons, sports, teams.

-- Table privileges to match. The original grants gave the API roles
-- everything, TRUNCATE included.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

GRANT SELECT ON public.app_config, public.fields, public.games, public.orgs,
  public.people, public.roster, public.seasons, public.sports, public.teams,
  public.events TO anon, authenticated;

GRANT SELECT ON public.practices, public.social_events, public.tournaments,
  public.availability, public.memberships, public.membership_history,
  public.team_invites, public.reminder_log TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.events, public.games, public.practices,
  public.social_events, public.tournaments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.availability TO authenticated;
GRANT UPDATE ON public.people TO authenticated;
GRANT UPDATE, DELETE ON public.roster TO authenticated;
GRANT DELETE ON public.team_invites TO authenticated;

-- Nothing new slips through by default.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
