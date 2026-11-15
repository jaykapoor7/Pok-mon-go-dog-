-- PRODUCTION (project toujthlzjmhmoyykmayx). Run only after the staging checks pass and with the owner's approval.
-- Same statements as STAGING_ALL_rebuild_stage2.sql plus the bite referral link (STAGING_rebuild_stage3.sql). Additive; safe to run twice. See docs/rebuild/PRODUCTION-CHANGES.md.

-- ===== 20261116100000_rebuild_collaboration =====
-- Collaboration (Stage 2 of the rebuild): mentions, reactions, files, edits and deletes with history, message search,
-- record threads, programme channels across organisations, announcement channels, and notification preferences and
-- delivery records. Additive: new tables, functions and columns; two check constraints widened; two policies replaced
-- with stricter or equal ones. No existing row is changed or removed.

-- Helpers ---------------------------------------------------------------------------------------------------------

-- The signed-in person's role in an organisation, across the three membership models. Null when not a member.
create or replace function public.nx_org_role(p_org uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role from ngo_members where ngo_id = p_org and user_id = auth.uid() limit 1),
    (select role from oh_members where organisation_id = p_org and user_id = auth.uid() limit 1),
    (select role from review_office_members where office_id = p_org and user_id = auth.uid() limit 1));
$$;
revoke all on function public.nx_org_role(uuid) from public, anon;
grant execute on function public.nx_org_role(uuid) to authenticated;

-- The same membership question for a named person. Internal: used by triggers that notify someone else, never granted.
create or replace function public.nx_user_is_member(p_org uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_user is not null and (
    exists (select 1 from ngo_members where ngo_id = p_org and user_id = p_user)
    or exists (select 1 from oh_members where organisation_id = p_org and user_id = p_user)
    or exists (select 1 from review_office_members where office_id = p_org and user_id = p_user));
$$;
revoke all on function public.nx_user_is_member(uuid, uuid) from public, anon, authenticated;

create or replace function public.nx_user_in_programme(p_programme uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from oh_participations pp join oh_organisations o on o.id = pp.organisation_id
     where pp.programme_id in (select id from oh_programme_line(p_programme))
       and (exists (select 1 from oh_members m where m.organisation_id = o.id and m.user_id = p_user)
            or (o.ngo_id is not null and exists (select 1 from ngo_members nm where nm.ngo_id = o.ngo_id and nm.user_id = p_user))));
$$;
revoke all on function public.nx_user_in_programme(uuid, uuid) from public, anon, authenticated;

create or replace function public.nx_try_uuid(p text) returns uuid
language plpgsql immutable as $$ begin return p::uuid; exception when others then return null; end $$;

-- Channels: record threads and programme channels -----------------------------------------------------------------

alter table public.nx_channels add column if not exists programme_id uuid references public.oh_programmes on delete cascade;
alter table public.nx_channels drop constraint if exists nx_channels_kind_check;
alter table public.nx_channels add constraint nx_channels_kind_check check (kind in ('channel', 'announcement', 'dm', 'record', 'programme'));
alter table public.nx_channels drop constraint if exists nx_channels_programme_check;
alter table public.nx_channels add constraint nx_channels_programme_check check ((kind = 'programme') = (programme_id is not null));

-- Who may read a channel, decided in one place. A programme channel is read by the people invited to it, and only while
-- an organisation they belong to still takes part in the programme: leaving the programme ends access at once.
create or replace function public.nx_can_read_channel(p_channel uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from nx_channels c where c.id = p_channel and (
    (c.kind = 'programme' and oh_in_programme(c.programme_id)
       and exists (select 1 from nx_channel_members m where m.channel_id = c.id and m.user_id = auth.uid()))
    or (c.kind <> 'programme' and nx_is_member(c.org_id)
       and (not c.private or c.created_by = auth.uid() or exists (select 1 from nx_channel_members m where m.channel_id = c.id and m.user_id = auth.uid())))));
$$;

create or replace function public.nx_user_can_read_channel(p_channel uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from nx_channels c where c.id = p_channel and (
    (c.kind = 'programme' and nx_user_in_programme(c.programme_id, p_user)
       and exists (select 1 from nx_channel_members m where m.channel_id = c.id and m.user_id = p_user))
    or (c.kind <> 'programme' and nx_user_is_member(c.org_id, p_user)
       and (not c.private or c.created_by = p_user or exists (select 1 from nx_channel_members m where m.channel_id = c.id and m.user_id = p_user)))));
$$;
revoke all on function public.nx_user_can_read_channel(uuid, uuid) from public, anon, authenticated;

drop policy if exists nx_channels_read on public.nx_channels;
create policy nx_channels_read on public.nx_channels for select to authenticated using (
  (kind <> 'programme' and public.nx_is_member(org_id) and (not private or created_by = auth.uid()
    or exists (select 1 from public.nx_channel_members m where m.channel_id = id and m.user_id = auth.uid())))
  or (kind = 'programme' and (created_by = auth.uid() or (public.oh_in_programme(programme_id)
    and exists (select 1 from public.nx_channel_members m where m.channel_id = id and m.user_id = auth.uid())))));
-- People create ordinary and announcement channels directly; DMs, record threads and programme channels only through the functions below.
drop policy if exists nx_channels_add on public.nx_channels;
create policy nx_channels_add on public.nx_channels for insert to authenticated with check (
  public.nx_is_member(org_id) and created_by = auth.uid() and kind in ('channel', 'announcement') and programme_id is null);

-- Joining: an open channel of one's own organisation. Programme channels are joined only by invitation.
drop policy if exists nx_members_join on public.nx_channel_members;
create policy nx_members_join on public.nx_channel_members for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.nx_channels c where c.id = channel_id and c.kind in ('channel', 'announcement', 'record')
    and public.nx_is_member(c.org_id) and (not c.private or c.created_by = auth.uid())));

-- The record thread of one record: one hidden channel per organisation holds every record's discussion, so no channel is
-- made per animal. Readable by the organisation's members, who can already read the record.
create or replace function public.nx_record_channel(p_org uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if not nx_is_member(p_org) then raise exception 'not a member of this organisation' using errcode = '42501'; end if;
  select id into v from nx_channels where org_id = p_org and kind = 'record' limit 1;
  if v is null then
    insert into nx_channels (org_id, name, topic, kind, private, created_by)
    values (p_org, 'record-threads', 'Discussion attached to records', 'record', false, auth.uid())
    on conflict (org_id, name) do update set name = excluded.name returning id into v;
  end if;
  return v;
end $$;
revoke all on function public.nx_record_channel(uuid) from public, anon;
grant execute on function public.nx_record_channel(uuid) to authenticated;

-- A programme channel. Only someone who manages the programme starts one; they invite people from partner organisations.
create or replace function public.nx_create_programme_channel(p_programme uuid, p_name text, p_topic text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid; v_org uuid;
begin
  if not oh_can_manage(p_programme) then raise exception 'only the programme''s coordinators start programme channels' using errcode = '42501'; end if;
  select pp.organisation_id into v_org from oh_participations pp join oh_my_memberships() m on m.organisation_id = pp.organisation_id
   where pp.programme_id in (select id from oh_programme_line(p_programme)) and m.kind in ('coordinator', 'state') limit 1;
  insert into nx_channels (org_id, name, topic, kind, private, created_by, programme_id)
  values (v_org, p_name, nullif(trim(p_topic), ''), 'programme', true, auth.uid(), p_programme) returning id into v;
  insert into nx_channel_members (channel_id, user_id) values (v, auth.uid()) on conflict do nothing;
  return v;
end $$;
revoke all on function public.nx_create_programme_channel(uuid, text, text) from public, anon;
grant execute on function public.nx_create_programme_channel(uuid, text, text) to authenticated;

-- People a programme channel can invite: members of organisations in the programme. Names and organisation only.
create or replace function public.nx_programme_people(p_programme uuid)
returns table (user_id uuid, name text, org_name text)
language sql stable security definer set search_path = public as $$
  select distinct on (u.user_id) u.user_id, coalesce(nullif(trim(u.display), ''), 'A colleague'), o.name
    from oh_participations pp join oh_organisations o on o.id = pp.organisation_id
    cross join lateral (
      select m.user_id, m.display_name as display from oh_members m where m.organisation_id = o.id
      union all
      select nm.user_id, null from ngo_members nm where o.ngo_id is not null and nm.ngo_id = o.ngo_id) u
   where oh_can_manage(p_programme) and pp.programme_id in (select id from oh_programme_line(p_programme));
$$;
revoke all on function public.nx_programme_people(uuid) from public, anon;
grant execute on function public.nx_programme_people(uuid) to authenticated;

create or replace function public.nx_programme_channel_invite(p_channel uuid, p_user uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare c nx_channels;
begin
  select * into c from nx_channels where id = p_channel and kind = 'programme';
  if c.id is null or not oh_can_manage(c.programme_id) then raise exception 'only the programme''s coordinators invite people' using errcode = '42501'; end if;
  if not nx_user_in_programme(c.programme_id, p_user) then raise exception 'that person is not in an organisation that takes part in this programme' using errcode = '42501'; end if;
  insert into nx_channel_members (channel_id, user_id) values (p_channel, p_user) on conflict do nothing;
  insert into nx_notifications (user_id, org_id, kind, title, body, href)
  values (p_user, c.org_id, 'system', 'You were added to #' || c.name, 'A programme channel shared between partner organisations.', '/channels/' || c.name);
  return true;
end $$;
revoke all on function public.nx_programme_channel_invite(uuid, uuid) from public, anon;
grant execute on function public.nx_programme_channel_invite(uuid, uuid) to authenticated;

-- Channels a person reads in programmes, which belong to another organisation and so are not in their own list.
create or replace function public.nx_my_programme_channels()
returns table (id uuid, name text, topic text, programme_id uuid, programme_name text)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.topic, c.programme_id, p.name from nx_channels c join oh_programmes p on p.id = c.programme_id
   where c.kind = 'programme' and nx_can_read_channel(c.id) order by c.name;
$$;
revoke all on function public.nx_my_programme_channels() from public, anon;
grant execute on function public.nx_my_programme_channels() to authenticated;

-- Messages: mentions, files, record kinds, announcement posting, edits and deletes --------------------------------

alter table public.nx_messages add column if not exists mentions uuid[] not null default '{}';
alter table public.nx_messages add column if not exists files jsonb not null default '[]'::jsonb;
alter table public.nx_messages drop constraint if exists nx_messages_files_check;
alter table public.nx_messages add constraint nx_messages_files_check check (jsonb_typeof(files) = 'array' and jsonb_array_length(files) <= 10);
alter table public.nx_messages drop constraint if exists nx_messages_mentions_check;
alter table public.nx_messages add constraint nx_messages_mentions_check check (cardinality(mentions) <= 20);
alter table public.nx_messages drop constraint if exists nx_messages_record_kind_check;
alter table public.nx_messages add constraint nx_messages_record_kind_check check (record_kind in ('animal', 'case', 'submission', 'programme', 'task', 'appointment', 'study', 'package'));
alter table public.nx_tasks drop constraint if exists nx_tasks_record_kind_check;
alter table public.nx_tasks add constraint nx_tasks_record_kind_check check (record_kind in ('animal', 'case', 'submission', 'programme', 'appointment', 'study', 'package'));

create index if not exists nx_messages_record on public.nx_messages (channel_id, record_kind, record_id) where record_id is not null;
create index if not exists nx_messages_search on public.nx_messages using gin (to_tsvector('simple', body)) where deleted_at is null;

-- Posting in an announcement channel is for its creator and the organisation's leads and coordinators.
drop policy if exists nx_messages_post on public.nx_messages;
create policy nx_messages_post on public.nx_messages for insert to authenticated with check (
  public.nx_can_read_channel(channel_id) and author_id = auth.uid() and author_kind = 'person' and proposal is null
  and not exists (select 1 from public.nx_channels c where c.id = channel_id and c.kind = 'announcement'
    and c.created_by <> auth.uid() and coalesce(public.nx_org_role(c.org_id), '') not in ('admin', 'lead', 'coordinator')));

-- Files on a message must sit in that channel's folder of the private bucket; mentions are limited to people who can read
-- the channel. Both are checked on the server, whatever the client sends.
create or replace function public.nx_messages_check() returns trigger
language plpgsql security definer set search_path = public as $$
declare f jsonb;
begin
  for f in select * from jsonb_array_elements(new.files) loop
    if jsonb_typeof(f) <> 'object' or coalesce(f->>'path', '') not like new.channel_id::text || '/%' or length(f->>'path') > 300
       or coalesce(f->>'name', '') = '' or length(f->>'name') > 160 then
      raise exception 'a file is not in this channel''s folder' using errcode = '22023';
    end if;
  end loop;
  if tg_op = 'INSERT' then
    new.mentions := array(select distinct u from unnest(new.mentions) u where u <> coalesce(new.author_id, '00000000-0000-0000-0000-000000000000'::uuid)
                                                                  and nx_user_can_read_channel(new.channel_id, u));
  end if;
  return new;
end $$;
drop trigger if exists nx_messages_check on public.nx_messages;
create trigger nx_messages_check before insert on public.nx_messages for each row execute function public.nx_messages_check();

-- Earlier wording of edited and deleted messages, kept for audit. No one reads it through the API.
create table if not exists public.nx_message_history (
  id bigint generated always as identity primary key,
  message_id uuid not null references public.nx_messages on delete cascade,
  body text not null,
  files jsonb not null default '[]'::jsonb,
  action text not null check (action in ('edited', 'deleted')),
  by_user uuid not null,
  at timestamptz not null default now()
);
alter table public.nx_message_history enable row level security;
revoke all on public.nx_message_history from anon, authenticated;

-- Direct updates may only change the body, the edit mark and the delete mark; everything else about a message is fixed.
create or replace function public.nx_messages_guard() returns trigger
language plpgsql as $$
begin
  if new.channel_id is distinct from old.channel_id or new.parent_id is distinct from old.parent_id or new.author_id is distinct from old.author_id
     or new.author_kind is distinct from old.author_kind or new.author_name is distinct from old.author_name or new.created_at is distinct from old.created_at
     or new.record_kind is distinct from old.record_kind or new.record_id is distinct from old.record_id or new.proposal is distinct from old.proposal
     or new.mentions is distinct from old.mentions then
    raise exception 'only a message''s wording can change' using errcode = '42501';
  end if;
  if old.deleted_at is not null then raise exception 'a deleted message cannot change' using errcode = '42501'; end if;
  return new;
end $$;
drop trigger if exists nx_messages_guard on public.nx_messages;
create trigger nx_messages_guard before update on public.nx_messages for each row execute function public.nx_messages_guard();

create or replace function public.nx_edit_message(p_message uuid, p_body text) returns boolean
language plpgsql security definer set search_path = public as $$
declare m nx_messages;
begin
  select * into m from nx_messages where id = p_message;
  if m.id is null or m.author_id <> auth.uid() or m.author_kind <> 'person' or not nx_can_read_channel(m.channel_id) then
    raise exception 'you can edit only your own messages' using errcode = '42501'; end if;
  if m.deleted_at is not null then raise exception 'that message was deleted' using errcode = '42501'; end if;
  if length(trim(coalesce(p_body, ''))) = 0 or length(p_body) > 8000 then raise exception 'a message has 1 to 8000 characters' using errcode = '22023'; end if;
  if m.body = p_body then return true; end if;
  insert into nx_message_history (message_id, body, files, action, by_user) values (m.id, m.body, m.files, 'edited', auth.uid());
  update nx_messages set body = p_body, edited_at = now() where id = m.id;
  return true;
end $$;

create or replace function public.nx_delete_message(p_message uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare m nx_messages;
begin
  select * into m from nx_messages where id = p_message;
  if m.id is null or m.author_id <> auth.uid() or m.author_kind <> 'person' or not nx_can_read_channel(m.channel_id) then
    raise exception 'you can delete only your own messages' using errcode = '42501'; end if;
  if m.deleted_at is not null then return true; end if;
  insert into nx_message_history (message_id, body, files, action, by_user) values (m.id, m.body, m.files, 'deleted', auth.uid());
  update nx_messages set body = 'This message was deleted.', files = '[]'::jsonb, deleted_at = now() where id = m.id;
  return true;
end $$;
revoke all on function public.nx_edit_message(uuid, text), public.nx_delete_message(uuid) from public, anon;
grant execute on function public.nx_edit_message(uuid, text), public.nx_delete_message(uuid) to authenticated;

-- Mentions become notifications for the people mentioned, who can already read the channel. The notification carries
-- the channel's name only: the wording stays in the channel, so a preview never shows more than the channel does.
create or replace function public.nx_messages_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare c nx_channels; u uuid; who text;
begin
  if cardinality(new.mentions) = 0 then return new; end if;
  select * into c from nx_channels where id = new.channel_id;
  who := coalesce(new.author_name, 'Someone');
  foreach u in array new.mentions loop
    insert into nx_notifications (user_id, org_id, kind, title, body, href)
    values (u, c.org_id, 'mention',
            left(who || case when c.kind = 'dm' then ' mentioned you in a direct message' when c.kind = 'record' then ' mentioned you on ' || coalesce(new.record_label, 'a record') else ' mentioned you in #' || c.name end, 200),
            null,
            case when c.kind = 'record' then null else '/channels/' || c.name || '?m=' || new.id end);
  end loop;
  return new;
end $$;
drop trigger if exists nx_messages_notify on public.nx_messages;
create trigger nx_messages_notify after insert on public.nx_messages for each row execute function public.nx_messages_notify();

-- Reactions ---------------------------------------------------------------------------------------------------------

create table if not exists public.nx_reactions (
  message_id uuid not null references public.nx_messages on delete cascade,
  user_id uuid not null default auth.uid(),
  emoji text not null check (emoji in ('👍', '✅', '👀', '🙏', '❤️', '🎉', '⚠️', '❓')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
alter table public.nx_reactions enable row level security;
drop policy if exists nx_reactions_read on public.nx_reactions;
create policy nx_reactions_read on public.nx_reactions for select to authenticated using (
  exists (select 1 from public.nx_messages m where m.id = message_id and public.nx_can_read_channel(m.channel_id)));
drop policy if exists nx_reactions_add on public.nx_reactions;
create policy nx_reactions_add on public.nx_reactions for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.nx_messages m where m.id = message_id and m.deleted_at is null and public.nx_can_read_channel(m.channel_id)));
drop policy if exists nx_reactions_remove on public.nx_reactions;
create policy nx_reactions_remove on public.nx_reactions for delete to authenticated using (user_id = auth.uid());
grant select, insert, delete on public.nx_reactions to authenticated;
revoke all on public.nx_reactions from anon;

-- Message search: the caller's own access decides what is searched (security invoker, so row-level security applies).
create or replace function public.nx_search_messages(p_q text, p_limit int default 30)
returns table (id uuid, channel_id uuid, channel_name text, channel_kind text, body text, author_name text, created_at timestamptz, record_kind text, record_id text, record_label text)
language sql stable security invoker set search_path = public as $$
  select m.id, m.channel_id, c.name, c.kind, left(m.body, 400), m.author_name, m.created_at, m.record_kind, m.record_id, m.record_label
    from nx_messages m join nx_channels c on c.id = m.channel_id
   where m.deleted_at is null and length(trim(p_q)) >= 2
     and (to_tsvector('simple', m.body) @@ websearch_to_tsquery('simple', p_q) or m.body ilike '%' || replace(replace(trim(p_q), '%', ''), '_', '') || '%')
   order by m.created_at desc limit least(greatest(p_limit, 1), 100);
$$;
revoke all on function public.nx_search_messages(text, int) from public, anon;
grant execute on function public.nx_search_messages(text, int) to authenticated;

-- Files ----------------------------------------------------------------------------------------------------------
-- One private bucket. A file's first folder is its channel, and reading or adding a file needs the same access as the
-- channel. Files are served through short-lived signed links, never public addresses.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nx-files', 'nx-files', false, 10485760, array[
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf', 'text/csv', 'text/plain',
  'audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/ogg',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

drop policy if exists nx_files_read on storage.objects;
create policy nx_files_read on storage.objects for select to authenticated using (
  bucket_id = 'nx-files' and public.nx_can_read_channel(public.nx_try_uuid((storage.foldername(name))[1])));
drop policy if exists nx_files_add on storage.objects;
create policy nx_files_add on storage.objects for insert to authenticated with check (
  bucket_id = 'nx-files' and owner = auth.uid() and public.nx_can_read_channel(public.nx_try_uuid((storage.foldername(name))[1])));

-- Notifications: kinds, preferences and delivery records ------------------------------------------------------------

alter table public.nx_notifications drop constraint if exists nx_notifications_kind_check;
alter table public.nx_notifications add constraint nx_notifications_kind_check check (kind in ('mention', 'task', 'approval', 'handoff', 'system', 'reply', 'reminder', 'result', 'referral', 'digest'));
create index if not exists nx_notifications_user on public.nx_notifications (user_id, created_at desc);

-- A person's own choices. In-app notifications are always on; email, push, SMS and WhatsApp are off until the person
-- turns them on, and quiet hours hold anything that is not urgent.
create table if not exists public.nx_notification_settings (
  user_id uuid primary key default auth.uid(),
  email boolean not null default false,
  push boolean not null default false,
  digest text not null default 'off' check (digest in ('off', 'daily')),
  quiet_from time, quiet_to time,
  time_zone text not null default 'Asia/Kolkata' check (length(time_zone) <= 60),
  muted_kinds text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.nx_notification_settings enable row level security;
drop policy if exists nx_notif_settings_own on public.nx_notification_settings;
create policy nx_notif_settings_own on public.nx_notification_settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.nx_notification_settings to authenticated;
revoke all on public.nx_notification_settings from anon;

-- Browser push subscriptions. The keys are the browser's public subscription keys, not secrets of this service.
create table if not exists public.nx_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  endpoint text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  p256dh text not null check (length(p256dh) <= 200),
  auth text not null check (length(auth) <= 100),
  created_at timestamptz not null default now()
);
alter table public.nx_push_subscriptions enable row level security;
drop policy if exists nx_push_own on public.nx_push_subscriptions;
create policy nx_push_own on public.nx_push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, delete on public.nx_push_subscriptions to authenticated;
revoke all on public.nx_push_subscriptions from anon;

-- One row per attempt to deliver a notification outside StrayPaw. "not_connected" means no provider is configured for
-- that channel yet: the attempt is recorded and nothing is sent. The worker retries failures with backoff.
create table if not exists public.nx_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.nx_notifications on delete cascade,
  user_id uuid not null,
  channel text not null check (channel in ('email', 'push', 'sms', 'whatsapp')),
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'not_connected', 'held_quiet', 'cancelled')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text check (length(last_error) <= 500),
  provider_ref text check (length(provider_ref) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_id, channel)
);
create index if not exists nx_deliveries_due on public.nx_deliveries (next_attempt_at) where status in ('queued', 'held_quiet', 'failed');
alter table public.nx_deliveries enable row level security;
drop policy if exists nx_deliveries_own on public.nx_deliveries;
create policy nx_deliveries_own on public.nx_deliveries for select to authenticated using (user_id = auth.uid());
grant select on public.nx_deliveries to authenticated;
revoke all on public.nx_deliveries from anon;

-- A new notification is queued for the outside channels the person turned on. Muted kinds are not queued.
create or replace function public.nx_notifications_queue() returns trigger
language plpgsql security definer set search_path = public as $$
declare s nx_notification_settings;
begin
  select * into s from nx_notification_settings where user_id = new.user_id;
  if s.user_id is null or new.kind = any (s.muted_kinds) then return new; end if;
  if s.email then insert into nx_deliveries (notification_id, user_id, channel) values (new.id, new.user_id, 'email') on conflict do nothing; end if;
  if s.push and exists (select 1 from nx_push_subscriptions where user_id = new.user_id) then
    insert into nx_deliveries (notification_id, user_id, channel) values (new.id, new.user_id, 'push') on conflict do nothing; end if;
  return new;
end $$;
drop trigger if exists nx_notifications_queue on public.nx_notifications;
create trigger nx_notifications_queue after insert on public.nx_notifications for each row execute function public.nx_notifications_queue();

create or replace function public.nx_mark_notifications_read(p_ids uuid[] default null) returns int
language sql security invoker set search_path = public as $$
  with u as (update nx_notifications set read_at = now() where user_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids)) returning 1)
  select count(*)::int from u;
$$;
revoke all on function public.nx_mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.nx_mark_notifications_read(uuid[]) to authenticated;

-- ===== 20261116110000_rebuild_kaju_engine =====
-- Kaju's durable execution (Stage 3 of the rebuild). Additive: new tables and functions, new columns on the mission
-- tables, and the mission step state list widened. No existing row is changed or removed.
--
-- A mission is a list of steps. Each step names a tool from a fixed registry. The registry says how much autonomy the
-- tool has (0 read, 1 draft, 2 automatic low-risk, 3 ask for approval, 4 a person only). An organisation can make a tool
-- stricter, never looser. Steps run in the database, as the person who started the mission, with the same checks as if
-- they had done it themselves; they keep running when the browser is closed. A failed step is retried with backoff and
-- never repeats an effect it already made. Every change is written to the mission's trace.

-- Registry ------------------------------------------------------------------------------------------------------------

create table if not exists public.nx_kaju_tools (
  name text primary key check (name ~ '^[a-z_]{3,40}$'),
  label text not null check (length(label) <= 120),
  level int not null check (level between 0 and 4),
  external boolean not null default false,
  description text not null check (length(description) <= 400)
);
alter table public.nx_kaju_tools enable row level security;
drop policy if exists nx_kaju_tools_read on public.nx_kaju_tools;
create policy nx_kaju_tools_read on public.nx_kaju_tools for select to authenticated using (true);
grant select on public.nx_kaju_tools to authenticated;
revoke all on public.nx_kaju_tools from anon;

insert into public.nx_kaju_tools (name, label, level, external, description) values
  ('find_due_followups', 'Find cases due a follow-up', 0, false, 'Reads open cases with a follow-up due, by place and period. Cases that already have an open follow-up task are counted, not listed.'),
  ('find_overdue_cases', 'Find overdue cases', 0, false, 'Reads open cases past their due date.'),
  ('create_task', 'Create a task', 2, false, 'Creates one task in the organisation, optionally assigned to a member and linked to a record.'),
  ('create_followup_tasks', 'Create follow-up tasks', 3, false, 'Creates one follow-up task per case found by an earlier step. A case with an open follow-up is never given a second one.'),
  ('post_message', 'Post in a channel', 2, false, 'Posts a message as Kaju, on behalf of the person, in a channel they can read.'),
  ('notify_members', 'Notify members', 2, false, 'Sends an in-app notification to named members of the organisation.'),
  ('send_external', 'Send an email or WhatsApp message', 3, true, 'Queues a message to someone outside StrayPaw. It is delivered only through a connected, approved account.'),
  ('verify_claim', 'Decide a verification', 4, false, 'A reviewing officer decides. Kaju never approves or rejects a claim.'),
  ('validate_result', 'Validate a laboratory result', 4, false, 'Authorised laboratory staff validate. Kaju never validates a result.'),
  ('clinical_decision', 'Make a clinical decision', 4, false, 'Diagnosis, treatment and dosing are decided by a clinician. Kaju never makes them.'),
  ('grant_data_access', 'Grant access to restricted data', 4, false, 'The data steward decides. Kaju never grants access.')
on conflict (name) do update set label = excluded.label, level = excluded.level, external = excluded.external, description = excluded.description;

-- An organisation's own rules: a tool can be made stricter (a higher level) or switched off. Leads and admins set them.
create table if not exists public.nx_kaju_policies (
  org_id uuid not null,
  tool text not null references public.nx_kaju_tools on delete cascade,
  level int not null check (level between 0 and 4),
  enabled boolean not null default true,
  updated_by uuid not null default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (org_id, tool)
);
alter table public.nx_kaju_policies enable row level security;
drop policy if exists nx_kaju_policies_read on public.nx_kaju_policies;
create policy nx_kaju_policies_read on public.nx_kaju_policies for select to authenticated using (public.nx_is_member(org_id));
drop policy if exists nx_kaju_policies_write on public.nx_kaju_policies;
create policy nx_kaju_policies_write on public.nx_kaju_policies for all to authenticated
  using (coalesce(public.nx_org_role(org_id), '') in ('admin', 'lead'))
  with check (coalesce(public.nx_org_role(org_id), '') in ('admin', 'lead') and updated_by = auth.uid()
              and level >= (select t.level from public.nx_kaju_tools t where t.name = tool));
grant select, insert, update, delete on public.nx_kaju_policies to authenticated;
revoke all on public.nx_kaju_policies from anon;

-- A person's own limits. They can hold Kaju to drafts only, or turn off the understanding-while-typing composer.
create table if not exists public.nx_kaju_prefs (
  user_id uuid primary key default auth.uid(),
  predictive boolean not null default true,
  autonomy_cap int not null default 2 check (autonomy_cap between 0 and 2),
  updated_at timestamptz not null default now()
);
alter table public.nx_kaju_prefs enable row level security;
drop policy if exists nx_kaju_prefs_own on public.nx_kaju_prefs;
create policy nx_kaju_prefs_own on public.nx_kaju_prefs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.nx_kaju_prefs to authenticated;
revoke all on public.nx_kaju_prefs from anon;

-- The level a tool runs at in an organisation for a person: the registry's level, raised by the organisation's rule,
-- and anything above the person's own cap needs approval. 9 means switched off.
create or replace function public.nx_tool_level(p_org uuid, p_tool text, p_user uuid default auth.uid()) returns int
language sql stable security definer set search_path = public as $$
  select case when p.enabled is false then 9
              else greatest(t.level, coalesce(p.level, 0),
                            case when t.level = 2 and coalesce((select autonomy_cap from nx_kaju_prefs where user_id = p_user), 2) < 2 then 3 else 0 end) end
    from nx_kaju_tools t left join nx_kaju_policies p on p.org_id = p_org and p.tool = t.name where t.name = p_tool;
$$;
revoke all on function public.nx_tool_level(uuid, text, uuid) from public, anon;
grant execute on function public.nx_tool_level(uuid, text, uuid) to authenticated;

-- Missions and steps: what the engine needs to resume, retry and explain ----------------------------------------------

alter table public.nx_missions add column if not exists source text not null default 'kaju' check (source in ('kaju', 'automation', 'channel'));
alter table public.nx_missions add column if not exists start_key text check (length(start_key) <= 80);
alter table public.nx_missions add column if not exists deadline timestamptz;
alter table public.nx_missions add column if not exists error text check (length(error) <= 500);
alter table public.nx_missions add column if not exists channel_id uuid references public.nx_channels on delete set null;
alter table public.nx_missions add column if not exists deadline_noted boolean not null default false;
create unique index if not exists nx_missions_start_key on public.nx_missions (owner_id, start_key) where start_key is not null;

alter table public.nx_mission_steps add column if not exists input jsonb not null default '{}'::jsonb;
alter table public.nx_mission_steps add column if not exists level int check (level between 0 and 9);
alter table public.nx_mission_steps add column if not exists why text check (length(why) <= 300);
alter table public.nx_mission_steps add column if not exists next_attempt_at timestamptz;
alter table public.nx_mission_steps add column if not exists max_attempts int not null default 5 check (max_attempts between 1 and 10);
alter table public.nx_mission_steps add column if not exists started_at timestamptz;
alter table public.nx_mission_steps add column if not exists finished_at timestamptz;
alter table public.nx_mission_steps add column if not exists note text check (length(note) <= 500);
alter table public.nx_mission_steps drop constraint if exists nx_mission_steps_state_check;
alter table public.nx_mission_steps add constraint nx_mission_steps_state_check
  check (state in ('todo', 'running', 'done', 'waiting_approval', 'waiting_person', 'retrying', 'failed', 'skipped', 'cancelled'));
create index if not exists nx_mission_steps_due on public.nx_mission_steps (next_attempt_at) where state in ('todo', 'retrying');

-- The trace: one row per thing that happened, in plain words, for the mission's owner.
create table if not exists public.nx_mission_events (
  id bigint generated always as identity primary key,
  mission_id uuid not null references public.nx_missions on delete cascade,
  step_id uuid references public.nx_mission_steps on delete cascade,
  at timestamptz not null default now(),
  kind text not null check (kind in ('created', 'policy', 'started', 'succeeded', 'failed', 'retry_scheduled', 'waiting_approval', 'approved', 'edited', 'rejected', 'waiting_person', 'person_done', 'cancelled', 'completed', 'blocked', 'recovered', 'deadline', 'deduplicated')),
  message text not null check (length(message) <= 400),
  data jsonb
);
create index if not exists nx_mission_events_mission on public.nx_mission_events (mission_id, id);
alter table public.nx_mission_events enable row level security;
drop policy if exists nx_mission_events_read on public.nx_mission_events;
create policy nx_mission_events_read on public.nx_mission_events for select to authenticated using (
  exists (select 1 from public.nx_missions m where m.id = mission_id and m.owner_id = auth.uid()));
grant select on public.nx_mission_events to authenticated;
revoke all on public.nx_mission_events from anon;

-- What a step already did. A retried step finds its effect here and does not do it again.
create table if not exists public.nx_tool_effects (
  idempotency_key text primary key,
  mission_id uuid references public.nx_missions on delete cascade,
  step_id uuid references public.nx_mission_steps on delete cascade,
  tool text not null,
  result jsonb not null,
  at timestamptz not null default now()
);
alter table public.nx_tool_effects enable row level security;
revoke all on public.nx_tool_effects from anon, authenticated;

-- Messages to people outside StrayPaw. Nothing here is delivered until a connected account exists and the step that
-- queued it was approved; until then the row says so. Recipients are visible only to whoever queued them.
create table if not exists public.nx_outbox (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  mission_id uuid references public.nx_missions on delete set null,
  step_id uuid references public.nx_mission_steps on delete set null,
  channel text not null check (channel in ('email', 'whatsapp', 'sms')),
  recipient text not null check (length(recipient) between 3 and 200),
  subject text check (length(subject) <= 200),
  body text not null check (length(body) between 1 and 4000),
  status text not null default 'queued' check (status in ('queued', 'not_connected', 'sent', 'failed', 'cancelled')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text check (length(last_error) <= 500),
  provider_ref text check (length(provider_ref) <= 200),
  idempotency_key text unique,
  created_by uuid not null,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists nx_outbox_due on public.nx_outbox (next_attempt_at) where status in ('queued', 'failed');
alter table public.nx_outbox enable row level security;
drop policy if exists nx_outbox_read on public.nx_outbox;
create policy nx_outbox_read on public.nx_outbox for select to authenticated using (created_by = auth.uid() and public.nx_is_member(org_id));
grant select on public.nx_outbox to authenticated;
revoke all on public.nx_outbox from anon;

-- Organisation memory --------------------------------------------------------------------------------------------------
-- How the organisation works (procedures, templates, decisions) and a person's own preferences. Stored as short entries
-- with their source, not as copies of conversations. An organisation entry is used once a lead or admin approves it.
create table if not exists public.nx_kaju_memory (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  scope text not null check (scope in ('org', 'personal')),
  kind text not null check (kind in ('procedure', 'template', 'decision', 'preference', 'fact')),
  title text not null check (length(title) between 2 and 160),
  body text not null check (length(body) between 2 and 4000),
  source_kind text check (source_kind in ('message', 'record', 'document', 'person')),
  source_ref text check (length(source_ref) <= 200),
  valid_until date,
  created_by uuid not null default auth.uid(),
  approved_by uuid, approved_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists nx_kaju_memory_org on public.nx_kaju_memory (org_id, scope) where revoked_at is null;
alter table public.nx_kaju_memory enable row level security;
drop policy if exists nx_kaju_memory_read on public.nx_kaju_memory;
create policy nx_kaju_memory_read on public.nx_kaju_memory for select to authenticated using (
  public.nx_is_member(org_id) and (created_by = auth.uid() or (scope = 'org' and (approved_at is not null or coalesce(public.nx_org_role(org_id), '') in ('admin', 'lead')))));
drop policy if exists nx_kaju_memory_add on public.nx_kaju_memory;
create policy nx_kaju_memory_add on public.nx_kaju_memory for insert to authenticated with check (
  public.nx_is_member(org_id) and created_by = auth.uid() and approved_by is null and approved_at is null and revoked_at is null
  and (scope = 'org' or kind = 'preference'));
grant select, insert on public.nx_kaju_memory to authenticated;
revoke all on public.nx_kaju_memory from anon;

create or replace function public.nx_memory_decide(p_id uuid, p_action text) returns boolean
language plpgsql security definer set search_path = public as $$
declare m nx_kaju_memory;
begin
  select * into m from nx_kaju_memory where id = p_id;
  if m.id is null or not nx_is_member(m.org_id) then raise exception 'not found' using errcode = '42501'; end if;
  if p_action = 'approve' then
    if m.scope <> 'org' or coalesce(nx_org_role(m.org_id), '') not in ('admin', 'lead') then raise exception 'a lead or admin approves organisation memory' using errcode = '42501'; end if;
    update nx_kaju_memory set approved_by = auth.uid(), approved_at = now() where id = p_id and revoked_at is null;
  elsif p_action = 'revoke' then
    if m.created_by <> auth.uid() and coalesce(nx_org_role(m.org_id), '') not in ('admin', 'lead') then raise exception 'only its author or a lead can remove it' using errcode = '42501'; end if;
    update nx_kaju_memory set revoked_at = now() where id = p_id;
  else raise exception 'approve or revoke' using errcode = '22023'; end if;
  return true;
end $$;
revoke all on function public.nx_memory_decide(uuid, text) from public, anon;
grant execute on function public.nx_memory_decide(uuid, text) to authenticated;

-- The engine ------------------------------------------------------------------------------------------------------------

create or replace function public.nx_mission_event(p_mission uuid, p_step uuid, p_kind text, p_message text, p_data jsonb default null) returns void
language sql security definer set search_path = public as $$
  insert into nx_mission_events (mission_id, step_id, kind, message, data) values (p_mission, p_step, p_kind, left(p_message, 400), p_data);
  update nx_missions set updated_at = now() where id = p_mission;
$$;
revoke all on function public.nx_mission_event(uuid, uuid, text, text, jsonb) from public, anon, authenticated;

-- The display name of a person, for messages Kaju posts on their behalf.
create or replace function public.nx_person_name(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(raw_user_meta_data->>'display_name'), ''), nullif(trim(raw_user_meta_data->>'name'), ''), 'a member') from auth.users where id = p_user;
$$;
revoke all on function public.nx_person_name(uuid) from public, anon, authenticated;

-- One tool, run as p_actor in p_org. Raises on any refusal or failure; the caller decides whether to retry.
create or replace function public.nx_tool_exec(p_actor uuid, p_org uuid, p_tool text, p_input jsonb, p_key text, p_mission uuid, p_step uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_prev jsonb; v_out jsonb; v_id uuid; v_ch uuid; v_n int := 0; v_skip int := 0; u uuid;
  v_place text; v_when text; v_today date := (now() at time zone 'Asia/Kolkata')::date; v_from date; v_to date; v_cases jsonb;
begin
  if p_key is not null then
    select result into v_prev from nx_tool_effects where idempotency_key = p_key;
    if found then return v_prev || jsonb_build_object('deduplicated', true); end if;
  end if;
  if not nx_user_is_member(p_org, p_actor) then raise exception 'the person who started this is no longer a member of the organisation' using errcode = '42501'; end if;

  if p_tool = 'find_due_followups' then
    v_place := nullif(btrim(p_input->>'place'), ''); v_when := lower(coalesce(nullif(btrim(p_input->>'when'), ''), 'any'));
    if v_when = 'today' then v_from := v_today; v_to := v_today;
    elsif v_when = 'tomorrow' then v_from := v_today + 1; v_to := v_today + 1;
    elsif v_when = 'this week' then v_from := v_today; v_to := v_today + (7 - extract(isodow from v_today)::int);
    elsif v_when = 'next week' then v_from := v_today + (8 - extract(isodow from v_today)::int); v_to := v_from + 6;
    else v_when := 'any'; end if;
    select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'code', coalesce(c.case_code, upper(left(c.id::text, 8))), 'title', coalesce(nullif(c.title, ''), 'Case'), 'place', coalesce(c.zone, c.city), 'due', coalesce(c.due_at, c.follow_up_at::timestamptz)::date)), '[]'::jsonb), count(*)
      into v_cases, v_n
      from (select * from cases c where c.ngo_id = p_org and c.resolved_at is null
              and (v_place is null or c.zone ilike v_place or c.city ilike v_place)
              and (v_when = 'any' or coalesce(c.due_at, c.follow_up_at::timestamptz)::date between v_from and v_to)
              and not exists (select 1 from nx_tasks t where t.org_id = p_org and t.record_kind = 'case' and t.record_id = c.id::text and t.state = 'open')
            order by coalesce(c.due_at, c.follow_up_at::timestamptz) nulls last limit 50) c;
    select count(*) into v_skip from cases c where c.ngo_id = p_org and c.resolved_at is null
       and (v_place is null or c.zone ilike v_place or c.city ilike v_place)
       and (v_when = 'any' or coalesce(c.due_at, c.follow_up_at::timestamptz)::date between v_from and v_to)
       and exists (select 1 from nx_tasks t where t.org_id = p_org and t.record_kind = 'case' and t.record_id = c.id::text and t.state = 'open');
    v_out := jsonb_build_object('cases', v_cases, 'found', v_n, 'already_open', v_skip, 'place', v_place, 'when', v_when);

  elsif p_tool = 'find_overdue_cases' then
    select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'code', coalesce(c.case_code, upper(left(c.id::text, 8))), 'title', coalesce(nullif(c.title, ''), 'Case'), 'due', c.due_at::date)), '[]'::jsonb), count(*)
      into v_cases, v_n
      from (select * from cases c where c.ngo_id = p_org and c.resolved_at is null and c.due_at < now() order by c.due_at limit 50) c;
    v_out := jsonb_build_object('cases', v_cases, 'found', v_n);

  elsif p_tool = 'create_task' then
    if length(coalesce(btrim(p_input->>'title'), '')) = 0 then raise exception 'a task needs a title' using errcode = '22023'; end if;
    u := nx_try_uuid(p_input->>'assignee_id');
    if u is not null and not nx_user_is_member(p_org, u) then raise exception 'the assignee is not a member of the organisation' using errcode = '42501'; end if;
    insert into nx_tasks (org_id, title, note, due_on, assignee_id, assignee_name, created_by, source_kind, record_kind, record_id, record_label, mission_id, channel_id)
    values (p_org, left(btrim(p_input->>'title'), 240), left(p_input->>'note', 2000), nullif(p_input->>'due_on', '')::date, u,
            case when u is not null then nx_person_name(u) else left(p_input->>'assignee_name', 80) end, p_actor, 'kaju',
            nullif(p_input->>'record_kind', ''), nullif(p_input->>'record_id', ''), left(p_input->>'record_label', 160), p_mission, nx_try_uuid(p_input->>'channel_id'))
    returning id into v_id;
    v_out := jsonb_build_object('task_id', v_id);

  elsif p_tool = 'create_followup_tasks' then
    select result into v_prev from nx_mission_steps where mission_id = p_mission and position = coalesce((p_input->>'from_step')::int, 1) and state = 'done';
    if v_prev is null then raise exception 'the step that finds the cases has not finished' using errcode = 'P0001'; end if;
    insert into nx_tasks (org_id, title, state, due_on, assignee_name, created_by, source_kind, record_kind, record_id, record_label, mission_id)
    select p_org, left('Follow up: ' || (e->>'title'), 240), 'open', nullif(e->>'due', '')::date, left(p_input->>'team', 80), p_actor, 'kaju', 'case', e->>'id', e->>'code', p_mission
      from jsonb_array_elements(coalesce(v_prev->'cases', '[]'::jsonb)) e
     where not exists (select 1 from nx_tasks x where x.org_id = p_org and x.record_kind = 'case' and x.record_id = e->>'id' and x.state = 'open')
    on conflict (mission_id, record_id) where mission_id is not null do nothing;
    get diagnostics v_n = row_count;
    v_out := jsonb_build_object('created', v_n, 'considered', jsonb_array_length(coalesce(v_prev->'cases', '[]'::jsonb)));

  elsif p_tool = 'post_message' then
    v_ch := coalesce(nx_try_uuid(p_input->>'channel_id'), (select id from nx_channels where org_id = p_org and name = p_input->>'channel' and kind in ('channel', 'announcement')));
    if v_ch is null then raise exception 'that channel was not found' using errcode = 'P0001'; end if;
    if not nx_user_can_read_channel(v_ch, p_actor) then raise exception 'the person who started this cannot post in that channel' using errcode = '42501'; end if;
    if length(coalesce(btrim(p_input->>'body'), '')) = 0 then raise exception 'a message needs words' using errcode = '22023'; end if;
    insert into nx_messages (channel_id, author_id, author_kind, author_name, body, record_kind, record_id, record_label)
    values (v_ch, null, 'kaju', left('Kaju for ' || nx_person_name(p_actor), 120), left(p_input->>'body', 4000),
            nullif(p_input->>'record_kind', ''), nullif(p_input->>'record_id', ''), left(p_input->>'record_label', 160))
    returning id into v_id;
    v_out := jsonb_build_object('message_id', v_id, 'channel_id', v_ch);

  elsif p_tool = 'notify_members' then
    for u in select nx_try_uuid(x) from jsonb_array_elements_text(coalesce(p_input->'user_ids', '[]'::jsonb)) x loop
      if u is null or not nx_user_is_member(p_org, u) then raise exception 'a recipient is not a member of the organisation' using errcode = '42501'; end if;
      insert into nx_notifications (user_id, org_id, kind, title, body, href)
      values (u, p_org, 'task', left(coalesce(nullif(btrim(p_input->>'title'), ''), 'Kaju has something for you'), 200), left(p_input->>'body', 500),
              case when coalesce(p_input->>'href', '') ~ '^/' then left(p_input->>'href', 300) end);
      v_n := v_n + 1;
    end loop;
    v_out := jsonb_build_object('notified', v_n);

  elsif p_tool = 'send_external' then
    if coalesce(p_input->>'channel', '') not in ('email', 'whatsapp', 'sms') then raise exception 'email, whatsapp or sms' using errcode = '22023'; end if;
    insert into nx_outbox (org_id, mission_id, step_id, channel, recipient, subject, body, created_by, approved_by, approved_at, idempotency_key)
    select p_org, p_mission, p_step, p_input->>'channel', left(btrim(p_input->>'to'), 200), left(p_input->>'subject', 200), left(p_input->>'body', 4000), p_actor, s.approved_by, s.approved_at, p_key
      from nx_mission_steps s where s.id = p_step
    returning id into v_id;
    v_out := jsonb_build_object('outbox_id', v_id, 'status', 'queued');

  else
    raise exception 'Kaju has no tool called %', p_tool using errcode = '22023';
  end if;

  if p_key is not null then insert into nx_tool_effects (idempotency_key, mission_id, step_id, tool, result) values (p_key, p_mission, p_step, p_tool, v_out); end if;
  return v_out;
end $$;
revoke all on function public.nx_tool_exec(uuid, uuid, text, jsonb, text, uuid, uuid) from public, anon, authenticated;

-- Run what is due in one mission. Stops at the first step that needs a person.
create or replace function public.nx_mission_advance(p_mission uuid) returns text
language plpgsql security definer set search_path = public as $$
declare m nx_missions; s nx_mission_steps; v_out jsonb; v_err text; v_claims text := current_setting('request.jwt.claims', true);
begin
  select * into m from nx_missions where id = p_mission for update skip locked;
  if m.id is null then return 'busy'; end if;
  if m.state in ('completed', 'cancelled', 'draft') then return m.state; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', m.owner_id, 'role', 'authenticated')::text, true);
  loop
    select * into s from nx_mission_steps where mission_id = m.id and state not in ('done', 'skipped', 'cancelled') order by position limit 1 for update;
    if s.id is null then
      update nx_missions set state = 'completed', error = null, updated_at = now() where id = m.id;
      perform nx_mission_event(m.id, null, 'completed', 'Mission completed.');
      perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
      return 'completed';
    end if;
    if s.state in ('waiting_approval', 'waiting_person', 'failed') then
      update nx_missions set state = case when s.state = 'failed' then 'blocked' else 'waiting_person' end, updated_at = now() where id = m.id and state <> case when s.state = 'failed' then 'blocked' else 'waiting_person' end;
      perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
      return s.state;
    end if;
    if s.next_attempt_at is not null and s.next_attempt_at > now() then
      update nx_missions set state = 'retrying', updated_at = now() where id = m.id and state <> 'retrying';
      perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
      return 'retrying';
    end if;
    -- Policy, decided when the step is about to run, against the rules as they are now.
    s.level := coalesce(nx_tool_level(m.org_id, s.tool, m.owner_id), 9);
    if s.level >= 9 then
      update nx_mission_steps set state = 'failed', level = s.level, error = 'This tool is switched off in the organisation.', finished_at = now() where id = s.id;
      perform nx_mission_event(m.id, s.id, 'blocked', 'Stopped: ' || s.label || ' is switched off in the organisation.');
      continue;
    elsif s.level = 4 then
      update nx_mission_steps set state = 'waiting_person', level = 4, why = (select description from nx_kaju_tools where name = s.tool) where id = s.id;
      perform nx_mission_event(m.id, s.id, 'waiting_person', 'Waiting for a person: ' || s.label);
      insert into nx_notifications (user_id, org_id, kind, title, href) values (m.owner_id, m.org_id, 'approval', left('A person is needed: ' || s.label, 200), '/kaju/missions?m=' || m.id);
      continue;
    elsif s.level = 3 and s.approved_at is null then
      update nx_mission_steps set state = 'waiting_approval', needs_approval = true, level = 3,
             why = coalesce(s.why, case when (select external from nx_kaju_tools where name = s.tool) then 'It reaches someone outside StrayPaw.' else 'It changes several records at once.' end) where id = s.id;
      perform nx_mission_event(m.id, s.id, 'waiting_approval', 'Waiting for your approval: ' || s.label);
      insert into nx_notifications (user_id, org_id, kind, title, href) values (m.owner_id, m.org_id, 'approval', left('Approve: ' || s.label, 200), '/kaju/approvals?m=' || m.id);
      continue;
    end if;
    update nx_missions set state = 'running', updated_at = now() where id = m.id and state <> 'running';
    update nx_mission_steps set state = 'running', level = s.level, started_at = coalesce(started_at, now()), attempts = attempts + 1 where id = s.id;
    begin
      v_out := nx_tool_exec(m.owner_id, m.org_id, s.tool, s.input, coalesce(s.idempotency_key, m.id::text || ':' || s.position), m.id, s.id);
      update nx_mission_steps set state = 'done', result = v_out, error = null, next_attempt_at = null, finished_at = now() where id = s.id;
      perform nx_mission_event(m.id, s.id, case when v_out ? 'deduplicated' then 'deduplicated' else 'succeeded' end,
                               case when v_out ? 'deduplicated' then 'Already done earlier, not repeated: ' else 'Done: ' end || s.label, v_out - 'cases');
    exception when others then
      get stacked diagnostics v_err = message_text;
      if s.attempts + 1 >= s.max_attempts then
        update nx_mission_steps set state = 'failed', error = left(v_err, 500), finished_at = now() where id = s.id;
        update nx_missions set error = left(v_err, 500) where id = m.id;
        perform nx_mission_event(m.id, s.id, 'failed', 'Failed after ' || (s.attempts + 1) || ' tries: ' || left(v_err, 200));
        insert into nx_notifications (user_id, org_id, kind, title, body, href) values (m.owner_id, m.org_id, 'system', left('Kaju stopped: ' || m.title, 200), 'A step failed. Nothing after it ran. Open the mission to retry or cancel.', '/kaju/missions?m=' || m.id);
      else
        update nx_mission_steps set state = 'retrying', error = left(v_err, 500), next_attempt_at = now() + make_interval(mins => least(60, power(2, s.attempts + 1)::int)) where id = s.id;
        perform nx_mission_event(m.id, s.id, 'retry_scheduled', 'Will try again in ' || least(60, power(2, s.attempts + 1)::int) || ' min: ' || left(v_err, 200));
      end if;
    end;
  end loop;
end $$;
revoke all on function public.nx_mission_advance(uuid) from public, anon, authenticated;

-- Start a mission from a plan. p_steps: [{ label, tool, input }]. The plan comes from the composer or a model and is
-- untrusted: every tool must be in the registry, and the policy is decided again when each step runs.
create or replace function public.nx_mission_start(p_org uuid, p_title text, p_request jsonb, p_steps jsonb, p_key text default null, p_channel uuid default null, p_deadline timestamptz default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; e jsonb; i int := 0; v_recent int;
begin
  if auth.uid() is null or not nx_is_member(p_org) then raise exception 'You are not a member of this organisation.' using errcode = '42501'; end if;
  if p_key is not null then select id into v_id from nx_missions where owner_id = auth.uid() and start_key = p_key; if v_id is not null then return v_id; end if; end if;
  select count(*) into v_recent from nx_missions where owner_id = auth.uid() and created_at > now() - interval '1 minute';
  if v_recent >= 10 then raise exception 'Too many missions started in the last minute. Try again shortly.' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_steps) <> 'array' or jsonb_array_length(p_steps) not between 1 and 20 then raise exception 'a mission has 1 to 20 steps' using errcode = '22023'; end if;
  if length(coalesce(btrim(p_title), '')) = 0 then raise exception 'a mission needs a title' using errcode = '22023'; end if;
  if p_channel is not null and not nx_can_read_channel(p_channel) then raise exception 'you cannot read that channel' using errcode = '42501'; end if;
  insert into nx_missions (org_id, owner_id, title, request, state, start_key, channel_id, deadline, source)
  values (p_org, auth.uid(), left(btrim(p_title), 240), coalesce(p_request, '{}'::jsonb), 'ready', p_key, p_channel, p_deadline, case when p_channel is null then 'kaju' else 'channel' end)
  returning id into v_id;
  for e in select * from jsonb_array_elements(p_steps) loop
    i := i + 1;
    if not exists (select 1 from nx_kaju_tools where name = e->>'tool') then raise exception 'Kaju has no tool called %', e->>'tool' using errcode = '22023'; end if;
    if jsonb_typeof(coalesce(e->'input', '{}'::jsonb)) <> 'object' then raise exception 'a step''s input is an object' using errcode = '22023'; end if;
    insert into nx_mission_steps (mission_id, position, label, tool, input, idempotency_key, state)
    values (v_id, i, left(coalesce(nullif(btrim(e->>'label'), ''), (select label from nx_kaju_tools where name = e->>'tool')), 240), e->>'tool', coalesce(e->'input', '{}'::jsonb), v_id::text || ':' || i, 'todo');
  end loop;
  perform nx_mission_event(v_id, null, 'created', 'Started with ' || i || case when i = 1 then ' step.' else ' steps.' end);
  perform nx_mission_advance(v_id);
  return v_id;
end $$;
revoke all on function public.nx_mission_start(uuid, text, jsonb, jsonb, text, uuid, timestamptz) from public, anon;
grant execute on function public.nx_mission_start(uuid, text, jsonb, jsonb, text, uuid, timestamptz) to authenticated;

-- A decision on the step that is waiting: approve (optionally with edited input), reject, or "I did it" for a person-only step.
create or replace function public.nx_mission_decide(p_step uuid, p_decision text, p_input jsonb default null, p_note text default null)
returns text language plpgsql security definer set search_path = public as $$
declare s nx_mission_steps; m nx_missions;
begin
  select * into s from nx_mission_steps where id = p_step for update;
  select * into m from nx_missions where id = s.mission_id;
  if m.id is null or m.owner_id <> auth.uid() then raise exception 'Only the person who started this mission decides its steps.' using errcode = '42501'; end if;
  if not nx_is_member(m.org_id) then raise exception 'You are no longer a member of this organisation.' using errcode = '42501'; end if;
  if p_decision = 'approve' and s.state = 'waiting_approval' then
    if p_input is not null then
      if jsonb_typeof(p_input) <> 'object' then raise exception 'a step''s input is an object' using errcode = '22023'; end if;
      update nx_mission_steps set input = p_input where id = s.id;
      perform nx_mission_event(m.id, s.id, 'edited', 'You edited the step before approving it.');
    end if;
    update nx_mission_steps set state = 'todo', approved_by = auth.uid(), approved_at = now() where id = s.id;
    perform nx_mission_event(m.id, s.id, 'approved', 'Approved by ' || nx_person_name(auth.uid()) || ': ' || s.label);
  elsif p_decision = 'reject' and s.state in ('waiting_approval', 'waiting_person') then
    update nx_mission_steps set state = 'skipped', note = left(p_note, 500), finished_at = now() where id = s.id;
    update nx_mission_steps set state = 'cancelled' where mission_id = m.id and state in ('todo', 'retrying', 'waiting_approval', 'waiting_person');
    update nx_missions set state = 'cancelled', updated_at = now() where id = m.id;
    perform nx_mission_event(m.id, s.id, 'rejected', 'Rejected by ' || nx_person_name(auth.uid()) || coalesce(': ' || left(p_note, 200), '') || '. Nothing after it ran.');
    return 'cancelled';
  elsif p_decision = 'done' and s.state = 'waiting_person' then
    update nx_mission_steps set state = 'done', note = left(p_note, 500), approved_by = auth.uid(), approved_at = now(), finished_at = now() where id = s.id;
    perform nx_mission_event(m.id, s.id, 'person_done', nx_person_name(auth.uid()) || ' did it: ' || s.label || coalesce(' (' || left(p_note, 200) || ')', ''));
  else
    raise exception 'That step is not waiting for this decision.' using errcode = 'P0001';
  end if;
  update nx_missions set state = 'running', updated_at = now() where id = m.id;
  return nx_mission_advance(m.id);
end $$;
revoke all on function public.nx_mission_decide(uuid, text, jsonb, text) from public, anon;
grant execute on function public.nx_mission_decide(uuid, text, jsonb, text) to authenticated;

-- Recovery: try a failed step again from the start. Its earlier effect, if any, is found and not repeated.
create or replace function public.nx_mission_retry(p_mission uuid) returns text
language plpgsql security definer set search_path = public as $$
declare m nx_missions; s nx_mission_steps;
begin
  select * into m from nx_missions where id = p_mission for update;
  if m.id is null or m.owner_id <> auth.uid() then raise exception 'Only the person who started this mission can retry it.' using errcode = '42501'; end if;
  select * into s from nx_mission_steps where mission_id = m.id and state in ('failed', 'retrying') order by position limit 1;
  if s.id is null then raise exception 'Nothing to retry.' using errcode = 'P0001'; end if;
  update nx_mission_steps set state = 'todo', attempts = 0, next_attempt_at = null, error = null, finished_at = null where id = s.id;
  update nx_missions set state = 'running', error = null, updated_at = now() where id = m.id;
  perform nx_mission_event(m.id, s.id, 'recovered', 'Retried by ' || nx_person_name(auth.uid()) || ': ' || s.label);
  return nx_mission_advance(m.id);
end $$;
revoke all on function public.nx_mission_retry(uuid) from public, anon;
grant execute on function public.nx_mission_retry(uuid) to authenticated;

-- Cancel: everything not yet done stops, including queued outside messages.
create or replace function public.nx_mission_cancel(p_mission uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update nx_missions set state = 'cancelled', updated_at = now() where id = p_mission and owner_id = auth.uid() and state not in ('completed', 'cancelled');
  if not found then raise exception 'This mission cannot be cancelled.' using errcode = 'P0001'; end if;
  update nx_mission_steps set state = 'cancelled'
   where mission_id = p_mission and state in ('todo', 'retrying', 'waiting_approval', 'waiting_person', 'failed');
  update nx_outbox set status = 'cancelled', updated_at = now() where mission_id = p_mission and status in ('queued', 'failed');
  perform nx_mission_event(p_mission, null, 'cancelled', 'Cancelled by ' || nx_person_name(auth.uid()) || '.');
end $$;
revoke all on function public.nx_mission_cancel(uuid) from public, anon;
grant execute on function public.nx_mission_cancel(uuid) to authenticated;

-- Run my due missions now (the app calls this when the person is here), or every due mission (the scheduler).
create or replace function public.nx_mission_run_mine() returns int
language plpgsql security definer set search_path = public as $$
declare v uuid; n int := 0;
begin
  if auth.uid() is null then return 0; end if;
  for v in select distinct m.id from nx_missions m join nx_mission_steps s on s.mission_id = m.id
            where m.owner_id = auth.uid() and m.state in ('ready', 'running', 'retrying') and s.state in ('todo', 'retrying') and coalesce(s.next_attempt_at, now()) <= now() limit 20 loop
    perform nx_mission_advance(v); n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.nx_mission_run_mine() from public, anon;
grant execute on function public.nx_mission_run_mine() to authenticated;

create or replace function public.nx_mission_tick() returns int
language plpgsql security definer set search_path = public as $$
declare v uuid; n int := 0; d record;
begin
  for v in select distinct m.id from nx_missions m join nx_mission_steps s on s.mission_id = m.id
            where m.state in ('ready', 'running', 'retrying') and s.state in ('todo', 'retrying') and coalesce(s.next_attempt_at, now()) <= now() limit 200 loop
    perform nx_mission_advance(v); n := n + 1;
  end loop;
  -- A deadline passed while the mission still waits: the owner hears about it once.
  for d in select id, org_id, owner_id, title from nx_missions where deadline < now() and not deadline_noted and state not in ('completed', 'cancelled') limit 200 loop
    update nx_missions set deadline_noted = true where id = d.id;
    perform nx_mission_event(d.id, null, 'deadline', 'The deadline passed before the mission finished.');
    insert into nx_notifications (user_id, org_id, kind, title, href) values (d.owner_id, d.org_id, 'system', left('Past its deadline: ' || d.title, 200), '/kaju/missions?m=' || d.id);
  end loop;
  return n;
end $$;
revoke all on function public.nx_mission_tick() from public, anon, authenticated;

-- The scheduler runs due steps every minute, in the database, whether or not anyone has the app open.
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'nx-mission-tick';
    perform cron.schedule('nx-mission-tick', '* * * * *', 'select public.nx_mission_tick()');
  end if;
end $$;

-- ===== 20261116120000_rebuild_research_access =====
-- Research data access (Stage 4 of the rebuild). Additive: two tables and five functions. No existing row changes.
--
-- A research group asks a programme for data without joining it. The programme's coordinators (its data stewards) approve,
-- deny or later revoke. An approved request gives versioned extracts: suppressed, aggregated counts only, never patient
-- rows, computed with the approving steward's own access, for the period and variables approved. Revoking stops new
-- extracts and hides the ones already taken. Every request, decision and extract is kept.

create table if not exists public.nx_data_requests (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.oh_programmes on delete cascade,
  requester_org uuid not null references public.oh_organisations on delete cascade,
  requested_by uuid not null default auth.uid(),
  title text not null check (length(title) between 3 and 160),
  purpose text not null check (length(purpose) between 20 and 2000),
  variables text[] not null check (cardinality(variables) between 1 and 4 and variables <@ array['week', 'area', 'species', 'category']),
  period_from date not null,
  period_to date not null check (period_to >= period_from and period_to - period_from <= 1095),
  status text not null default 'requested' check (status in ('requested', 'approved', 'denied', 'revoked', 'withdrawn')),
  decided_by uuid, decided_at timestamptz,
  decision_note text check (length(decision_note) <= 1000),
  expires_on date,
  created_at timestamptz not null default now()
);
create index if not exists nx_data_requests_programme on public.nx_data_requests (programme_id, status);

create table if not exists public.nx_data_extracts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.nx_data_requests on delete cascade,
  version int not null,
  taken_by uuid not null default auth.uid(),
  taken_at timestamptz not null default now(),
  query jsonb not null,
  suppress_below int not null,
  row_count int not null,
  rows jsonb not null,
  unique (request_id, version)
);

alter table public.nx_data_requests enable row level security;
alter table public.nx_data_extracts enable row level security;

-- The requesting group sees its own requests; the programme's coordinators see the requests made to their programme.
drop policy if exists nx_data_requests_read on public.nx_data_requests;
create policy nx_data_requests_read on public.nx_data_requests for select to authenticated using (
  public.nx_is_member(requester_org) or public.oh_can_manage(programme_id));
-- Extracts are readable by the requesting group only while the approval stands.
drop policy if exists nx_data_extracts_read on public.nx_data_extracts;
create policy nx_data_extracts_read on public.nx_data_extracts for select to authenticated using (
  exists (select 1 from public.nx_data_requests r where r.id = request_id and public.nx_is_member(r.requester_org)
          and r.status = 'approved' and (r.expires_on is null or r.expires_on >= current_date)));
grant select on public.nx_data_requests, public.nx_data_extracts to authenticated;
revoke all on public.nx_data_requests, public.nx_data_extracts from anon;

-- Programmes a research group can ask: names only, of programmes that are running.
create or replace function public.nx_requestable_programmes()
returns table (id uuid, name text, status text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.status from oh_programmes p where auth.uid() is not null and p.status in ('pilot', 'active') order by p.name;
$$;
revoke all on function public.nx_requestable_programmes() from public, anon;
grant execute on function public.nx_requestable_programmes() to authenticated;

create or replace function public.nx_request_data(p_programme uuid, p_org uuid, p_title text, p_purpose text, p_variables text[], p_from date, p_to date)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if not nx_is_member(p_org) then raise exception 'You are not a member of that research group.' using errcode = '42501'; end if;
  if not exists (select 1 from oh_organisations where id = p_org and kind in ('research', 'coordinator', 'state', 'municipal', 'ngo')) then
    raise exception 'Only an organisation can ask for data.' using errcode = '42501'; end if;
  if exists (select 1 from nx_data_requests where requester_org = p_org and programme_id = p_programme and status = 'requested') then
    raise exception 'Your group already has a request waiting with this programme.' using errcode = 'P0001'; end if;
  insert into nx_data_requests (programme_id, requester_org, title, purpose, variables, period_from, period_to)
  values (p_programme, p_org, btrim(p_title), btrim(p_purpose), p_variables, p_from, p_to) returning id into v;
  -- The programme's coordinators hear about it.
  insert into nx_notifications (user_id, org_id, kind, title, body, href)
  select distinct m.user_id, m.organisation_id, 'approval', left('Data request: ' || btrim(p_title), 200), 'A research group asked for programme data. You decide.', '/gov/data-requests'
    from oh_participations pp join oh_organisations o on o.id = pp.organisation_id and o.kind in ('coordinator', 'state')
    join oh_members m on m.organisation_id = o.id and m.role in ('lead', 'coordinator')
   where pp.programme_id = p_programme;
  return v;
end $$;
revoke all on function public.nx_request_data(uuid, uuid, text, text, text[], date, date) from public, anon;
grant execute on function public.nx_request_data(uuid, uuid, text, text, text[], date, date) to authenticated;

-- The steward's decision: approve (optionally until a date), deny, or revoke an approval. Signed by name, kept for audit.
create or replace function public.nx_decide_data_request(p_request uuid, p_decision text, p_note text default null, p_expires_on date default null)
returns text language plpgsql security definer set search_path = public as $$
declare r nx_data_requests;
begin
  select * into r from nx_data_requests where id = p_request for update;
  if r.id is null or not oh_can_manage(r.programme_id) then raise exception 'Only the programme''s coordinators decide on its data.' using errcode = '42501'; end if;
  if p_decision = 'approve' and r.status = 'requested' then
    if not exists (select 1 from oh_my_memberships() m join oh_participations pp on pp.organisation_id = m.organisation_id
                    where pp.programme_id in (select id from oh_programme_line(r.programme_id)) and (oh_can(m.organisation_id, 'analyse') or oh_can(m.organisation_id, 'oversee'))) then
      raise exception 'Approving needs a coordinator or analyst role in this programme.' using errcode = '42501'; end if;
    update nx_data_requests set status = 'approved', decided_by = auth.uid(), decided_at = now(), decision_note = left(p_note, 1000), expires_on = p_expires_on where id = r.id;
  elsif p_decision = 'deny' and r.status = 'requested' then
    update nx_data_requests set status = 'denied', decided_by = auth.uid(), decided_at = now(), decision_note = left(p_note, 1000) where id = r.id;
  elsif p_decision = 'revoke' and r.status = 'approved' then
    update nx_data_requests set status = 'revoked', decided_by = auth.uid(), decided_at = now(), decision_note = left(p_note, 1000) where id = r.id;
  else
    raise exception 'That request is not waiting for this decision.' using errcode = 'P0001';
  end if;
  insert into nx_notifications (user_id, org_id, kind, title, href)
  values (r.requested_by, r.requester_org, 'system', left('Your data request was ' || case p_decision when 'approve' then 'approved' when 'deny' then 'declined' else 'revoked' end || ': ' || r.title, 200), '/research/datasets');
  return p_decision;
end $$;
revoke all on function public.nx_decide_data_request(uuid, text, text, date) from public, anon;
grant execute on function public.nx_decide_data_request(uuid, text, text, date) to authenticated;

create or replace function public.nx_withdraw_data_request(p_request uuid) returns boolean
language sql security definer set search_path = public as $$
  update nx_data_requests set status = 'withdrawn' where id = p_request and status = 'requested' and nx_is_member(requester_org) returning true;
$$;
revoke all on function public.nx_withdraw_data_request(uuid) from public, anon;
grant execute on function public.nx_withdraw_data_request(uuid) to authenticated;

-- Take a versioned extract under an approved request. The counts come from the programme's own suppressed extract, run with
-- the approving steward's access, then cut to the approved period and variables (regrouped, re-suppressed).
create or replace function public.nx_take_extract(p_request uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare r nx_data_requests; v_claims text := current_setting('request.jwt.claims', true); v_raw jsonb; v_rows jsonb; v_sup int; v_ver int; v_id uuid; v_me uuid := auth.uid();
begin
  select * into r from nx_data_requests where id = p_request;
  if r.id is null or not nx_is_member(r.requester_org) then raise exception 'That request is not your group''s.' using errcode = '42501'; end if;
  if r.status <> 'approved' then raise exception 'This request is not approved.' using errcode = '42501'; end if;
  if r.expires_on is not null and r.expires_on < current_date then raise exception 'The approval for this request has expired.' using errcode = '42501'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', r.decided_by, 'role', 'authenticated')::text, true);
  begin
    v_raw := oh_research_extract(r.programme_id, greatest(30, least(1095, (current_date - r.period_from) + 1)));
  exception when others then
    perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
    raise exception 'The approving coordinator no longer has access to this programme''s data, so no extract can be taken. Ask the programme to review the approval.' using errcode = '42501';
  end;
  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
  v_sup := coalesce((v_raw->>'suppress_below')::int, 5);
  select coalesce(jsonb_agg(row_to_json(g)::jsonb - 'n' || jsonb_build_object('exposures', oh_suppress(g.n, v_sup))), '[]'::jsonb) into v_rows from (
    select case when 'week' = any (r.variables) then (e->>'week') end as week,
           case when 'area' = any (r.variables) then (e->>'area') end as area,
           case when 'species' = any (r.variables) then (e->>'species') end as species,
           case when 'category' = any (r.variables) then (e->>'category') end as category,
           sum(nullif(e->>'exposures', '')::int) filter (where (e->>'exposures') ~ '^\d+$') as n
      from jsonb_array_elements(coalesce(v_raw->'rows', '[]'::jsonb)) e
     where (e->>'week')::date between r.period_from and r.period_to and (e->>'exposures') ~ '^\d+$'
     group by 1, 2, 3, 4 order by 1, 2, 3, 4) g;
  select coalesce(max(version), 0) + 1 into v_ver from nx_data_extracts where request_id = r.id;
  insert into nx_data_extracts (request_id, version, taken_by, query, suppress_below, row_count, rows)
  values (r.id, v_ver, v_me, jsonb_build_object('programme_id', r.programme_id, 'source', 'oh_research_extract', 'period_from', r.period_from, 'period_to', r.period_to,
          'variables', r.variables, 'measure', 'exposures (count)', 'note', 'Cells already suppressed in the source are left out before regrouping, then every regrouped cell is suppressed again.'),
          v_sup, jsonb_array_length(v_rows), v_rows) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.nx_take_extract(uuid) from public, anon;
grant execute on function public.nx_take_extract(uuid) to authenticated;

-- ===== 20261116130000_rebuild_saved_views =====
-- Saved views and pinned records (the frame's sidebar). Additive: one table, private to each person.
create table if not exists public.nx_saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  org_id uuid,
  kind text not null check (kind in ('view', 'pin')),
  page text not null check (page ~ '^/' and length(page) <= 200),
  name text not null check (length(name) between 1 and 80),
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object' and length(state::text) <= 4000),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists nx_saved_views_user on public.nx_saved_views (user_id, kind, page);
alter table public.nx_saved_views enable row level security;
drop policy if exists nx_saved_views_own on public.nx_saved_views;
create policy nx_saved_views_own on public.nx_saved_views for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (org_id is null or public.nx_is_member(org_id)));
grant select, insert, update, delete on public.nx_saved_views to authenticated;
revoke all on public.nx_saved_views from anon;

-- ===== 20261116140000_rebuild_automations_v2 =====
-- Automations for every workspace (Stage 3 of the rebuild), and consented PEP reminders. Additive: new tables and
-- functions in public and health. The earlier NGO-only automations stay as they are.
--
-- Each rule is a fixed, explainable query. A run counts what it finds and tells the right people inside StrayPaw with a
-- notification that carries a count and a link, never a patient's details. Nothing is decided for anyone: a rule that
-- touches clinical, laboratory, verification or data-access work only says that something is waiting. A run is not
-- repeated for the same period; a failed run is recorded and tried again on the next tick.

-- People of an organisation by role, across the three membership models. Internal only.
create or replace function public.nx_org_members(p_org uuid, p_roles text[] default null) returns setof uuid
language sql stable security definer set search_path = public as $$
  select user_id from ngo_members where ngo_id = p_org and (p_roles is null or role = any (p_roles))
  union select user_id from oh_members where organisation_id = p_org and (p_roles is null or role = any (p_roles))
  union select user_id from review_office_members where office_id = p_org and (p_roles is null or role = any (p_roles) or p_roles && array['lead', 'reviewer']);
$$;
revoke all on function public.nx_org_members(uuid, text[]) from public, anon, authenticated;

create table if not exists public.nx_automations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  rule text not null check (rule in ('overdue_tasks', 'followups_due', 'possible_duplicates', 'training_due', 'weekly_summary',
    'pep_doses_due', 'pep_missed', 'pep_reminders', 'referrals_waiting', 'services_stale', 'samples_overdue', 'results_released',
    'packages_waiting', 'alerts_open', 'data_requests_waiting')),
  name text not null check (length(name) between 1 and 120),
  every text not null default 'day' check (every in ('hour', 'day', 'week')),
  params jsonb not null default '{}'::jsonb check (jsonb_typeof(params) = 'object'),
  audience text not null default 'leads' check (audience in ('leads', 'everyone', 'clinical', 'lab')),
  status text not null default 'active' check (status in ('active', 'paused')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_run_at timestamptz,
  unique (org_id, rule)
);
create table if not exists public.nx_automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.nx_automations on delete cascade,
  org_id uuid not null,
  dedupe_key text not null,
  status text not null check (status in ('succeeded', 'skipped', 'failed')),
  found int, delivered int not null default 0,
  summary text not null default '',
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (automation_id, dedupe_key)
);
create index if not exists nx_automation_runs_org on public.nx_automation_runs (org_id, started_at desc);
alter table public.nx_automations enable row level security;
alter table public.nx_automation_runs enable row level security;
drop policy if exists nx_automations_read on public.nx_automations;
create policy nx_automations_read on public.nx_automations for select to authenticated using (public.nx_is_member(org_id));
drop policy if exists nx_automation_runs_read on public.nx_automation_runs;
create policy nx_automation_runs_read on public.nx_automation_runs for select to authenticated using (public.nx_is_member(org_id));
grant select on public.nx_automations, public.nx_automation_runs to authenticated;
revoke all on public.nx_automations, public.nx_automation_runs from anon;

create or replace function public.nx_automation_manager(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$ select coalesce(nx_org_role(p_org), '') in ('admin', 'lead', 'coordinator') $$;
revoke all on function public.nx_automation_manager(uuid) from public, anon;
grant execute on function public.nx_automation_manager(uuid) to authenticated;

create or replace function public.nx_automation_save(p_org uuid, p_rule text, p_name text, p_every text default 'day', p_params jsonb default '{}', p_audience text default 'leads')
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if not nx_automation_manager(p_org) then raise exception 'Only a lead or coordinator turns automations on.' using errcode = '42501'; end if;
  insert into nx_automations (org_id, rule, name, every, params, audience, created_by)
  values (p_org, p_rule, left(btrim(p_name), 120), coalesce(p_every, 'day'), coalesce(p_params, '{}'), coalesce(p_audience, 'leads'), auth.uid())
  on conflict (org_id, rule) do update set name = excluded.name, every = excluded.every, params = excluded.params, audience = excluded.audience, status = 'active', updated_at = now()
  returning id into v;
  return v;
end $$;
create or replace function public.nx_automation_set(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare org uuid;
begin
  select org_id into org from nx_automations where id = p_id;
  if org is null or not nx_automation_manager(org) then raise exception 'Only a lead or coordinator changes automations.' using errcode = '42501'; end if;
  if p_status = 'removed' then delete from nx_automations where id = p_id;
  elsif p_status in ('active', 'paused') then update nx_automations set status = p_status, updated_at = now() where id = p_id;
  else raise exception 'active, paused or removed' using errcode = '22023'; end if;
end $$;
revoke all on function public.nx_automation_save(uuid, text, text, text, jsonb, text), public.nx_automation_set(uuid, text) from public, anon;
grant execute on function public.nx_automation_save(uuid, text, text, text, jsonb, text), public.nx_automation_set(uuid, text) to authenticated;

-- Consented PEP reminders: one row per dose and day, for patients who agreed to reminders, from the clinician's own
-- schedule. Kept in the clinical schema, never readable through the API; a provider sends them once one is connected,
-- and until then each is recorded as not connected. Staff see a masked log through nx_pep_reminders().
create table if not exists health.reminder_outbox (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null,
  dose_id uuid not null references health.pep_doses on delete cascade,
  for_day date not null,
  channel text not null default 'sms' check (channel in ('sms', 'whatsapp')),
  phone text not null,
  body text not null check (length(body) <= 320),
  vars jsonb not null default '[]'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'not_connected', 'cancelled')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  provider_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dose_id, for_day)
);
alter table health.reminder_outbox enable row level security;
revoke all on health.reminder_outbox from public, anon, authenticated;

create or replace function public.nx_pep_reminders(p_facility uuid)
returns table (id uuid, for_day date, dose_no int, code text, phone_masked text, status text, attempts int, last_error text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.for_day, d.dose_no, e.code, '•••• ' || right(r.phone, 3), r.status, r.attempts, r.last_error, r.updated_at
    from health.reminder_outbox r join health.pep_doses d on d.id = r.dose_id join health.pep_courses c on c.id = d.course_id join health.exposures e on e.id = c.exposure_id
   where r.facility_id = p_facility and oh_can(p_facility, 'view_register') order by r.created_at desc limit 100;
$$;
revoke all on function public.nx_pep_reminders(uuid) from public, anon;
grant execute on function public.nx_pep_reminders(uuid) to authenticated;

-- For the delivery worker (service role only): reminders due now, and their outcome.
create or replace function public.nx_pep_outbox_due(p_limit int default 50)
returns table (id uuid, channel text, phone text, body text, vars jsonb, attempts int)
language sql security definer set search_path = public as $$
  select id, channel, phone, body, vars, attempts from health.reminder_outbox where status = 'queued' and next_attempt_at <= now() order by next_attempt_at limit least(p_limit, 200);
$$;
create or replace function public.nx_pep_outbox_mark(p_id uuid, p_status text, p_error text default null, p_ref text default null)
returns void language sql security definer set search_path = public as $$
  update health.reminder_outbox set status = case when p_status = 'retry' then 'queued' else p_status end, attempts = attempts + case when p_status in ('sent', 'failed', 'retry') then 1 else 0 end,
         next_attempt_at = case when p_status = 'retry' then now() + make_interval(mins => least(60, power(2, attempts + 1)::int)) else next_attempt_at end,
         last_error = left(p_error, 300), provider_ref = left(p_ref, 200), updated_at = now() where id = p_id;
$$;
revoke all on function public.nx_pep_outbox_due(int), public.nx_pep_outbox_mark(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.nx_pep_outbox_due(int), public.nx_pep_outbox_mark(uuid, text, text, text) to service_role;

-- Run one automation. Returns what happened, in words.
create or replace function public.nx_automation_run(p_id uuid, p_now boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a nx_automations; k text; n int := 0; said text := ''; href text; sent int := 0; who uuid[]; v_run uuid; days int; hours int; td date := (now() at time zone 'Asia/Kolkata')::date;
  roles text[]; extra int := 0; u uuid;
begin
  select * into a from nx_automations where id = p_id for update;
  if a.id is null then raise exception 'Automation not found'; end if;
  if auth.uid() is not null and not nx_automation_manager(a.org_id) then raise exception 'Only a lead or coordinator runs automations.' using errcode = '42501'; end if;
  if a.status <> 'active' and not p_now then return jsonb_build_object('status', 'skipped', 'summary', 'Paused'); end if;
  k := case a.every when 'hour' then to_char(now(), 'YYYY-MM-DD"T"HH24') when 'week' then to_char(td, 'IYYY"-W"IW') else td::text end || case when p_now then ':now:' || floor(extract(epoch from clock_timestamp()))::text else '' end;
  if exists (select 1 from nx_automation_runs where automation_id = a.id and dedupe_key = k and status <> 'failed') then return jsonb_build_object('status', 'skipped', 'summary', 'Already ran for this period'); end if;
  days := greatest(1, least(90, coalesce((a.params->>'days')::int, 3)));
  hours := greatest(1, least(240, coalesce((a.params->>'hours')::int, 24)));
  roles := case a.audience when 'everyone' then null when 'clinical' then array['lead', 'clinician', 'nurse', 'records'] when 'lab' then array['lead', 'lab_scientist'] else array['admin', 'lead', 'coordinator'] end;
  begin
    if a.rule = 'overdue_tasks' then
      select count(*) into n from nx_tasks where org_id = a.org_id and state = 'open' and due_on < td;
      -- Each person hears about their own overdue tasks; leads hear about those overdue for more than the escalation days.
      for u in select distinct assignee_id from nx_tasks where org_id = a.org_id and state = 'open' and due_on < td and assignee_id is not null loop
        insert into nx_notifications (user_id, org_id, kind, title, href) select u, a.org_id, 'reminder', left(count(*) || ' of your tasks ' || case when count(*) = 1 then 'is' else 'are' end || ' overdue', 200), '/ngo/today'
          from nx_tasks where org_id = a.org_id and state = 'open' and due_on < td and assignee_id = u;
        sent := sent + 1;
      end loop;
      select count(*) into extra from nx_tasks where org_id = a.org_id and state = 'open' and due_on < td - days;
      said := n || ' open ' || case when n = 1 then 'task is' else 'tasks are' end || ' overdue' || case when extra > 0 then '; ' || extra || ' for more than ' || days || ' days' else '' end;
      href := '/ngo/today';
      if extra = 0 then roles := array['__nobody__']; end if;
    elsif a.rule = 'followups_due' then
      select count(*) into n from animal_followups f where f.ngo_id = a.org_id and f.status in ('upcoming', 'postponed') and f.due_at < now() + interval '1 day';
      said := n || ' follow-up' || case when n = 1 then ' is' else 's are' end || ' due by tomorrow or overdue'; href := '/ngo/operations';
    elsif a.rule = 'possible_duplicates' then
      select count(*) into n from dogs where ngo_id = a.org_id and identity_state = 'possible_duplicate';
      said := n || ' animal record' || case when n = 1 then ' may be a duplicate' else 's may be duplicates' end || '. A person decides; nothing is merged.'; href := '/ngo/animals';
    elsif a.rule = 'training_due' then
      if to_regclass('public.training_assignments') is not null then
        execute 'select count(*) from training_assignments where ngo_id = $1 and due_on is not null and due_on <= $2' into n using a.org_id, td + days;
      end if;
      said := n || ' training assignment' || case when n = 1 then ' is' else 's are' end || ' due within ' || days || ' days'; href := '/ngo/training';
    elsif a.rule = 'weekly_summary' then
      select count(*) into n from cases where ngo_id = a.org_id and resolved_at is null;
      select count(*) into extra from nx_tasks where org_id = a.org_id and state = 'open';
      said := n || ' open cases, ' || extra || ' open tasks, ' || (select count(*) from animal_followups where ngo_id = a.org_id and status = 'upcoming' and due_at < now()) || ' overdue follow-ups, '
        || (select count(*) from nx_missions where org_id = a.org_id and state = 'waiting_person') || ' Kaju missions waiting';
      n := n + extra; href := '/ngo/today';
    elsif a.rule = 'pep_doses_due' then
      select count(*) into n from health.pep_doses d join health.pep_courses c on c.id = d.course_id join health.exposures e on e.id = c.exposure_id
       where e.facility_id = a.org_id and c.status = 'active' and d.status = 'due' and d.due_on between td and td + 1;
      said := n || ' PEP dose' || case when n = 1 then ' is' else 's are' end || ' due today or tomorrow, as prescribed'; href := '/health/pep';
    elsif a.rule = 'pep_missed' then
      select count(*) into n from health.pep_doses d join health.pep_courses c on c.id = d.course_id join health.exposures e on e.id = c.exposure_id
       where e.facility_id = a.org_id and c.status = 'active' and d.status = 'due' and d.due_on < td;
      said := n || ' prescribed PEP dose' || case when n = 1 then ' is' else 's are' end || ' past the due date. A clinician decides what happens next.'; href := '/health/pep';
    elsif a.rule = 'pep_reminders' then
      insert into health.reminder_outbox (facility_id, dose_id, for_day, phone, body, vars)
      select a.org_id, d.id, td, e.contact_phone,
             left('Reminder from ' || coalesce(o.short_name, o.name) || ': your anti-rabies dose ' || d.dose_no || ' is due on ' || to_char(d.due_on, 'DD Mon') || '. Please visit the clinic.', 320),
             jsonb_build_array(left(coalesce(o.short_name, o.name), 30), d.dose_no::text, to_char(d.due_on, 'DD Mon'))
        from health.pep_doses d join health.pep_courses c on c.id = d.course_id join health.exposures e on e.id = c.exposure_id join oh_organisations o on o.id = e.facility_id
       where e.facility_id = a.org_id and c.status = 'active' and d.status = 'due' and d.due_on between td and td + 1 and e.reminder_consent and e.contact_phone is not null
      on conflict (dose_id, for_day) do nothing;
      get diagnostics n = row_count;
      said := n || ' consented reminder' || case when n = 1 then '' else 's' end || ' queued from the clinicians'' schedule. Sent only through a connected SMS or WhatsApp account; until then each is recorded as not connected.'; href := '/health/pep';
    elsif a.rule = 'referrals_waiting' then
      select count(*) into n from oh_handoffs where to_org = a.org_id and status = 'open' and created_at < now() - make_interval(hours => hours);
      said := n || ' referral' || case when n = 1 then ' or handoff has' else 's or handoffs have' end || ' waited more than ' || hours || ' hours for your answer'; href := '/health/referrals';
    elsif a.rule = 'services_stale' then
      select count(*) into n from oh_service_status where organisation_id = a.org_id and (verified_at < now() - make_interval(days => days) or valid_until < now());
      said := n || ' service' || case when n = 1 then ' was' else 's were' end || ' last confirmed more than ' || days || ' days ago. Confirm or update them so nobody is sent on stale information.'; href := '/health/facilities';
    elsif a.rule = 'samples_overdue' then
      select count(*) into n from oh_samples where laboratory_id = a.org_id and status in ('received', 'testing') and created_at < now() - make_interval(days => days);
      said := n || ' sample' || case when n = 1 then ' has' else 's have' end || ' been in the laboratory more than ' || days || ' days without a result'; href := '/health/samples';
    elsif a.rule = 'results_released' then
      select count(*) into n from oh_samples where submitted_by = a.org_id and status = 'resulted' and resulted_at > coalesce(a.last_run_at, now() - interval '1 day');
      said := n || ' laboratory result' || case when n = 1 then ' was' else 's were' end || ' released for samples you sent'; href := '/health/samples';
    elsif a.rule = 'packages_waiting' then
      if to_regclass('public.report_packages') is not null then
        execute 'select count(*) from report_packages where office_id = $1 and status = ''submitted'' and submitted_at < now() - make_interval(days => $2)' into n using a.org_id, days;
      end if;
      said := n || ' report package' || case when n = 1 then ' has' else 's have' end || ' waited more than ' || days || ' days for a decision. A named reviewer decides.'; href := '/gov/verification';
    elsif a.rule = 'alerts_open' then
      select count(*) into n from oh_participations pp, lateral jsonb_array_elements(coalesce(oh_alerts(pp.programme_id), '[]'::jsonb)) x
       where pp.organisation_id = a.org_id and x->'ack' = 'null'::jsonb;
      said := n || ' signal' || case when n = 1 then ' is' else 's are' end || ' waiting for review. A signal is not an outbreak declaration.'; href := '/gov/surveillance';
    elsif a.rule = 'data_requests_waiting' then
      select count(*) into n from nx_data_requests r join oh_participations pp on pp.programme_id = r.programme_id where pp.organisation_id = a.org_id and r.status = 'requested' and r.created_at < now() - make_interval(days => days);
      said := n || ' data request' || case when n = 1 then ' has' else 's have' end || ' waited more than ' || days || ' days for your decision'; href := '/gov/data-requests';
    end if;
    if n = 0 then
      insert into nx_automation_runs (automation_id, org_id, dedupe_key, status, found, summary, finished_at) values (a.id, a.org_id, k, 'skipped', 0, 'Nothing found', now())
      on conflict (automation_id, dedupe_key) do update set status = 'skipped', found = 0, summary = 'Nothing found', error = null, finished_at = now();
    else
      insert into nx_notifications (user_id, org_id, kind, title, body, href)
      select m, a.org_id, case when a.rule = 'weekly_summary' then 'digest' else 'reminder' end, left(a.name, 200), left(said, 500), href from nx_org_members(a.org_id, roles) m;
      get diagnostics extra = row_count;
      sent := sent + extra;
      insert into nx_automation_runs (automation_id, org_id, dedupe_key, status, found, delivered, summary, finished_at) values (a.id, a.org_id, k, 'succeeded', n, sent, left(said, 500), now())
      on conflict (automation_id, dedupe_key) do update set status = 'succeeded', found = excluded.found, delivered = excluded.delivered, summary = excluded.summary, error = null, finished_at = now();
    end if;
    update nx_automations set last_run_at = now() where id = a.id;
    return jsonb_build_object('status', case when n = 0 then 'skipped' else 'succeeded' end, 'found', n, 'delivered', sent, 'summary', said);
  exception when others then
    insert into nx_automation_runs (automation_id, org_id, dedupe_key, status, summary, error, finished_at) values (a.id, a.org_id, k, 'failed', 'Could not finish', left(sqlerrm, 300), now())
    on conflict (automation_id, dedupe_key) do update set status = 'failed', error = excluded.error, finished_at = now();
    return jsonb_build_object('status', 'failed', 'error', left(sqlerrm, 300));
  end;
end $$;
revoke all on function public.nx_automation_run(uuid, boolean) from public, anon;
grant execute on function public.nx_automation_run(uuid, boolean) to authenticated;

-- Every active automation that is due, run by the database's own scheduler.
create or replace function public.nx_automations_tick() returns int
language plpgsql security definer set search_path = public as $$
declare v uuid; n int := 0;
begin
  for v in select id from nx_automations where status = 'active' and (last_run_at is null
             or (every = 'hour' and last_run_at < date_trunc('hour', now()))
             or (every = 'day' and (last_run_at at time zone 'Asia/Kolkata')::date < (now() at time zone 'Asia/Kolkata')::date and extract(hour from now() at time zone 'Asia/Kolkata') >= 7)
             or (every = 'week' and to_char(last_run_at at time zone 'Asia/Kolkata', 'IYYY-IW') < to_char(now() at time zone 'Asia/Kolkata', 'IYYY-IW') and extract(isodow from now() at time zone 'Asia/Kolkata') = 1 and extract(hour from now() at time zone 'Asia/Kolkata') >= 7))
           limit 500 loop
    perform nx_automation_run(v, false); n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.nx_automations_tick() from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'nx-automations-tick';
    perform cron.schedule('nx-automations-tick', '7 * * * *', 'select public.nx_automations_tick()');
  end if;
end $$;

-- ===== 20261116150000_rebuild_vet_clinics_and_joining =====
-- Independent veterinary clinics, and finding an organisation to ask to join. Additive: new tables and functions, one
-- column on appointments, the organisation kind list widened by one, two appointment policies replaced with the same
-- rules plus the clinic's own patients. No existing row changes.

-- Veterinary clinics as organisations of their own ------------------------------------------------------------------
alter table public.oh_organisations drop constraint if exists oh_organisations_kind_check;
alter table public.oh_organisations add constraint oh_organisations_kind_check
  check (kind in ('coordinator', 'municipal', 'state', 'hospital', 'clinic', 'laboratory', 'ngo', 'research', 'training', 'veterinary'));

create or replace function public.nx_my_workspaces()
returns table (org_id uuid, name text, short_name text, source text, kind text, workspace text, role text, sample boolean)
language sql stable security definer set search_path = public as $$
  select n.id, n.name, null::text, 'ngo', 'ngo', 'ngo', m.role, coalesce(n.demo_mode, false)
    from ngo_members m join ngos n on n.id = m.ngo_id where m.user_id = auth.uid()
  union all
  select n.id, n.name, null::text, 'ngo_vet', 'veterinary', 'healthcare', m.role, coalesce(n.demo_mode, false)
    from ngo_members m join ngos n on n.id = m.ngo_id where m.user_id = auth.uid() and m.role = 'veterinarian'
  union all
  select o.id, o.name, o.short_name, case when o.kind = 'veterinary' then 'vet_clinic' else 'programme_partner' end, o.kind,
         case when o.kind in ('hospital', 'clinic', 'laboratory', 'veterinary') then 'healthcare' when o.kind = 'research' then 'research' else 'government' end,
         m.role, coalesce(o.illustrative, false)
    from oh_members m join oh_organisations o on o.id = m.organisation_id
   where m.user_id = auth.uid() and o.kind <> 'ngo'
  union all
  select r.id, r.name, null::text, 'review_office', 'municipal', 'government', m.role, false
    from review_office_members m join review_offices r on r.id = m.office_id where m.user_id = auth.uid();
$$;

-- A veterinary clinic registers itself. Its founder becomes its lead; nothing else is granted.
create or replace function public.nx_register_vet_clinic(p_name text, p_city text default null, p_display_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  if length(coalesce(btrim(p_name), '')) < 3 then raise exception 'Give the clinic its name.' using errcode = '22023'; end if;
  if (select count(*) from oh_members m join oh_organisations o on o.id = m.organisation_id where m.user_id = auth.uid() and o.kind = 'veterinary' and m.created_at > now() - interval '1 day') >= 3 then
    raise exception 'You registered several clinics today. Try again tomorrow, or ask us.' using errcode = 'P0001'; end if;
  insert into oh_organisations (kind, name, address) values ('veterinary', left(btrim(p_name), 160), nullif(left(btrim(coalesce(p_city, '')), 300), '')) returning id into v;
  insert into oh_members (organisation_id, user_id, role, display_name) values (v, auth.uid(), 'lead', nullif(left(btrim(coalesce(p_display_name, '')), 80), ''));
  return v;
end $$;
revoke all on function public.nx_register_vet_clinic(text, text, text) from public, anon;
grant execute on function public.nx_register_vet_clinic(text, text, text) to authenticated;

create table if not exists public.nx_vet_patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.oh_organisations on delete cascade,
  name text not null check (length(name) between 1 and 120),
  species text not null default 'dog' check (species in ('dog', 'cat', 'other')),
  sex text not null default 'unknown' check (sex in ('female', 'male', 'unknown')),
  age_note text check (length(age_note) <= 60),
  marks text check (length(marks) <= 300),
  brought_by text not null default 'community' check (brought_by in ('community', 'owner', 'ngo', 'unknown')),
  ngo_id uuid references public.ngos on delete set null,
  dog_id uuid references public.dogs on delete set null,
  notes text check (length(notes) <= 2000),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists nx_vet_patients_clinic on public.nx_vet_patients (clinic_id, created_at desc);
create table if not exists public.nx_vet_encounters (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.oh_organisations on delete cascade,
  patient_id uuid not null references public.nx_vet_patients on delete cascade,
  kind text not null check (kind in ('exam', 'vaccination', 'sterilisation', 'treatment', 'followup', 'other')),
  occurred_on date not null default current_date,
  findings text check (length(findings) <= 4000),
  diagnosis text check (length(diagnosis) <= 1000),
  treatment text check (length(treatment) <= 2000),
  vaccine text check (length(vaccine) <= 120),
  batch text check (length(batch) <= 60),
  next_due date,
  clinician_name text check (length(clinician_name) <= 120),
  signed_by uuid, signed_at timestamptz,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists nx_vet_encounters_patient on public.nx_vet_encounters (patient_id, occurred_on desc);
alter table public.nx_vet_patients enable row level security;
alter table public.nx_vet_encounters enable row level security;
drop policy if exists nx_vet_patients_rw on public.nx_vet_patients;
create policy nx_vet_patients_rw on public.nx_vet_patients for all to authenticated
  using (public.nx_is_member(clinic_id))
  with check (public.nx_is_member(clinic_id) and (dog_id is null or ngo_id is not null));
drop policy if exists nx_vet_encounters_read on public.nx_vet_encounters;
create policy nx_vet_encounters_read on public.nx_vet_encounters for select to authenticated using (public.nx_is_member(clinic_id));
-- Drafts are written by the clinic's staff; only the signing function marks one signed, and a signed record does not change.
drop policy if exists nx_vet_encounters_add on public.nx_vet_encounters;
create policy nx_vet_encounters_add on public.nx_vet_encounters for insert to authenticated with check (
  public.nx_is_member(clinic_id) and created_by = auth.uid() and signed_at is null and signed_by is null
  and exists (select 1 from public.nx_vet_patients p where p.id = patient_id and p.clinic_id = clinic_id));
drop policy if exists nx_vet_encounters_edit on public.nx_vet_encounters;
create policy nx_vet_encounters_edit on public.nx_vet_encounters for update to authenticated
  using (public.nx_is_member(clinic_id) and signed_at is null) with check (public.nx_is_member(clinic_id) and signed_at is null and signed_by is null);
grant select, insert, update on public.nx_vet_patients, public.nx_vet_encounters to authenticated;
revoke all on public.nx_vet_patients, public.nx_vet_encounters from anon;

-- A clinical record is signed by a veterinarian (clinician role) or the clinic's lead, never by anyone else or by Kaju.
create or replace function public.nx_vet_sign(p_encounter uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare e nx_vet_encounters; r text;
begin
  select * into e from nx_vet_encounters where id = p_encounter for update;
  if e.id is null or not nx_is_member(e.clinic_id) then raise exception 'not found' using errcode = '42501'; end if;
  select role into r from oh_members where organisation_id = e.clinic_id and user_id = auth.uid();
  if coalesce(r, '') not in ('clinician', 'lead') then raise exception 'Only a veterinarian of this clinic signs clinical records.' using errcode = '42501'; end if;
  if e.signed_at is not null then return true; end if;
  update nx_vet_encounters set signed_by = auth.uid(), signed_at = now(), clinician_name = coalesce(clinician_name, (select display_name from oh_members where organisation_id = e.clinic_id and user_id = auth.uid())) where id = e.id;
  return true;
end $$;
revoke all on function public.nx_vet_sign(uuid) from public, anon;
grant execute on function public.nx_vet_sign(uuid) to authenticated;

-- What a partner NGO sees of animals it brought to a clinic: that something was done and when the next visit is due.
-- Never findings, diagnosis or treatment.
create or replace function public.nx_vet_shared_for_ngo(p_ngo uuid)
returns table (patient_id uuid, dog_id uuid, patient_name text, clinic text, last_kind text, last_on date, next_due date)
language sql stable security definer set search_path = public as $$
  select p.id, p.dog_id, p.name, o.name,
         (select e.kind from nx_vet_encounters e where e.patient_id = p.id and e.signed_at is not null order by e.occurred_on desc limit 1),
         (select e.occurred_on from nx_vet_encounters e where e.patient_id = p.id and e.signed_at is not null order by e.occurred_on desc limit 1),
         (select min(e.next_due) from nx_vet_encounters e where e.patient_id = p.id and e.signed_at is not null and e.next_due >= current_date)
    from nx_vet_patients p join oh_organisations o on o.id = p.clinic_id
   where p.ngo_id = p_ngo and exists (select 1 from ngo_members m where m.ngo_id = p_ngo and m.user_id = auth.uid());
$$;
revoke all on function public.nx_vet_shared_for_ngo(uuid) from public, anon;
grant execute on function public.nx_vet_shared_for_ngo(uuid) to authenticated;

-- A clinic's appointments can be for its own patients.
alter table public.nx_appointments add column if not exists vet_patient_id uuid references public.nx_vet_patients on delete set null;
drop policy if exists nx_appointments_add on public.nx_appointments;
create policy nx_appointments_add on public.nx_appointments for insert to authenticated with check (
  public.nx_is_member(org_id) and created_by = auth.uid()
  and (dog_id is null or exists (select 1 from public.dogs d where d.id = dog_id and d.ngo_id = org_id))
  and (case_id is null or exists (select 1 from public.cases c where c.id = case_id and c.ngo_id = org_id))
  and (vet_patient_id is null or exists (select 1 from public.nx_vet_patients p where p.id = vet_patient_id and p.clinic_id = org_id)));
drop policy if exists nx_appointments_change on public.nx_appointments;
create policy nx_appointments_change on public.nx_appointments for update to authenticated using (public.nx_is_member(org_id)) with check (
  public.nx_is_member(org_id)
  and (dog_id is null or exists (select 1 from public.dogs d where d.id = dog_id and d.ngo_id = org_id))
  and (case_id is null or exists (select 1 from public.cases c where c.id = case_id and c.ngo_id = org_id))
  and (vet_patient_id is null or exists (select 1 from public.nx_vet_patients p where p.id = vet_patient_id and p.clinic_id = org_id)));

-- Finding an organisation and asking to join ------------------------------------------------------------------------
-- Searchable: NGOs and organisations that chose to be listed. Reviewing offices are never listed or self-joined.
create or replace function public.nx_find_orgs(p_q text)
returns table (id uuid, name text, kind text, place text)
language sql stable security definer set search_path = public as $$
  select * from (
    select n.id, n.name, 'ngo'::text, n.city from ngos n where coalesce(n.demo_mode, false) = false and n.name ilike '%' || replace(replace(btrim(p_q), '%', ''), '_', '') || '%'
    union all
    select o.id, o.name, o.kind, o.address from oh_organisations o where o.listed_publicly and o.kind not in ('ngo', 'coordinator', 'state', 'municipal') and o.name ilike '%' || replace(replace(btrim(p_q), '%', ''), '_', '') || '%'
  ) x where auth.uid() is not null and length(btrim(p_q)) >= 3 order by 2 limit 20;
$$;
revoke all on function public.nx_find_orgs(text) from public, anon;
grant execute on function public.nx_find_orgs(text) to authenticated;

create table if not exists public.nx_join_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  org_kind text not null check (org_kind in ('ngo', 'oh')),
  user_id uuid not null default auth.uid(),
  display_name text check (length(display_name) <= 80),
  note text check (length(note) <= 500),
  status text not null default 'requested' check (status in ('requested', 'approved', 'declined', 'withdrawn')),
  role text,
  decided_by uuid, decided_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists nx_join_requests_open on public.nx_join_requests (org_id, user_id) where status = 'requested';
alter table public.nx_join_requests enable row level security;
drop policy if exists nx_join_requests_read on public.nx_join_requests;
create policy nx_join_requests_read on public.nx_join_requests for select to authenticated using (
  user_id = auth.uid() or coalesce(public.nx_org_role(org_id), '') in ('admin', 'lead', 'coordinator'));
grant select on public.nx_join_requests to authenticated;
revoke all on public.nx_join_requests from anon;

create or replace function public.nx_request_join(p_org uuid, p_note text default null, p_name text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid; k text;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  if nx_is_member(p_org) then raise exception 'You are already a member.' using errcode = 'P0001'; end if;
  k := case when exists (select 1 from ngos where id = p_org) then 'ngo' when exists (select 1 from oh_organisations where id = p_org and listed_publicly and kind not in ('ngo', 'coordinator', 'state', 'municipal')) then 'oh' end;
  if k is null then raise exception 'That organisation does not take requests to join. Ask it for an invitation code.' using errcode = '42501'; end if;
  if (select count(*) from nx_join_requests where user_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then raise exception 'You sent several requests today. Try again tomorrow.' using errcode = 'P0001'; end if;
  insert into nx_join_requests (org_id, org_kind, display_name, note) values (p_org, k, nullif(left(btrim(coalesce(p_name, '')), 80), ''), nullif(left(btrim(coalesce(p_note, '')), 500), '')) returning id into v;
  insert into nx_notifications (user_id, org_id, kind, title, href)
  select m, p_org, 'approval', left(coalesce(nullif(btrim(p_name), ''), 'Someone') || ' asked to join', 200), '/requests'
    from nx_org_members(p_org, array['admin', 'lead', 'coordinator']) m;
  return v;
end $$;

-- A lead decides, and chooses the role. Roles that carry clinical, laboratory or government authority are given only
-- by a lead of that organisation, never chosen by the person asking.
create or replace function public.nx_decide_join(p_request uuid, p_decision text, p_role text default null) returns text
language plpgsql security definer set search_path = public as $$
declare r nx_join_requests;
begin
  select * into r from nx_join_requests where id = p_request for update;
  if r.id is null or coalesce(nx_org_role(r.org_id), '') not in ('admin', 'lead') then raise exception 'Only a lead of the organisation decides.' using errcode = '42501'; end if;
  if r.status <> 'requested' then raise exception 'That request was already decided.' using errcode = 'P0001'; end if;
  if p_decision = 'approve' then
    if r.org_kind = 'ngo' then
      if coalesce(p_role, 'member') not in ('member', 'coordinator', 'veterinarian', 'field_worker') then raise exception 'Choose member, coordinator, veterinarian or field worker.' using errcode = '22023'; end if;
      insert into ngo_members (ngo_id, user_id, role) values (r.org_id, r.user_id, coalesce(p_role, 'member')) on conflict do nothing;
    else
      if coalesce(p_role, '') not in ('coordinator', 'clinician', 'nurse', 'records', 'lab_scientist', 'analyst', 'field', 'trainer') then raise exception 'Choose the role this person has here.' using errcode = '22023'; end if;
      insert into oh_members (organisation_id, user_id, role, display_name) values (r.org_id, r.user_id, p_role, r.display_name) on conflict do nothing;
    end if;
    update nx_join_requests set status = 'approved', role = coalesce(p_role, 'member'), decided_by = auth.uid(), decided_at = now() where id = r.id;
  elsif p_decision = 'decline' then
    update nx_join_requests set status = 'declined', decided_by = auth.uid(), decided_at = now() where id = r.id;
  else raise exception 'approve or decline' using errcode = '22023'; end if;
  insert into nx_notifications (user_id, org_id, kind, title, href) values (r.user_id, r.org_id, 'system', case when p_decision = 'approve' then 'Your request to join was accepted' else 'Your request to join was declined' end, '/home');
  return p_decision;
end $$;
revoke all on function public.nx_request_join(uuid, text, text), public.nx_decide_join(uuid, text, text) from public, anon;
grant execute on function public.nx_request_join(uuid, text, text), public.nx_decide_join(uuid, text, text) to authenticated;

-- ===== 20261116160000_rebuild_bite_referral_link =====
-- A bite recorded at the facility a person was referred to keeps the referral it came from.
-- Before this, the clinic could say only that the bite came "from a referral" and the link was lost: oh_record_exposure had
-- no parameter for it. This adds p_transfer (default NULL, so every existing caller keeps working), checks the referral was
-- sent to this facility and is still open, stores the link once per referral, and marks the referral arrived if it was not.
--
-- Additive and reversible: one nullable column, one partial unique index, and the function replaced with one more argument.
-- Rollback: recreate oh_record_exposure from 20261110230655_one_health_v2_2_workflows.sql (18 arguments), then
--   DROP INDEX health.health_exposures_one_per_transfer; ALTER TABLE health.exposures DROP COLUMN transfer_id;
-- No existing row is changed.

ALTER TABLE health.exposures ADD COLUMN IF NOT EXISTS transfer_id uuid REFERENCES health.transfers(id);
CREATE UNIQUE INDEX IF NOT EXISTS health_exposures_one_per_transfer ON health.exposures (transfer_id) WHERE transfer_id IS NOT NULL;

DROP FUNCTION IF EXISTS public.oh_record_exposure(uuid, date, text, uuid, text, text, text, text, text, text, text, text, text, uuid, text, boolean, boolean, text);

CREATE OR REPLACE FUNCTION public.oh_record_exposure(
  p_facility uuid, p_exposure_on date, p_kind text, p_area uuid, p_age_band text DEFAULT 'not_recorded', p_sex text DEFAULT 'not_recorded',
  p_patient_ref text DEFAULT NULL, p_species text DEFAULT 'dog', p_ownership text DEFAULT 'unknown', p_animal_description text DEFAULT NULL,
  p_animal_place text DEFAULT NULL, p_category text DEFAULT 'not_recorded', p_source text DEFAULT 'walk_in', p_notice uuid DEFAULT NULL,
  p_contact_phone text DEFAULT NULL, p_reminder_consent boolean DEFAULT false, p_request_followup boolean DEFAULT true,
  p_wound_washed text DEFAULT 'not_recorded', p_transfer uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE td date := public.oh_org_today(p_facility); eid uuid; c text; hid uuid; target uuid; prog uuid; due_days int;
BEGIN
  PERFORM public.oh_need(public.oh_is_facility(p_facility) AND public.oh_can(p_facility, 'record_exposure'), 'Only staff of this facility can record a bite');
  PERFORM public.oh_need(p_category = 'not_recorded' OR public.oh_can(p_facility, 'assess'), 'Only a clinician can record the exposure category');
  PERFORM public.oh_need(p_exposure_on <= td, 'The date it happened cannot be in the future');
  PERFORM public.oh_need(p_exposure_on >= td - 365, 'The date it happened is more than a year ago');
  IF p_transfer IS NOT NULL THEN
    PERFORM public.oh_need(EXISTS (SELECT 1 FROM health.transfers t WHERE t.id = p_transfer AND t.to_org = p_facility AND t.status IN ('sent', 'arrived')), 'That referral was not sent to this facility, or it was closed');
    PERFORM public.oh_need(NOT EXISTS (SELECT 1 FROM health.exposures x WHERE x.transfer_id = p_transfer), 'A bite is already recorded for this referral');
  END IF;
  c := public.oh_code('BX', p_facility);
  INSERT INTO health.exposures (facility_id, code, patient_ref, age_band, sex, area_id, exposure_on, presented_on, exposure_kind, category, category_by, category_by_name, wound_washed,
    animal_species, animal_ownership, animal_description, animal_place, source, notice_id, contact_phone, reminder_consent, created_by, transfer_id)
  VALUES (p_facility, c, nullif(btrim(p_patient_ref), ''), p_age_band, p_sex, p_area, p_exposure_on, td, p_kind, p_category,
    CASE WHEN p_category <> 'not_recorded' THEN auth.uid() END, CASE WHEN p_category <> 'not_recorded' THEN public.oh_actor_name() END, p_wound_washed,
    p_species, p_ownership, nullif(btrim(p_animal_description), ''), nullif(btrim(p_animal_place), ''), CASE WHEN p_transfer IS NOT NULL THEN 'referral' ELSE p_source END, p_notice,
    CASE WHEN p_reminder_consent THEN nullif(btrim(p_contact_phone), '') END, p_reminder_consent AND nullif(btrim(p_contact_phone), '') IS NOT NULL, auth.uid(), p_transfer)
  RETURNING id INTO eid;
  IF p_transfer IS NOT NULL THEN
    UPDATE health.transfers SET status = 'arrived', closed_by_name = public.oh_actor_name(), closed_at = now() WHERE id = p_transfer AND status = 'sent';
    IF FOUND THEN PERFORM health.log(p_facility, 'transfer_arrived', 'transfer', p_transfer); END IF;
  END IF;
  IF p_notice IS NOT NULL THEN UPDATE health.citizen_notices SET status = 'presented' WHERE id = p_notice AND facility_id = p_facility; END IF;
  IF p_request_followup AND p_ownership <> 'owned' AND p_area IS NOT NULL THEN
    SELECT a.organisation_id, a.programme_id INTO target, prog
      FROM public.oh_assignments a JOIN public.oh_participations pp ON pp.programme_id = a.programme_id AND pp.organisation_id = p_facility
     WHERE a.duty = 'animal_followup' AND a.area_id = p_area
     ORDER BY (SELECT max(depth) FROM public.oh_programme_line(a.programme_id)) DESC LIMIT 1;
    IF target IS NOT NULL THEN
      due_days := public.oh_cfg_int(prog, 'followup_due_days', 3, 1, 30);
      INSERT INTO public.oh_handoffs (programme_id, kind, from_org, to_org, title, detail, area_id, place, status, due_on, created_by)
      VALUES (prog, 'animal_followup', p_facility, target,
        'Find and observe the ' || CASE p_species WHEN 'unknown' THEN 'animal' ELSE p_species END || ' involved in '
          || CASE p_kind WHEN 'bite' THEN 'a bite' WHEN 'scratch' THEN 'a scratch' WHEN 'lick_broken_skin' THEN 'a lick on broken skin' ELSE 'contact' END || ' on ' || to_char(p_exposure_on, 'DD Mon'),
        concat_ws(E'\n', CASE WHEN nullif(btrim(p_animal_description), '') IS NOT NULL THEN 'Animal: ' || btrim(p_animal_description) END,
          'The facility asked for the animal to be located and its health recorded. Record what you find; if it is sick or dies, arrange a sample for the laboratory.',
          'No patient details are shared with this request.'),
        p_area, nullif(btrim(p_animal_place), ''), 'open', p_exposure_on + due_days, auth.uid())
      RETURNING id INTO hid;
      UPDATE health.exposures SET handoff_id = hid WHERE id = eid;
    END IF;
  END IF;
  PERFORM health.log(p_facility, 'record_exposure', 'exposure', eid);
  RETURN jsonb_build_object('id', eid, 'code', c, 'handoff_id', hid, 'transfer_id', p_transfer);
END $$;

REVOKE ALL ON FUNCTION public.oh_record_exposure(uuid, date, text, uuid, text, text, text, text, text, text, text, text, text, uuid, text, boolean, boolean, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.oh_record_exposure(uuid, date, text, uuid, text, text, text, text, text, text, text, text, text, uuid, text, boolean, boolean, text, uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
