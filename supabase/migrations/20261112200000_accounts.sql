-- Accounts: one Supabase Auth user per person, memberships per team with a
-- role and a status, and the server-only tables that hold what used to sit in
-- public columns (phone numbers, team codes).
--
-- Additive. The old open policies stay in place until the cutover migration in
-- supabase/cutover, so the App Store build keeps working through the window.
-- Until then `teams.team_code`, `teams.admin_code` and `people.phone` remain;
-- new rows are written to the new tables and the cutover copies anything that
-- arrived in between.

-- ---------------------------------------------------------------------------
-- Phone numbers
-- ---------------------------------------------------------------------------

-- Digits only, with the US country code added to a bare ten-digit number.
-- This is the form Supabase Auth stores in `auth.users.phone` and puts in the
-- JWT's `phone` claim, so numbers can be compared with plain equality.
CREATE FUNCTION public.normalize_phone(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN raw IS NULL THEN NULL
    WHEN length(regexp_replace(raw, '\D', '', 'g')) = 10
      THEN '1' || regexp_replace(raw, '\D', '', 'g')
    ELSE nullif(regexp_replace(raw, '\D', '', 'g'), '')
  END
$$;

-- A person's number, kept apart from `people` so the row the roster page
-- embeds carries nothing private. Only the service role and the SECURITY
-- DEFINER functions below read it; no API role is granted anything.
CREATE TABLE public.people_contacts (
  person_id   uuid PRIMARY KEY REFERENCES public.people(id) ON DELETE CASCADE,
  phone       text NOT NULL UNIQUE,
  -- The tick on the sign-up screen. Reminders only go to people with it set.
  sms_consent boolean NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT people_contacts_phone_check CHECK (phone ~ '^[1-9][0-9]{7,14}$')
);

ALTER TABLE public.people_contacts ENABLE ROW LEVEL SECURITY;

-- Everyone who gave the old app a number did so for reminders.
INSERT INTO public.people_contacts (person_id, phone, sms_consent)
SELECT id, public.normalize_phone(phone), true
FROM public.people
WHERE public.normalize_phone(phone) ~ '^[1-9][0-9]{7,14}$'
ON CONFLICT (phone) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

-- The sign-in a person uses. Null for people without an account (most of the
-- roster, until they sign in) and after they delete it.
ALTER TABLE public.people
  ADD COLUMN user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Team codes
-- ---------------------------------------------------------------------------

CREATE TABLE public.team_secrets (
  team_id    uuid PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  team_code  text NOT NULL UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_secrets ENABLE ROW LEVEL SECURITY;

-- Codes are compared lower-case: the app's keyboard capitalises them, a
-- laptop's doesn't.
INSERT INTO public.team_secrets (team_id, team_code)
SELECT id, lower(team_code) FROM public.teams WHERE team_code IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Memberships
-- ---------------------------------------------------------------------------

-- One row per person per team. The role says what they can do; the status
-- says whether they are around. Captains sit on the roster and run the team;
-- coaches run it from the sideline; guests only look.
CREATE TABLE public.memberships (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  person_id  uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'player',
  status     text NOT NULL DEFAULT 'active',
  -- Set when someone joined with the code on their own. Captains clear it
  -- with Keep, or remove the member, from the New Members list.
  is_new     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT memberships_team_person_key UNIQUE (team_id, person_id),
  CONSTRAINT memberships_role_check CHECK (role IN ('guest', 'player', 'captain', 'coach')),
  CONSTRAINT memberships_status_check CHECK (status IN ('active', 'away', 'inactive'))
);

CREATE INDEX memberships_person_id_idx ON public.memberships (person_id);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- Every change of status, so attendance can count only the stretches a
-- player was actually on the team. Written by the trigger below.
CREATE TABLE public.membership_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  status        text NOT NULL,
  changed_at    timestamptz NOT NULL DEFAULT now(),
  -- The person who made the change: the member themself, or a captain.
  changed_by    uuid REFERENCES public.people(id) ON DELETE SET NULL
);

CREATE INDEX membership_history_membership_id_idx
  ON public.membership_history (membership_id, changed_at);

ALTER TABLE public.membership_history ENABLE ROW LEVEL SECURITY;

-- Staff a captain has added by phone number before that person has signed in.
-- Consumed by `join_team` when a sign-in with that number arrives. A player
-- can be pre-added the same way, which skips the New Members review.
CREATE TABLE public.team_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  phone       text NOT NULL,
  role        text NOT NULL,
  invited_by  uuid REFERENCES public.people(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  CONSTRAINT team_invites_team_phone_key UNIQUE (team_id, phone),
  CONSTRAINT team_invites_role_check CHECK (role IN ('player', 'captain', 'coach')),
  CONSTRAINT team_invites_phone_check CHECK (phone ~ '^[1-9][0-9]{7,14}$')
);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- One row per reminder a captain sends, so the server can cap a team's daily
-- volume and a captain can see what went out. Written by the server only.
CREATE TABLE public.reminder_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_id        uuid REFERENCES public.events(id) ON DELETE SET NULL,
  sent_by         uuid REFERENCES public.people(id) ON DELETE SET NULL,
  recipient_count integer NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reminder_log_team_id_idx ON public.reminder_log (team_id, created_at);

ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;

-- Everyone on this season's roster is an active member of their team, and
-- has been since the roster existed; nobody is prompted to keep or remove
-- them. People only on earlier rosters get a membership when they next sign
-- in, like anyone else returning after time away.
INSERT INTO public.memberships (team_id, person_id, role, status, is_new)
SELECT DISTINCT r.team_id, r.person_id, 'player', 'active', false
FROM public.roster r
JOIN public.seasons s ON s.id = r.season_id AND s.is_current
ON CONFLICT (team_id, person_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE TRIGGER memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER people_contacts_updated_at
  BEFORE UPDATE ON public.people_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Records who the acting user is, when there is one; the backfill above runs
-- as the migration and leaves it null.
CREATE FUNCTION public.record_membership_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.membership_history (membership_id, status, changed_by)
    VALUES (NEW.id, NEW.status, public.current_person_id());
  END IF;
  RETURN NEW;
END
$$;

-- ---------------------------------------------------------------------------
-- Who is asking
-- ---------------------------------------------------------------------------

-- The `people` row behind the current JWT, or null. SECURITY DEFINER so the
-- policies that call it don't recurse into the tables they guard.
CREATE FUNCTION public.current_person_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.people WHERE user_id = (SELECT auth.uid())
$$;

-- The caller's membership on a team: role and status, or no row.
CREATE FUNCTION public.my_membership(p_team_id uuid)
RETURNS TABLE (role text, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT m.role, m.status
  FROM public.memberships m
  WHERE m.team_id = p_team_id
    AND m.person_id = public.current_person_id()
$$;

-- Anyone on the team who hasn't left: guests included. What it takes to see
-- the practices, socials, tournaments and responses.
CREATE FUNCTION public.is_member(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.my_membership(p_team_id) m WHERE m.status <> 'inactive'
  )
$$;

-- A player or captain who is currently around: the only people who answer
-- availability. Someone marked away sees the schedule but isn't asked.
CREATE FUNCTION public.can_respond(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.my_membership(p_team_id) m
    WHERE m.role IN ('player', 'captain') AND m.status = 'active'
  )
$$;

-- Captains and coaches: everyone who runs the schedule and the roster.
CREATE FUNCTION public.is_staff(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.my_membership(p_team_id) m
    WHERE m.role IN ('captain', 'coach') AND m.status = 'active'
  )
$$;

-- Captains alone: the ones who can make other captains and add coaches.
CREATE FUNCTION public.is_captain(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.my_membership(p_team_id) m
    WHERE m.role = 'captain' AND m.status = 'active'
  )
$$;

-- The team an event belongs to, for the policies on the subtype tables.
CREATE FUNCTION public.event_team(p_event_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT team_id FROM public.events WHERE id = p_event_id
$$;

-- The team a roster row belongs to, for the availability policies.
CREATE FUNCTION public.roster_team(p_roster_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT team_id FROM public.roster WHERE id = p_roster_id
$$;

-- Whether a roster row is the caller's own.
CREATE FUNCTION public.is_my_roster(p_roster_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.roster
    WHERE id = p_roster_id AND person_id = public.current_person_id()
  )
$$;

CREATE TRIGGER memberships_record_status
  AFTER INSERT OR UPDATE OF status ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.record_membership_status();

-- Backfill the history for the memberships created above. The trigger did not
-- exist yet when they were inserted.
INSERT INTO public.membership_history (membership_id, status, changed_at)
SELECT id, status, created_at FROM public.memberships;

-- ---------------------------------------------------------------------------
-- Joining
-- ---------------------------------------------------------------------------

-- The team behind a code, for the first screen: enough to show "Join UCSD
-- Men's Club Soccer?" and nothing else. Callable before signing in.
CREATE FUNCTION public.lookup_team(p_code text)
RETURNS TABLE (id uuid, name text, logo_path text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT t.id, t.name, t.logo_path
  FROM public.team_secrets s
  JOIN public.teams t ON t.id = s.team_id
  WHERE s.team_code = lower(trim(p_code))
$$;

-- The current season's roster row for a person on a team, or null.
CREATE FUNCTION public.current_roster_id(p_team_id uuid, p_person_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT r.id
  FROM public.roster r
  JOIN public.seasons s ON s.id = r.season_id AND s.is_current
  WHERE r.team_id = p_team_id AND r.person_id = p_person_id
$$;

-- Puts a person on this season's roster. Takes the details given, or carries
-- them over from the person's most recent roster row, which is how a player
-- returns for a new season without retyping anything.
CREATE FUNCTION public.ensure_roster(
  p_team_id   uuid,
  p_person_id uuid,
  p_position  text,
  p_class     text,
  p_number    integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_season   uuid;
  v_roster   uuid;
  v_previous public.roster%ROWTYPE;
BEGIN
  SELECT id INTO v_season FROM public.seasons WHERE is_current;
  IF v_season IS NULL THEN
    RAISE EXCEPTION 'no_current_season' USING ERRCODE = 'P0001';
  END IF;

  v_roster := public.current_roster_id(p_team_id, p_person_id);
  IF v_roster IS NOT NULL THEN
    RETURN v_roster;
  END IF;

  SELECT r.* INTO v_previous
  FROM public.roster r
  JOIN public.seasons s ON s.id = r.season_id
  WHERE r.team_id = p_team_id AND r.person_id = p_person_id
  ORDER BY s.year DESC
  LIMIT 1;

  IF coalesce(p_position, v_previous.position) IS NULL
     OR coalesce(p_class, v_previous.class) IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.roster (person_id, season_id, team_id, class, position, number)
  VALUES (
    p_person_id,
    v_season,
    p_team_id,
    coalesce(p_class, v_previous.class),
    coalesce(p_position, v_previous.position),
    coalesce(p_number, v_previous.number)
  )
  RETURNING id INTO v_roster;

  RETURN v_roster;
END
$$;

-- What a client learns about its own place on a team. Returned by `join_team`
-- and `my_memberships`.
CREATE TYPE public.membership_summary AS (
  membership_id uuid,
  team_id       uuid,
  team_name     text,
  team_logo     text,
  person_id     uuid,
  person_name   text,
  role          text,
  status        text,
  is_new        boolean,
  roster_id     uuid
);

CREATE FUNCTION public.summarize_membership(p_membership_id uuid)
RETURNS public.membership_summary
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT m.id, t.id, t.name, t.logo_path, p.id, p.name, m.role, m.status, m.is_new,
         public.current_roster_id(t.id, p.id)
  FROM public.memberships m
  JOIN public.teams t ON t.id = m.team_id
  JOIN public.people p ON p.id = m.person_id
  WHERE m.id = p_membership_id
$$;

-- Every team the caller belongs to.
CREATE FUNCTION public.my_memberships()
RETURNS SETOF public.membership_summary
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (public.summarize_membership(m.id)).*
  FROM public.memberships m
  WHERE m.person_id = public.current_person_id()
  ORDER BY m.created_at
$$;

-- The whole join, in one call, after the client has signed in:
--
--   * A guest (anonymous sign-in) gets a `people` row named Guest and a guest
--     membership. Nothing is asked of them.
--   * A phone sign-in whose number matches a `people_contacts` row is that
--     person: their account is linked and they are back on the team they
--     were on. A roster spot already linked to another account can't be
--     claimed.
--   * A number a captain has pre-added gets the role from the invite.
--   * Anyone else is a new player, flagged for the captain's review. They
--     need a name and roster details; until those are given the call returns
--     a row with `needs_profile` set and changes nothing.
--
-- Calling it again for a team the caller is already on reactivates a member
-- who had left, applies any invite, and otherwise just returns their place.
CREATE FUNCTION public.join_team(
  p_code        text,
  p_name        text    DEFAULT NULL,
  p_position    text    DEFAULT NULL,
  p_class       text    DEFAULT NULL,
  p_number      integer DEFAULT NULL,
  p_sms_consent boolean DEFAULT false
)
RETURNS TABLE (needs_profile boolean, linked boolean, membership public.membership_summary)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid        uuid := (SELECT auth.uid());
  v_claims     jsonb := coalesce(auth.jwt(), '{}'::jsonb);
  v_anonymous  boolean := coalesce((v_claims ->> 'is_anonymous')::boolean, false);
  v_phone      text := public.normalize_phone(v_claims ->> 'phone');
  v_team       uuid;
  v_person     uuid;
  v_linked     boolean := false;
  v_membership public.memberships%ROWTYPE;
  v_invite     public.team_invites%ROWTYPE;
  v_role       text;
  v_roster     uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_signed_in' USING ERRCODE = '28000';
  END IF;

  SELECT s.team_id INTO v_team
  FROM public.team_secrets s
  WHERE s.team_code = lower(trim(p_code));
  IF v_team IS NULL THEN
    RAISE EXCEPTION 'invalid_code' USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_person FROM public.people WHERE user_id = v_uid;

  -- Guests ----------------------------------------------------------------
  IF v_anonymous THEN
    IF v_person IS NULL THEN
      INSERT INTO public.people (name, user_id) VALUES ('Guest', v_uid)
      RETURNING id INTO v_person;
    END IF;

    INSERT INTO public.memberships (team_id, person_id, role, status, is_new)
    VALUES (v_team, v_person, 'guest', 'active', false)
    ON CONFLICT (team_id, person_id) DO UPDATE SET status = 'active'
    RETURNING * INTO v_membership;

    RETURN QUERY SELECT false, false, public.summarize_membership(v_membership.id);
    RETURN;
  END IF;

  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'no_phone' USING ERRCODE = 'P0001';
  END IF;

  -- Link a known number to this account ------------------------------------
  IF v_person IS NULL THEN
    SELECT p.id INTO v_person
    FROM public.people_contacts c
    JOIN public.people p ON p.id = c.person_id
    WHERE c.phone = v_phone;

    IF v_person IS NOT NULL THEN
      -- A row whose account was deleted keeps no contact, so a match here is
      -- always unlinked; the guard is belt and braces.
      IF EXISTS (SELECT 1 FROM public.people WHERE id = v_person AND user_id IS NOT NULL) THEN
        RAISE EXCEPTION 'phone_in_use' USING ERRCODE = 'P0001';
      END IF;
      UPDATE public.people SET user_id = v_uid WHERE id = v_person;
      v_linked := true;
    END IF;
  END IF;

  SELECT * INTO v_invite
  FROM public.team_invites i
  WHERE i.team_id = v_team AND i.phone = v_phone AND i.accepted_at IS NULL;

  -- Someone new -----------------------------------------------------------
  IF v_person IS NULL THEN
    v_role := coalesce(v_invite.role, 'player');

    -- A coach needs only a name; a player needs roster details too.
    IF nullif(trim(coalesce(p_name, '')), '') IS NULL
       OR (v_role <> 'coach' AND (p_position IS NULL OR p_class IS NULL)) THEN
      RETURN QUERY SELECT true, false, NULL::public.membership_summary;
      RETURN;
    END IF;

    INSERT INTO public.people (name, user_id) VALUES (trim(p_name), v_uid)
    RETURNING id INTO v_person;
    INSERT INTO public.people_contacts (person_id, phone, sms_consent)
    VALUES (v_person, v_phone, p_sms_consent);
  ELSIF p_sms_consent THEN
    UPDATE public.people_contacts SET sms_consent = true WHERE person_id = v_person;
  END IF;

  -- The membership ---------------------------------------------------------
  SELECT * INTO v_membership
  FROM public.memberships m
  WHERE m.team_id = v_team AND m.person_id = v_person;

  IF v_membership.id IS NULL THEN
    INSERT INTO public.memberships (team_id, person_id, role, status, is_new)
    VALUES (v_team, v_person, coalesce(v_invite.role, 'player'), 'active', v_invite.id IS NULL)
    RETURNING * INTO v_membership;
  ELSE
    UPDATE public.memberships
    SET status = 'active',
        -- An invite never demotes: a captain pre-added as a player stays a captain.
        role = CASE
          WHEN v_invite.role = 'captain' THEN 'captain'
          WHEN v_invite.role = 'coach' AND v_membership.role IN ('guest', 'player') THEN 'coach'
          WHEN v_membership.role = 'guest' THEN 'player'
          ELSE v_membership.role
        END,
        is_new = v_membership.is_new AND v_invite.id IS NULL
    WHERE id = v_membership.id
    RETURNING * INTO v_membership;
  END IF;

  IF v_invite.id IS NOT NULL THEN
    UPDATE public.team_invites SET accepted_at = now() WHERE id = v_invite.id;
  END IF;

  -- Players and captains sit on the roster; coaches don't.
  IF v_membership.role IN ('player', 'captain') THEN
    v_roster := public.ensure_roster(v_team, v_person, p_position, p_class, p_number);
    IF v_roster IS NULL THEN
      -- Linked to a person with no roster history on this team: ask.
      RETURN QUERY SELECT true, v_linked, public.summarize_membership(v_membership.id);
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT false, v_linked, public.summarize_membership(v_membership.id);
END
$$;

-- "Are you playing this season?" — Yes. Carries the caller's roster details
-- into the current season on a team they are already a member of.
CREATE FUNCTION public.continue_season(p_team_id uuid)
RETURNS public.membership_summary
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_person     uuid := public.current_person_id();
  v_membership public.memberships%ROWTYPE;
BEGIN
  SELECT * INTO v_membership
  FROM public.memberships m
  WHERE m.team_id = p_team_id AND m.person_id = v_person;

  IF v_membership.id IS NULL OR v_membership.role NOT IN ('player', 'captain') THEN
    RAISE EXCEPTION 'not_a_player' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.memberships SET status = 'active' WHERE id = v_membership.id;
  PERFORM public.ensure_roster(p_team_id, v_person, NULL, NULL, NULL);
  RETURN public.summarize_membership(v_membership.id);
END
$$;

-- ---------------------------------------------------------------------------
-- Managing members
-- ---------------------------------------------------------------------------

-- A member's own Leave Team / Rejoin, and a captain's or coach's controls.
-- Staff can't touch other staff; only captains can.
CREATE FUNCTION public.set_member_status(p_membership_id uuid, p_status text)
RETURNS public.membership_summary
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me     uuid := public.current_person_id();
  v_target public.memberships%ROWTYPE;
BEGIN
  IF p_status NOT IN ('active', 'away', 'inactive') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_target FROM public.memberships WHERE id = p_membership_id;
  IF v_target.id IS NULL THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_target.person_id <> v_me THEN
    IF NOT public.is_staff(v_target.team_id) THEN
      RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
    END IF;
    IF v_target.role IN ('captain', 'coach') AND NOT public.is_captain(v_target.team_id) THEN
      RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.memberships SET status = p_status WHERE id = p_membership_id;
  RETURN public.summarize_membership(p_membership_id);
END
$$;

-- Captains only. Promoting to captain puts the person on this season's roster
-- if they weren't already; a coach is taken off it.
CREATE FUNCTION public.set_member_role(p_membership_id uuid, p_role text)
RETURNS public.membership_summary
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_target public.memberships%ROWTYPE;
BEGIN
  IF p_role NOT IN ('player', 'captain', 'coach') THEN
    RAISE EXCEPTION 'invalid_role' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_target FROM public.memberships WHERE id = p_membership_id;
  IF v_target.id IS NULL THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.is_captain(v_target.team_id) THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  -- The last captain can't step down and leave nobody in charge.
  IF v_target.role = 'captain' AND p_role <> 'captain' AND NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE team_id = v_target.team_id AND role = 'captain' AND status = 'active'
      AND id <> v_target.id
  ) THEN
    RAISE EXCEPTION 'last_captain' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.memberships SET role = p_role, is_new = false WHERE id = p_membership_id;

  IF p_role = 'coach' THEN
    DELETE FROM public.roster
    WHERE id = public.current_roster_id(v_target.team_id, v_target.person_id);
  END IF;

  RETURN public.summarize_membership(p_membership_id);
END
$$;

-- The New Members list: Keep clears the flag; Remove takes them off the team
-- and, since they put themselves on it, off this season's roster.
CREATE FUNCTION public.review_member(p_membership_id uuid, p_keep boolean)
RETURNS public.membership_summary
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_target public.memberships%ROWTYPE;
BEGIN
  SELECT * INTO v_target FROM public.memberships WHERE id = p_membership_id;
  IF v_target.id IS NULL THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.is_staff(v_target.team_id) THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;

  IF p_keep THEN
    UPDATE public.memberships SET is_new = false WHERE id = p_membership_id;
  ELSE
    UPDATE public.memberships SET is_new = false, status = 'inactive' WHERE id = p_membership_id;
    IF v_target.is_new THEN
      DELETE FROM public.roster
      WHERE id = public.current_roster_id(v_target.team_id, v_target.person_id);
    END IF;
  END IF;

  RETURN public.summarize_membership(p_membership_id);
END
$$;

-- Adds someone by phone number. If that number already belongs to a member of
-- the team the role applies at once; otherwise it waits for their sign-in.
-- Coaches can add players; only captains can add captains or coaches.
CREATE FUNCTION public.invite_member(p_team_id uuid, p_phone text, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_phone  text := public.normalize_phone(p_phone);
  v_person uuid;
  v_member public.memberships%ROWTYPE;
BEGIN
  IF p_role NOT IN ('player', 'captain', 'coach') THEN
    RAISE EXCEPTION 'invalid_role' USING ERRCODE = '22023';
  END IF;
  IF v_phone IS NULL OR v_phone !~ '^[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'invalid_phone' USING ERRCODE = '22023';
  END IF;
  IF NOT public.is_staff(p_team_id) THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  IF p_role <> 'player' AND NOT public.is_captain(p_team_id) THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;

  SELECT c.person_id INTO v_person FROM public.people_contacts c WHERE c.phone = v_phone;

  IF v_person IS NOT NULL THEN
    SELECT * INTO v_member
    FROM public.memberships m
    WHERE m.team_id = p_team_id AND m.person_id = v_person;
  END IF;

  IF v_member.id IS NOT NULL THEN
    UPDATE public.memberships
    SET role = CASE WHEN p_role = 'player' AND role = 'captain' THEN role ELSE p_role END,
        status = 'active',
        is_new = false
    WHERE id = v_member.id;
    IF p_role IN ('player', 'captain') THEN
      PERFORM public.ensure_roster(p_team_id, v_person, NULL, NULL, NULL);
    END IF;
    RETURN;
  END IF;

  INSERT INTO public.team_invites (team_id, phone, role, invited_by)
  VALUES (p_team_id, v_phone, p_role, public.current_person_id())
  ON CONFLICT (team_id, phone) DO UPDATE
    SET role = EXCLUDED.role, invited_by = EXCLUDED.invited_by, accepted_at = NULL;
END
$$;

-- ---------------------------------------------------------------------------
-- The account itself
-- ---------------------------------------------------------------------------

-- Deleting an account keeps the roster history: the person's name stays on
-- the seasons they played, their number and sign-in go, and every membership
-- is closed. A person with no roster history (a guest, say) is removed
-- outright. The auth user goes last, which signs every device out.
CREATE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    uuid := (SELECT auth.uid());
  v_person uuid := public.current_person_id();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_signed_in' USING ERRCODE = '28000';
  END IF;

  IF v_person IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.roster WHERE person_id = v_person) THEN
      UPDATE public.memberships SET status = 'inactive'
      WHERE person_id = v_person AND status <> 'inactive';
      DELETE FROM public.people_contacts WHERE person_id = v_person;
      UPDATE public.people SET user_id = NULL WHERE id = v_person;
    ELSE
      DELETE FROM public.people WHERE id = v_person;
    END IF;
  END IF;

  DELETE FROM auth.users WHERE id = v_uid;
END
$$;

-- ---------------------------------------------------------------------------
-- Who may call what
-- ---------------------------------------------------------------------------

-- Nothing in this file is reachable by default: PostgREST only exposes
-- functions the API roles can execute.
REVOKE ALL ON FUNCTION public.normalize_phone(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_membership_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_person_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_membership(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_respond(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_captain(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.event_team(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.roster_team(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_my_roster(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lookup_team(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_roster_id(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_roster(uuid, uuid, text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.summarize_membership(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_memberships() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_team(text, text, text, text, integer, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.continue_season(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_member_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_member_role(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_member(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invite_member(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;

-- The policies call these as whichever role is querying.
GRANT EXECUTE ON FUNCTION public.current_person_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_membership(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_member(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_respond(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_captain(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.event_team(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.roster_team(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_my_roster(uuid) TO anon, authenticated, service_role;

-- The first screen, before sign-in.
GRANT EXECUTE ON FUNCTION public.lookup_team(text) TO anon, authenticated, service_role;

-- Everything else needs a session.
GRANT EXECUTE ON FUNCTION public.my_memberships() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_team(text, text, text, text, integer, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.continue_season(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_member_status(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_member_role(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.review_member(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.invite_member(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated, service_role;

-- The server's own tools.
GRANT EXECUTE ON FUNCTION public.normalize_phone(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.summarize_membership(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.current_roster_id(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_roster(uuid, uuid, text, text, integer) TO service_role;

-- The new tables: the API roles get exactly what the policies in the next
-- migration allow, and nothing on the two private ones.
GRANT SELECT ON public.memberships TO authenticated;
GRANT SELECT ON public.membership_history TO authenticated;
GRANT SELECT, DELETE ON public.team_invites TO authenticated;
GRANT SELECT ON public.reminder_log TO authenticated;
GRANT ALL ON public.people_contacts, public.team_secrets, public.memberships,
  public.membership_history, public.team_invites, public.reminder_log TO service_role;
