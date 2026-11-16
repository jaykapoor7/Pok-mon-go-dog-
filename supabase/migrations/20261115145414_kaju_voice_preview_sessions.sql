-- Staging preview only. Apply separately to production only after review.
create table public.kaju_voice_testers (
  email text primary key check (email = lower(email))
);
alter table public.kaju_voice_testers enable row level security;
revoke all on public.kaju_voice_testers from anon, authenticated;

create table public.kaju_voice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  scope_kind text not null default 'standalone' check (scope_kind = 'standalone'),
  scope_id uuid not null,
  agent_version integer not null check (agent_version > 0),
  created_at timestamptz not null default now(),
  status text not null default 'reserved' check (status in ('reserved','issued','failed')),
  reference_id text,
  connected_at timestamptz,
  ended_at timestamptz,
  client_audio_sent boolean not null default false,
  client_audio_received boolean not null default false,
  client_interrupted boolean not null default false
);
create index kaju_voice_sessions_actor_time on public.kaju_voice_sessions(user_id, created_at desc);
create unique index kaju_voice_sessions_reference on public.kaju_voice_sessions(reference_id) where reference_id is not null;
alter table public.kaju_voice_sessions enable row level security;
revoke all on public.kaju_voice_sessions from anon, authenticated;
grant select on public.kaju_voice_sessions to authenticated;
create policy voice_read_own on public.kaju_voice_sessions for select to authenticated using (user_id = (select auth.uid()));

-- Legitimate narrow privileged operations: callers have no direct INSERT/
-- UPDATE grants. Both RPCs verify identity and the server-managed tester list.
create function public.kaju_voice_reserve(p_version integer) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_user uuid := auth.uid();
begin
  if v_user is null or not exists (
    select 1 from public.kaju_voice_testers where email = lower(auth.jwt()->>'email')
  ) then raise exception 'VOICE_ACCESS_DENIED' using errcode = '42501'; end if;
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

create function public.kaju_voice_update(p_id uuid default null,p_event text default null,p_reference text default null,p_flags jsonb default '{}'::jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_count integer;
begin
  if v_user is null or not exists (
    select 1 from public.kaju_voice_testers where email = lower(auth.jwt()->>'email')
  ) then raise exception 'VOICE_ACCESS_DENIED' using errcode = '42501'; end if;
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
comment on table public.kaju_voice_sessions is 'Voice grants and client observations only; no audio, transcript, signed URL or billable duration.';
