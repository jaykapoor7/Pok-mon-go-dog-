-- Applied on staging, checked there, then applied on production on 2026-11-16 (see docs/rebuild/PRODUCTION-CHANGES.md, eighth set).
--
-- Live mission workrooms. A mission's workroom (/kaju/missions/[id]) reads the mission, its steps and its events, and
-- today polls every 4 seconds while Kaju is working and every 20 seconds while it waits. With these three tables in the
-- realtime publication the workroom also refreshes the moment a step changes; the polling stays as the fallback.
--
-- Additive and safe to re-run: it only adds tables to the publication when the publication exists and the table is not
-- already in it. No table, row, policy or function changes. Realtime applies the same row-level security as a read, and
-- the existing policies already limit every row to the person who started the mission:
--   nx_missions_read        (owner_id = auth.uid())
--   nx_steps_read           (the step's mission is the reader's own)
--   nx_mission_events_read  (the event's mission is the reader's own)
-- Undo: alter publication supabase_realtime drop table public.nx_missions, public.nx_mission_steps, public.nx_mission_events;

do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then return; end if;
  foreach t in array array['nx_missions', 'nx_mission_steps', 'nx_mission_events'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
