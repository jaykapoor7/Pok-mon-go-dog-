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
