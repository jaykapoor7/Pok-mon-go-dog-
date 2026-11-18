-- Rollback for supabase/migrations/20261119090000_kaju_intelligence_layer.sql
--
-- Removes only what that migration created. No existing table, function, policy or row is touched; the model usage
-- ledger (kaju_model_usage) and every other Kaju table stay as they are. Saved conversations, turn logs, feedback,
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
drop function if exists public.kaju_threads_purge(int);
drop trigger if exists kaju_thread_touch on public.kaju_thread_turns;
drop function if exists public.kaju_thread_touch();
drop table if exists public.kaju_feedback;
drop table if exists public.kaju_turn_log;
drop table if exists public.kaju_thread_turns;
drop table if exists public.kaju_threads;
drop table if exists public.kaju_ai_access;
drop table if exists public.kaju_ai_control;
commit;
