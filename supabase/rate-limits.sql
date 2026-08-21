-- ════════════════════════════════════════════════════════════════
-- Rate limiting for public writes. Serverless in-memory counters are
-- unreliable (per-instance, cold starts), so we keep a tiny Supabase-backed
-- sliding-window counter checked via a SECURITY DEFINER RPC.
--
-- Usage: check_rate_limit('<ip-or-user>', 'report', 5, 3600) → boolean.
-- Returns false when the caller is over the cap for that action/window.
-- Idempotent.
-- ════════════════════════════════════════════════════════════════

create table if not exists rate_limits (
  id         bigserial primary key,
  bucket     text not null,   -- IP (public) or user id
  action     text not null,   -- report | helper | report_content | ...
  created_at timestamptz not null default now()
);
create index if not exists rate_limits_lookup_idx
  on rate_limits (bucket, action, created_at desc);

create or replace function check_rate_limit(
  p_bucket         text,
  p_action         text,
  p_max            int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare cnt int;
begin
  if p_bucket is null or p_bucket = '' then
    return true; -- can't identify the caller → don't hard-block
  end if;

  -- Bounded cleanup: only this bucket+action's expired rows.
  delete from rate_limits
   where bucket = p_bucket and action = p_action
     and created_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into cnt
    from rate_limits
   where bucket = p_bucket and action = p_action
     and created_at > now() - make_interval(secs => p_window_seconds);

  if cnt >= p_max then
    return false;
  end if;

  insert into rate_limits (bucket, action) values (p_bucket, p_action);
  return true;
end $$;

-- Only the server (service role) should record/consume limits, but allow authed
-- too for RPC-side caps if ever needed.
grant execute on function check_rate_limit(text,text,int,int) to authenticated, service_role;

-- Direct table access stays server-only.
alter table rate_limits enable row level security;
