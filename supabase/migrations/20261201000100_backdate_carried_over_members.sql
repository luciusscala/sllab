-- The accounts migration recorded every member it carried over as active from
-- the moment it ran (12 November 2026). Attendance only counts events from
-- when someone was active, so every event before then was skipped for all of
-- them. They were on this season's roster all along: their first entry now
-- starts at their team's first event of the season.
--
-- Only the entries that migration wrote are touched: written by no one, the
-- same instant the membership was created, and that instant being the
-- migration's own (the earliest membership there is).
UPDATE public.membership_history h
SET changed_at = first_event.at
FROM public.memberships m,
LATERAL (
  SELECT min(e.event_date) AS at
  FROM public.events e
  JOIN public.seasons s ON s.id = e.season_id AND s.is_current
  WHERE e.team_id = m.team_id
) first_event
WHERE h.membership_id = m.id
  AND h.changed_by IS NULL
  AND h.status = 'active'
  AND h.changed_at = m.created_at
  AND m.created_at = (SELECT min(created_at) FROM public.memberships)
  AND first_event.at < h.changed_at;
