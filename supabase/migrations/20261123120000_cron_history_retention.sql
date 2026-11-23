-- Keep pg_cron's run history for 7 days.
--
-- cron.job_run_details is the largest table in production (16 MB, ~94,000 rows on 23 Nov 2026): two jobs run every
-- minute and pg_cron keeps every run forever. On the Supabase Free plan the database limit is 500 MB, so unbounded
-- operational logs are pure waste. Seven days is enough to diagnose a failing job; failures also surface in Supabase
-- logs and the job's own effects.
--
-- Adds one cron job; changes no table, function, policy or grant. Idempotent: cron.schedule with an existing name
-- replaces that job. The first run deletes the backlog; the space is reused by Postgres (no VACUUM FULL needed).
--
-- Rollback: select cron.unschedule('purge-cron-history');

select cron.schedule(
  'purge-cron-history',
  '17 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$
);
