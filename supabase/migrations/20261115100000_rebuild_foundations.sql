-- Rebuild foundations (Stage 2). Additive only: new functions and nx_* tables. Nothing existing is altered or dropped.
-- One question, "is this person in this organisation?", answered across the three membership models that exist today.

create or replace function public.nx_is_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from ngo_members where ngo_id = p_org and user_id = auth.uid())
    or exists (select 1 from oh_members where organisation_id = p_org and user_id = auth.uid())
    or exists (select 1 from review_office_members where office_id = p_org and user_id = auth.uid()));
$$;
revoke all on function public.nx_is_member(uuid) from public, anon;
grant execute on function public.nx_is_member(uuid) to authenticated;

-- Every organisation the signed-in person belongs to, with the workspace it opens. An NGO that also sits in a programme is one row.
create or replace function public.nx_my_workspaces()
returns table (org_id uuid, name text, short_name text, source text, kind text, workspace text, role text, sample boolean)
language sql stable security definer set search_path = public as $$
  select n.id, n.name, null::text, 'ngo', 'ngo', 'ngo', m.role, coalesce(n.demo_mode, false)
    from ngo_members m join ngos n on n.id = m.ngo_id where m.user_id = auth.uid()
  union all
  select o.id, o.name, o.short_name, 'programme_partner', o.kind,
         case when o.kind in ('hospital', 'clinic', 'laboratory') then 'healthcare' when o.kind = 'research' then 'research' else 'government' end,
         m.role, coalesce(o.illustrative, false)
    from oh_members m join oh_organisations o on o.id = m.organisation_id
   where m.user_id = auth.uid() and o.kind <> 'ngo'
  union all
  select r.id, r.name, null::text, 'review_office', 'municipal', 'government', m.role, false
    from review_office_members m join review_offices r on r.id = m.office_id where m.user_id = auth.uid();
$$;
revoke all on function public.nx_my_workspaces() from public, anon;
grant execute on function public.nx_my_workspaces() to authenticated;

-- Channels ---------------------------------------------------------------
create table if not exists public.nx_channels (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  name text not null check (name ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  topic text check (length(topic) <= 200),
  kind text not null default 'channel' check (kind in ('channel', 'announcement', 'dm')),
  private boolean not null default false,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (org_id, name)
);
create table if not exists public.nx_channel_members (
  channel_id uuid not null references public.nx_channels on delete cascade,
  user_id uuid not null,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);
create or replace function public.nx_can_read_channel(p_channel uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from nx_channels c where c.id = p_channel and nx_is_member(c.org_id)
    and (not c.private or c.created_by = auth.uid() or exists (select 1 from nx_channel_members m where m.channel_id = c.id and m.user_id = auth.uid())));
$$;
revoke all on function public.nx_can_read_channel(uuid) from public, anon;
grant execute on function public.nx_can_read_channel(uuid) to authenticated;

-- A message may point at a record, never at a patient: the kinds allowed here exclude anything in the health schema.
create table if not exists public.nx_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.nx_channels on delete cascade,
  parent_id uuid references public.nx_messages on delete cascade,
  author_id uuid default auth.uid(),
  author_kind text not null default 'person' check (author_kind in ('person', 'kaju')),
  author_name text,
  body text not null check (length(body) between 1 and 8000),
  record_kind text check (record_kind in ('animal', 'case', 'submission', 'programme', 'task')),
  record_id text, record_label text check (length(record_label) <= 160),
  proposal jsonb,
  created_at timestamptz not null default now(),
  edited_at timestamptz, deleted_at timestamptz
);
create index if not exists nx_messages_channel_idx on public.nx_messages (channel_id, created_at);

-- Tasks ------------------------------------------------------------------
create table if not exists public.nx_tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  title text not null check (length(title) between 1 and 240),
  note text check (length(note) <= 2000),
  state text not null default 'open' check (state in ('open', 'done', 'cancelled')),
  due_on date,
  assignee_id uuid, assignee_name text,
  created_by uuid not null default auth.uid(),
  source_kind text not null default 'manual' check (source_kind in ('manual', 'message', 'kaju', 'rule')),
  source_message_id uuid references public.nx_messages on delete set null,
  channel_id uuid references public.nx_channels on delete set null,
  record_kind text check (record_kind in ('animal', 'case', 'submission', 'programme')),
  record_id text, record_label text check (length(record_label) <= 160),
  created_at timestamptz not null default now(),
  done_at timestamptz, done_by uuid,
  unique (source_message_id, title)
);
create index if not exists nx_tasks_org_idx on public.nx_tasks (org_id, state, due_on);

-- Notifications ----------------------------------------------------------
create table if not exists public.nx_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  org_id uuid,
  kind text not null check (kind in ('mention', 'task', 'approval', 'handoff', 'system')),
  title text not null check (length(title) <= 200),
  body text check (length(body) <= 500),
  href text check (href ~ '^/'),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists nx_notifications_user_idx on public.nx_notifications (user_id, read_at, created_at desc);

-- Kaju missions ----------------------------------------------------------
create table if not exists public.nx_missions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  owner_id uuid not null default auth.uid(),
  title text not null check (length(title) between 1 and 240),
  request jsonb not null default '{}'::jsonb,
  state text not null default 'draft' check (state in ('draft', 'ready', 'running', 'waiting_person', 'waiting_partner', 'retrying', 'blocked', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.nx_mission_steps (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.nx_missions on delete cascade,
  position int not null,
  label text not null check (length(label) <= 240),
  tool text,
  state text not null default 'todo' check (state in ('todo', 'running', 'done', 'waiting_approval', 'failed', 'skipped')),
  needs_approval boolean not null default false,
  approved_by uuid, approved_at timestamptz,
  attempts int not null default 0,
  result jsonb, error text,
  idempotency_key text unique,
  unique (mission_id, position)
);

-- Row-level security -----------------------------------------------------
alter table public.nx_channels enable row level security;
alter table public.nx_channel_members enable row level security;
alter table public.nx_messages enable row level security;
alter table public.nx_tasks enable row level security;
alter table public.nx_notifications enable row level security;
alter table public.nx_missions enable row level security;
alter table public.nx_mission_steps enable row level security;

-- Reads the row itself, so a new channel is readable in the statement that creates it.
create policy nx_channels_read on public.nx_channels for select to authenticated using (
  public.nx_is_member(org_id) and (not private or created_by = auth.uid()
    or exists (select 1 from public.nx_channel_members m where m.channel_id = id and m.user_id = auth.uid())));
create policy nx_channels_add on public.nx_channels for insert to authenticated with check (public.nx_is_member(org_id) and created_by = auth.uid() and kind <> 'dm');

create policy nx_members_read on public.nx_channel_members for select to authenticated using (public.nx_can_read_channel(channel_id));
create policy nx_members_join on public.nx_channel_members for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.nx_channels c where c.id = channel_id and public.nx_is_member(c.org_id) and (not c.private or c.created_by = auth.uid())));
create policy nx_members_mark on public.nx_channel_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy nx_members_leave on public.nx_channel_members for delete to authenticated using (user_id = auth.uid());

create policy nx_messages_read on public.nx_messages for select to authenticated using (public.nx_can_read_channel(channel_id));
create policy nx_messages_post on public.nx_messages for insert to authenticated with check (public.nx_can_read_channel(channel_id) and author_id = auth.uid() and author_kind = 'person' and proposal is null);
create policy nx_messages_edit on public.nx_messages for update to authenticated using (author_id = auth.uid() and author_kind = 'person') with check (author_id = auth.uid() and author_kind = 'person');

create policy nx_tasks_read on public.nx_tasks for select to authenticated using (public.nx_is_member(org_id));
create policy nx_tasks_add on public.nx_tasks for insert to authenticated with check (public.nx_is_member(org_id) and created_by = auth.uid());
create policy nx_tasks_change on public.nx_tasks for update to authenticated using (public.nx_is_member(org_id)) with check (public.nx_is_member(org_id));

create policy nx_notifications_read on public.nx_notifications for select to authenticated using (user_id = auth.uid());
create policy nx_notifications_mark on public.nx_notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy nx_missions_read on public.nx_missions for select to authenticated using (owner_id = auth.uid());
create policy nx_missions_add on public.nx_missions for insert to authenticated with check (owner_id = auth.uid() and public.nx_is_member(org_id) and state = 'draft');
create policy nx_steps_read on public.nx_mission_steps for select to authenticated using (exists (select 1 from public.nx_missions m where m.id = mission_id and m.owner_id = auth.uid()));

grant select, insert on public.nx_channels to authenticated;
grant select, insert, update, delete on public.nx_channel_members to authenticated;
grant select, insert, update on public.nx_messages to authenticated;
grant select, insert, update on public.nx_tasks to authenticated;
grant select, update on public.nx_notifications to authenticated;
grant select, insert on public.nx_missions to authenticated;
grant select on public.nx_mission_steps to authenticated;
revoke all on public.nx_channels, public.nx_channel_members, public.nx_messages, public.nx_tasks, public.nx_notifications, public.nx_missions, public.nx_mission_steps from anon;

-- New messages reach open channels without a refresh. Realtime applies the same policies as a read.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'nx_messages') then
    alter publication supabase_realtime add table public.nx_messages;
  end if;
end $$;
