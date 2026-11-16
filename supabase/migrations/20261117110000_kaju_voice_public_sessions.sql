-- Kaju Voice for the public (no StrayPaw account). Applies on top of
-- 20261117100000_kaju_voice_access.sql. Safe to re-run.
--
-- A public conversation is a kaju_voice_sessions row with no user:
--   reserved  minted by the server after consent, a bot check and limits
--   claimed   its one provider session is being signed (single use)
--   issued    signed, with the provider reference
--   failed    signing failed
-- Only the server's service role can create or advance these rows. Signed-in
-- people cannot see them (the read policy matches user_id = auth.uid()), and
-- signed-out callers cannot call anything here. No audio, transcript, phone
-- number, IP address or signed URL is stored.

alter table public.kaju_voice_sessions alter column user_id drop not null;
alter table public.kaju_voice_sessions drop constraint if exists kaju_voice_sessions_scope_kind_check;
alter table public.kaju_voice_sessions add constraint kaju_voice_sessions_scope_kind_check check (scope_kind in ('standalone', 'public'));
alter table public.kaju_voice_sessions drop constraint if exists kaju_voice_sessions_public_has_no_user;
alter table public.kaju_voice_sessions add constraint kaju_voice_sessions_public_has_no_user check ((scope_kind = 'public') = (user_id is null));
alter table public.kaju_voice_sessions drop constraint if exists kaju_voice_sessions_status_check;
alter table public.kaju_voice_sessions add constraint kaju_voice_sessions_status_check check (status in ('reserved', 'claimed', 'issued', 'failed'));
create index if not exists kaju_voice_sessions_public_time on public.kaju_voice_sessions (created_at desc) where scope_kind = 'public';

create or replace function public.kaju_voice_public_reserve(p_version integer) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := gen_random_uuid();
begin
  if p_version is null or p_version < 1 then raise exception 'Invalid voice version'; end if;
  perform pg_advisory_xact_lock(hashtextextended('kaju-voice:public', 0));
  -- Backstop behind the server's per-device and site-wide limits.
  if (select count(*) from public.kaju_voice_sessions where scope_kind = 'public' and created_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC') >= 1000
  then raise exception 'VOICE_LIMIT'; end if;
  insert into public.kaju_voice_sessions (id, user_id, scope_kind, scope_id, agent_version)
  values (v_id, null, 'public', v_id, p_version);
  return v_id;
end $$;
revoke all on function public.kaju_voice_public_reserve(integer) from public, anon, authenticated;
grant execute on function public.kaju_voice_public_reserve(integer) to service_role;

create or replace function public.kaju_voice_public_update(p_id uuid, p_event text, p_reference text default null, p_flags jsonb default '{}'::jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if p_id is null or (p_reference is not null and (length(p_reference) < 1 or length(p_reference) > 256)) then return false; end if;
  if p_event = 'claim' then
    update public.kaju_voice_sessions set status = 'claimed'
    where id = p_id and scope_kind = 'public' and status = 'reserved' and created_at > now() - interval '5 minutes';
  elsif p_event = 'issued' and p_reference is not null then
    update public.kaju_voice_sessions set status = 'issued', reference_id = p_reference
    where id = p_id and scope_kind = 'public' and status = 'claimed';
  elsif p_event = 'failed' then
    update public.kaju_voice_sessions set status = 'failed'
    where id = p_id and scope_kind = 'public' and status in ('reserved', 'claimed');
  elsif p_event in ('client_connected', 'client_ended') and p_reference is not null then
    update public.kaju_voice_sessions set
      connected_at = case when p_event = 'client_connected' then coalesce(connected_at, now()) else connected_at end,
      ended_at = case when p_event = 'client_ended' then coalesce(ended_at, now()) else ended_at end,
      client_audio_sent = client_audio_sent or coalesce(p_flags->'audioSent' = 'true'::jsonb, false),
      client_audio_received = client_audio_received or coalesce(p_flags->'audioReceived' = 'true'::jsonb, false),
      client_interrupted = client_interrupted or coalesce(p_flags->'interrupted' = 'true'::jsonb, false)
    where id = p_id and scope_kind = 'public' and reference_id = p_reference and status = 'issued';
  else return false; end if;
  get diagnostics v_count = row_count;
  return v_count = 1;
end $$;
revoke all on function public.kaju_voice_public_update(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.kaju_voice_public_update(uuid, text, text, jsonb) to service_role;
