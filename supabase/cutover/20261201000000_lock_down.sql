-- Cutover: close the open policies the App Store build relied on, and drop
-- the columns that moved to the private tables.
--
-- Run this once every client is on the accounts release and `app_config.
-- min_version` has been raised so older builds show the update screen. Move
-- it into migrations/ (keeping its timestamp later than the accounts ones)
-- and `db push --remote`. Until then it must NOT be in migrations/.

-- Anything written to the old columns during the window.
INSERT INTO public.people_contacts (person_id, phone, sms_consent)
SELECT id, public.normalize_phone(phone), true
FROM public.people
WHERE public.normalize_phone(phone) ~ '^[1-9][0-9]{7,14}$'
ON CONFLICT (phone) DO NOTHING;

INSERT INTO public.team_secrets (team_id, team_code)
SELECT id, lower(team_code) FROM public.teams WHERE team_code IS NOT NULL
ON CONFLICT (team_id) DO NOTHING;

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
