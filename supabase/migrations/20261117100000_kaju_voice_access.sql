-- Kaju Voice for real StrayPaw accounts (production). Applies on top of
-- 20261115145414_kaju_voice_preview_sessions.sql: staging already has that;
-- production gets both, in order. Safe to re-run.
--
-- Changes from the preview:
--   * Access is a list of account IDs (kaju_voice_access), not email
--     addresses read from the JWT. The owner adds a row per account with the
--     SQL editor or service role; nobody signed in can read or change it.
--   * Deleting an account deletes its voice access and session rows. The
--     preview's foreign key had no ON DELETE and would block account deletion.
--   * kaju_voice_reserve / kaju_voice_update keep their names, arguments and
--     results, so the application is unchanged; both now check the ID list.
-- Still standalone scope only. Organisation or programme permissions, and
-- any usage accounting beyond these grants, are separate later work.

create table if not exists public.kaju_voice_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  note text check (note is null or length(note) <= 200)
);
alter table public.kaju_voice_access enable row level security;
revoke all on public.kaju_voice_access from public, anon, authenticated;
comment on table public.kaju_voice_access is 'Accounts allowed to start Kaju Voice. Server-managed: no client grants and no policies.';

-- Carry the preview's confirmed tester emails over to account IDs, then retire
-- the email list (below, once nothing reads it).
do $$
begin
  if to_regclass('public.kaju_voice_testers') is not null then
    insert into public.kaju_voice_access (user_id, note)
    select u.id, 'carried over from the preview tester list'
    from auth.users u join public.kaju_voice_testers t on t.email = lower(u.email)
    where u.email_confirmed_at is not null
    on conflict (user_id) do nothing;
  end if;
end $$;

alter table public.kaju_voice_sessions drop constraint if exists kaju_voice_sessions_user_id_fkey;
alter table public.kaju_voice_sessions add constraint kaju_voice_sessions_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- Narrow privileged operations: callers still have no INSERT/UPDATE grants.
create or replace function public.kaju_voice_reserve(p_version integer) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_user uuid := auth.uid();
begin
  if v_user is null or not exists (select 1 from public.kaju_voice_access where user_id = v_user)
  then raise exception 'VOICE_ACCESS_DENIED' using errcode = '42501'; end if;
  if p_version is null or p_version < 1 then raise exception 'Invalid voice version'; end if;
  perform pg_advisory_xact_lock(hashtextextended('kaju-voice:' || v_user::text, 0));
  if (select count(*) from public.kaju_voice_sessions where user_id=v_user and created_at > now()-interval '1 minute') >= 5
    or (select count(*) from public.kaju_voice_sessions where user_id=v_user and created_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC') >= 20
  then raise exception 'VOICE_LIMIT'; end if;
  insert into public.kaju_voice_sessions(user_id,scope_id,agent_version) values(v_user,v_user,p_version) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.kaju_voice_reserve(integer) from public, anon;
grant execute on function public.kaju_voice_reserve(integer) to authenticated;

create or replace function public.kaju_voice_update(p_id uuid default null,p_event text default null,p_reference text default null,p_flags jsonb default '{}'::jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_count integer;
begin
  if v_user is null or not exists (select 1 from public.kaju_voice_access where user_id = v_user)
  then raise exception 'VOICE_ACCESS_DENIED' using errcode = '42501'; end if;
  if p_reference is not null and (length(p_reference)<1 or length(p_reference)>256) then return false; end if;
  if p_event='issued' and p_id is not null and p_reference is not null then
    update public.kaju_voice_sessions set status='issued',reference_id=p_reference where id=p_id and user_id=v_user and status='reserved';
  elsif p_event='failed' and p_id is not null then
    update public.kaju_voice_sessions set status='failed' where id=p_id and user_id=v_user and status='reserved';
  elsif p_event in ('client_connected','client_ended') and p_reference is not null then
    update public.kaju_voice_sessions set
      connected_at=case when p_event='client_connected' then coalesce(connected_at,now()) else connected_at end,
      ended_at=case when p_event='client_ended' then coalesce(ended_at,now()) else ended_at end,
      client_audio_sent=client_audio_sent or coalesce(p_flags->'audioSent'='true'::jsonb,false),
      client_audio_received=client_audio_received or coalesce(p_flags->'audioReceived'='true'::jsonb,false),
      client_interrupted=client_interrupted or coalesce(p_flags->'interrupted'='true'::jsonb,false)
    where user_id=v_user and reference_id=p_reference and status='issued';
  else return false; end if;
  get diagnostics v_count = row_count;
  return v_count=1;
end $$;
revoke all on function public.kaju_voice_update(uuid,text,text,jsonb) from public, anon;
grant execute on function public.kaju_voice_update(uuid,text,text,jsonb) to authenticated;

drop table if exists public.kaju_voice_testers;
