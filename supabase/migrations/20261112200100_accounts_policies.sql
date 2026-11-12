-- The rules, per table, for signed-in members. Each checks membership, role
-- and status on the specific team, never just "signed in".
--
-- Policies are permissive, so until the cutover migration drops the original
-- "USING (true)" policies these sit alongside them and change nothing for the
-- old app. After the cutover they are the only way in.
--
-- Visibility: games, rosters and the public tables stay readable by anyone,
-- since the club website shows them. Practices, socials, tournaments and
-- availability are for members (guest or better).

-- ---------------------------------------------------------------------------
-- Events and their kinds
-- ---------------------------------------------------------------------------

CREATE POLICY "Members read events; games are public" ON public.events
  FOR SELECT TO anon, authenticated
  USING (event_type = 'game' OR public.is_member(team_id));

CREATE POLICY "Staff write events" ON public.events
  FOR ALL TO authenticated
  USING (public.is_staff(team_id))
  WITH CHECK (public.is_staff(team_id));

CREATE POLICY "Staff write games" ON public.games
  FOR ALL TO authenticated
  USING (public.is_staff(public.event_team(event_id)))
  WITH CHECK (public.is_staff(public.event_team(event_id)));

CREATE POLICY "Members read practices" ON public.practices
  FOR SELECT TO authenticated
  USING (public.is_member(public.event_team(event_id)));

CREATE POLICY "Staff write practices" ON public.practices
  FOR ALL TO authenticated
  USING (public.is_staff(public.event_team(event_id)))
  WITH CHECK (public.is_staff(public.event_team(event_id)));

CREATE POLICY "Members read socials" ON public.social_events
  FOR SELECT TO authenticated
  USING (public.is_member(public.event_team(event_id)));

CREATE POLICY "Staff write socials" ON public.social_events
  FOR ALL TO authenticated
  USING (public.is_staff(public.event_team(event_id)))
  WITH CHECK (public.is_staff(public.event_team(event_id)));

CREATE POLICY "Members read tournaments" ON public.tournaments
  FOR SELECT TO authenticated
  USING (public.is_member(public.event_team(event_id)));

CREATE POLICY "Staff write tournaments" ON public.tournaments
  FOR ALL TO authenticated
  USING (public.is_staff(public.event_team(event_id)))
  WITH CHECK (public.is_staff(public.event_team(event_id)));

-- ---------------------------------------------------------------------------
-- Availability
-- ---------------------------------------------------------------------------

CREATE POLICY "Members read responses" ON public.availability
  FOR SELECT TO authenticated
  USING (public.is_member(public.event_team(event_id)));

-- Only your own row, and only while you're an active player or captain.
CREATE POLICY "Players answer for themselves" ON public.availability
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_my_roster(roster_id)
    AND public.can_respond(public.event_team(event_id))
    AND public.roster_team(roster_id) = public.event_team(event_id)
  );

CREATE POLICY "Players change their answer" ON public.availability
  FOR UPDATE TO authenticated
  USING (public.is_my_roster(roster_id) AND public.can_respond(public.event_team(event_id)))
  WITH CHECK (public.is_my_roster(roster_id) AND public.can_respond(public.event_team(event_id)));

CREATE POLICY "Players withdraw their answer" ON public.availability
  FOR DELETE TO authenticated
  USING (public.is_my_roster(roster_id) AND public.can_respond(public.event_team(event_id)));

-- ---------------------------------------------------------------------------
-- People and the roster
-- ---------------------------------------------------------------------------

-- Hometown, picture: your own row, or a member of a team you run.
CREATE POLICY "People edit themselves; staff edit their players" ON public.people
  FOR UPDATE TO authenticated
  USING (
    id = public.current_person_id()
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.person_id = people.id AND public.is_staff(m.team_id)
    )
  )
  WITH CHECK (
    id = public.current_person_id()
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.person_id = people.id AND public.is_staff(m.team_id)
    )
  );

-- Number, position and class. Joining the roster goes through `join_team`.
CREATE POLICY "Staff edit the roster" ON public.roster
  FOR UPDATE TO authenticated
  USING (public.is_staff(team_id))
  WITH CHECK (public.is_staff(team_id));

CREATE POLICY "Staff remove from the roster" ON public.roster
  FOR DELETE TO authenticated
  USING (public.is_staff(team_id));

-- ---------------------------------------------------------------------------
-- Memberships
-- ---------------------------------------------------------------------------

-- Members see who else is on the team and in what role. Writes go through
-- the functions in the previous migration, which hold the rules.
CREATE POLICY "Members see the team" ON public.memberships
  FOR SELECT TO authenticated
  USING (person_id = public.current_person_id() OR public.is_member(team_id));

CREATE POLICY "Staff see status history" ON public.membership_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.id = membership_history.membership_id AND public.is_staff(m.team_id)
    )
  );

CREATE POLICY "Staff see pending invites" ON public.team_invites
  FOR SELECT TO authenticated
  USING (public.is_staff(team_id));

CREATE POLICY "Staff cancel invites" ON public.team_invites
  FOR DELETE TO authenticated
  USING (public.is_staff(team_id));

CREATE POLICY "Staff see reminders sent" ON public.reminder_log
  FOR SELECT TO authenticated
  USING (public.is_staff(team_id));

-- `people_contacts` and `team_secrets` get no policies: with RLS on and no
-- grants, the API roles can't reach them at all. Only the server's secret
-- key and the SECURITY DEFINER functions do.
