-- Who runs the platform, as opposed to a team. The console at
-- app.sllab.io/console is for these people: SLLAB itself (admin) and, in
-- time, the directors of a league. A row here is granted by hand or by
-- another admin, never by signing up, and it sits beside a person's team
-- memberships rather than replacing them: an admin can still be a captain.

CREATE TABLE public.platform_roles (
  person_id  uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  role       text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES public.people(id) ON DELETE SET NULL,
  PRIMARY KEY (person_id, role),
  CONSTRAINT platform_roles_role_check CHECK (role IN ('admin', 'league_director'))
);

ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;

-- People see their own roles, which is all the console needs to decide what
-- to show. Granting and revoking happen with the secret key.
CREATE POLICY "People see their own platform roles" ON public.platform_roles
  FOR SELECT TO authenticated
  USING (person_id = public.current_person_id());

CREATE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_roles r
    WHERE r.person_id = public.current_person_id() AND r.role = 'admin'
  )
$$;

GRANT SELECT ON public.platform_roles TO authenticated;
GRANT ALL ON public.platform_roles TO service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

-- The first admin is a one-off from the SQL editor, by phone number:
--
--   INSERT INTO public.platform_roles (person_id, role)
--   SELECT c.person_id, 'admin'
--   FROM public.people_contacts c
--   WHERE c.phone = '1XXXXXXXXXX';
