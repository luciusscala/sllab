-- Nobody waits to be approved. Anyone who joins with the team code is on the
-- team and can answer events from that moment; a captain who doesn't want
-- them removes them from Members, the same as anyone else. The "new member"
-- flag, the New Members list and `review_member` go.
--
-- `membership_summary` loses `is_new`, which changes what `my_memberships`,
-- `join_team`, `continue_season`, `set_member_status` and `set_member_role`
-- return. Clients from before this migration ignore the missing field.

DROP FUNCTION public.review_member(uuid, boolean);

-- The type first, then every function that fills or reads the column, then
-- the column itself. `summarize_membership` is SQL and is checked when
-- created, so it has to match the type before anything else is replaced; the
-- plpgsql functions only look at the column when run.
ALTER TYPE public.membership_summary DROP ATTRIBUTE is_new;

CREATE OR REPLACE FUNCTION public.summarize_membership(p_membership_id uuid)
RETURNS public.membership_summary
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT m.id, t.id, t.name, t.logo_path, p.id, p.name, m.role, m.status,
         public.current_roster_id(t.id, p.id)
  FROM public.memberships m
  JOIN public.teams t ON t.id = m.team_id
  JOIN public.people p ON p.id = m.person_id
  WHERE m.id = p_membership_id
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
--   * Anyone else is a new player, on the team from this call. They need a
--     name and roster details; until those are given the call returns a row
--     with `needs_profile` set and changes nothing.
--
-- Calling it again for a team the caller is already on reactivates a member
-- who had left, applies any invite, and otherwise just returns their place.
CREATE OR REPLACE FUNCTION public.join_team(
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

    INSERT INTO public.memberships (team_id, person_id, role, status)
    VALUES (v_team, v_person, 'guest', 'active')
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
    INSERT INTO public.memberships (team_id, person_id, role, status)
    VALUES (v_team, v_person, coalesce(v_invite.role, 'player'), 'active')
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
        END
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

-- Captains only. Promoting to captain puts the person on this season's roster
-- if they weren't already; a coach is taken off it.
CREATE OR REPLACE FUNCTION public.set_member_role(p_membership_id uuid, p_role text)
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

  UPDATE public.memberships SET role = p_role WHERE id = p_membership_id;

  IF p_role = 'coach' THEN
    DELETE FROM public.roster
    WHERE id = public.current_roster_id(v_target.team_id, v_target.person_id);
  END IF;

  RETURN public.summarize_membership(p_membership_id);
END
$$;

-- Adds someone by phone number. If that number already belongs to a member of
-- the team the role applies at once; otherwise it waits for their sign-in.
-- Coaches can add players; only captains can add captains or coaches.
CREATE OR REPLACE FUNCTION public.invite_member(p_team_id uuid, p_phone text, p_role text)
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
        status = 'active'
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

ALTER TABLE public.memberships DROP COLUMN is_new;
