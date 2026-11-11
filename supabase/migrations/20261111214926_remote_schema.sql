CREATE TABLE "public"."app_config" (
  "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
  "min_version" text,
  CONSTRAINT "app_config_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."app_config"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."availability" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "event_id"   uuid                     NOT NULL,
  "roster_id"  uuid                     NOT NULL,
  "status"     text                     NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "availability_event_id_roster_id_key" UNIQUE (event_id, roster_id),
  CONSTRAINT "availability_pkey" PRIMARY KEY (id),
  CONSTRAINT "availability_status_check" CHECK ((status = ANY (ARRAY['yes'::text, 'no'::text, 'maybe'::text])))
);

ALTER TABLE "public"."availability"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."events" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "season_id"  uuid                     NOT NULL,
  "event_type" text                     NOT NULL,
  "event_date" timestamp with time zone NOT NULL,
  "team_id"    uuid,
  CONSTRAINT "events_event_type_check" CHECK ((event_type = ANY (ARRAY['game'::text, 'practice'::text]))),
  CONSTRAINT "events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."fields" (
  "name"                text NOT NULL,
  "area"                text,
  "maps_address"        text,
  "picture_path"        text,
  "recommended_parking" text,
  "id"                  uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT "fields_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."fields"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."games" (
  "id"              uuid    NOT NULL DEFAULT gen_random_uuid(),
  "field_id"        uuid,
  "event_id"        uuid,
  "film_link"       text,
  "tournament_id"   uuid,
  "home_team_id"    uuid,
  "away_team_id"    uuid,
  "home_team_score" bigint,
  "away_team_score" bigint,
  "is_neutral"      boolean,
  CONSTRAINT "games_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."games"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."orgs" (
  "id"   uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  CONSTRAINT "orgs_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."orgs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."people" (
  "id"           uuid NOT NULL DEFAULT gen_random_uuid(),
  "name"         text NOT NULL,
  "hometown"     text,
  "picture_path" text,
  "phone"        text,
  CONSTRAINT "players_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."people"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."practices" (
  "id"        uuid NOT NULL DEFAULT gen_random_uuid(),
  "event_id"  uuid NOT NULL,
  "field_id"  uuid NOT NULL,
  "notes"     text,
  "film_link" text,
  CONSTRAINT "practices_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."practices"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."roster" (
  "id"        uuid    NOT NULL DEFAULT gen_random_uuid(),
  "person_id" uuid    NOT NULL,
  "season_id" uuid    NOT NULL,
  "class"     text    NOT NULL,
  "position"  text    NOT NULL,
  "number"    integer,
  "team_id"   uuid    NOT NULL,
  CONSTRAINT "player_seasons_class_check" CHECK ((class = ANY (ARRAY['Freshman'::text, 'Sophomore'::text, 'Junior'::text, 'Senior'::text, 'Graduate'::text]))),
  CONSTRAINT "player_seasons_pkey" PRIMARY KEY (id),
  CONSTRAINT "roster_team_person_season_key" UNIQUE (team_id, person_id, season_id),
  CONSTRAINT "valid_position" CHECK (("position" = ANY (ARRAY['Goalkeeper'::text, 'Defender'::text, 'Midfielder'::text, 'Forward'::text])))
);

ALTER TABLE "public"."roster"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."seasons" (
  "id"         uuid    NOT NULL DEFAULT gen_random_uuid(),
  "year"       integer NOT NULL,
  "is_current" boolean NOT NULL DEFAULT false,
  CONSTRAINT "seasons_pkey" PRIMARY KEY (id),
  CONSTRAINT "seasons_year_key" UNIQUE (year)
);

ALTER TABLE "public"."seasons"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."social_events" (
  "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
  "name"        text NOT NULL,
  "description" text,
  "event_id"    uuid,
  CONSTRAINT "social_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."social_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."sports" (
  "id"   uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  CONSTRAINT "sports_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."sports"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."teams" (
  "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
  "name"       text NOT NULL,
  "logo_path"  text,
  "data_alias" text,
  "team_code"  text,
  "admin_code" text,
  "org_id"     uuid,
  "sport_id"   uuid,
  "division"   text,
  CONSTRAINT "schools_pkey" PRIMARY KEY (id),
  CONSTRAINT "teams_division_check" CHECK ((division = ANY (ARRAY['mens'::text, 'womens'::text, 'mixed'::text]))),
  CONSTRAINT "teams_team_code_key" UNIQUE (team_code)
);

ALTER TABLE "public"."teams"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."tournaments" (
  "event_id"     uuid NOT NULL,
  "name"         text NOT NULL,
  "website_link" text,
  "location"     text,
  "field_id"     uuid,
  "id"           uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT "tournaments_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."tournaments"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."availability"
  ADD CONSTRAINT "availability_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE "public"."games"
  ADD CONSTRAINT "games_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE "public"."games"
  ADD CONSTRAINT "games_field_id_fkey" FOREIGN KEY (field_id) REFERENCES public.fields(id);

ALTER TABLE "public"."practices"
  ADD CONSTRAINT "practices_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE "public"."practices"
  ADD CONSTRAINT "practices_field_id_fkey" FOREIGN KEY (field_id) REFERENCES public.fields(id);

ALTER TABLE "public"."availability"
  ADD CONSTRAINT "availability_roster_id_fkey" FOREIGN KEY (roster_id) REFERENCES public.roster(id) ON DELETE CASCADE;

ALTER TABLE "public"."roster"
  ADD CONSTRAINT "player_seasons_player_id_fkey" FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;

ALTER TABLE "public"."events"
  ADD CONSTRAINT "events_season_id_fkey" FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;

ALTER TABLE "public"."roster"
  ADD CONSTRAINT "player_seasons_season_id_fkey" FOREIGN KEY (season_id) REFERENCES public.seasons(id) ON DELETE CASCADE;

ALTER TABLE "public"."social_events"
  ADD CONSTRAINT "social_events_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE "public"."events"
  ADD CONSTRAINT "events_team_id_fkey" FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

ALTER TABLE "public"."games"
  ADD CONSTRAINT "games_away_team_id_fkey" FOREIGN KEY (away_team_id) REFERENCES public.teams(id);

ALTER TABLE "public"."games"
  ADD CONSTRAINT "games_home_team_id_fkey" FOREIGN KEY (home_team_id) REFERENCES public.teams(id);

ALTER TABLE "public"."roster"
  ADD CONSTRAINT "roster_team_id_fkey" FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

ALTER TABLE "public"."teams"
  ADD CONSTRAINT "teams_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.orgs(id) ON DELETE CASCADE;

ALTER TABLE "public"."teams"
  ADD CONSTRAINT "teams_sport_id_fkey" FOREIGN KEY (sport_id) REFERENCES public.sports(id);

ALTER TABLE "public"."tournaments"
  ADD CONSTRAINT "tournaments_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE "public"."tournaments"
  ADD CONSTRAINT "tournaments_field_id_fkey" FOREIGN KEY (field_id) REFERENCES public.fields(id);

ALTER TABLE "public"."games"
  ADD CONSTRAINT "games_tournament_id_fkey" FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id);

CREATE UNIQUE INDEX one_current_season ON public.seasons USING btree (is_current)
  WHERE (is_current = true);

CREATE POLICY "Enable read access for all users" ON "public"."app_config"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Allow all access" ON "public"."availability"
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete" ON "public"."events"
  FOR DELETE
  TO PUBLIC
  USING (true);

CREATE POLICY "Allow insert" ON "public"."events"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "Allow update" ON "public"."events"
  FOR UPDATE
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON "public"."events"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."fields"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Allow delete" ON "public"."games"
  FOR DELETE
  TO PUBLIC
  USING (true);

CREATE POLICY "Allow insert" ON "public"."games"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "Allow update" ON "public"."games"
  FOR UPDATE
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON "public"."games"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."orgs"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Allow update" ON "public"."people"
  FOR UPDATE
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON "public"."people"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Allow delete" ON "public"."practices"
  FOR DELETE
  TO PUBLIC
  USING (true);

CREATE POLICY "Allow insert" ON "public"."practices"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "Allow update" ON "public"."practices"
  FOR UPDATE
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON "public"."practices"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."roster"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."seasons"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."social_events"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."sports"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."teams"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."tournaments"
  FOR SELECT
  TO PUBLIC
  USING (true);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."app_config" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."app_config" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."app_config" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."app_config" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."availability" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."availability" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."availability" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."availability" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."events" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."events" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."events" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."events" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."fields" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."fields" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."fields" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."fields" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."games" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."games" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."games" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."games" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."orgs" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."orgs" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."orgs" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."orgs" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."people" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."people" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."people" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."people" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."practices" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."practices" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."practices" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."practices" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."roster" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."roster" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."roster" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."roster" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."seasons" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."seasons" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."seasons" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."seasons" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."social_events" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."social_events" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."social_events" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."social_events" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sports" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."sports" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sports" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."sports" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."teams" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."teams" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."teams" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."teams" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tournaments" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."tournaments" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tournaments" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tournaments" TO "service_role";

