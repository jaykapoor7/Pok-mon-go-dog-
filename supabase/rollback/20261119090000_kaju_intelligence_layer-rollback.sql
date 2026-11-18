-- Rollback for supabase/migrations/20261119090000_kaju_intelligence_layer.sql
--
-- Removes only what that migration created, including the org_id column it added to kaju_model_usage (that table and
-- its rows stay). No other table, function, policy or row is touched. Saved conversations, turn logs, feedback,
-- grants and the switch row are deleted with their tables: export them first if you want to keep them.
--
-- After this runs, the app keeps working: paid inference fails closed (the eligibility function is missing, so usage
-- cannot be measured), saved conversations and ratings stop being kept, and the Insights pilot panels hide themselves.
-- Safe to run twice. One transaction: either everything is removed or nothing is.

begin;
drop function if exists public.kaju_pilot_metrics(uuid, int);
drop function if exists public.kaju_ai_owner_status();
drop function if exists public.kaju_ai_stop(text);
drop function if exists public.kaju_ai_eligibility(uuid);
drop function if exists public.kaju_ai_reserve(uuid, uuid, text, numeric, numeric, int, int);
drop function if exists public.kaju_ai_settle(uuid, text, int, int, numeric);
drop function if exists public.kaju_ai_spent(uuid, uuid);
drop function if exists public.kaju_threads_purge(int);
drop trigger if exists kaju_thread_touch on public.kaju_thread_turns;
drop function if exists public.kaju_thread_touch();
drop table if exists public.kaju_feedback;
drop table if exists public.kaju_turn_log;
drop table if exists public.kaju_thread_turns;
drop table if exists public.kaju_threads;
drop table if exists public.kaju_ai_access;
drop table if exists public.kaju_ai_reservations;
drop table if exists public.kaju_ai_control;
drop index if exists public.kaju_model_usage_org_id;
alter table public.kaju_model_usage drop column if exists org_id;
commit;
