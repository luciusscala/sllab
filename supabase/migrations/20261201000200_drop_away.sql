-- Away is gone. A member is either on the team or not: "inactive" already
-- meant off the reminders and the response lists while staying on the
-- roster, which is all a break needed, and two statuses that behaved the same
-- only made Settings confusing. Anyone away is inactive now, and can be
-- brought back by a captain or by rejoining with the team code.

UPDATE public.memberships SET status = 'inactive' WHERE status = 'away';
UPDATE public.membership_history SET status = 'inactive' WHERE status = 'away';

ALTER TABLE public.memberships
  DROP CONSTRAINT memberships_status_check,
  ADD CONSTRAINT memberships_status_check CHECK (status IN ('active', 'inactive'));

-- A member's own Leave Team / Rejoin, and a captain's or coach's Remove and
-- Reactivate. Staff can't touch other staff; only captains can.
CREATE OR REPLACE FUNCTION public.set_member_status(p_membership_id uuid, p_status text)
RETURNS public.membership_summary
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me     uuid := public.current_person_id();
  v_target public.memberships%ROWTYPE;
BEGIN
  IF p_status NOT IN ('active', 'inactive') THEN
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
