-- Rebuild, part 3. Additive only: new nx_* tables and functions, and one more kind of row in nx_my_workspaces
-- (a veterinarian in an NGO also gets the Healthcare workspace for that NGO's animals). Nothing existing is dropped
-- and no existing row is changed.

-- People ----------------------------------------------------------------------------------------------------------
-- Who is in an organisation, by display name, so a member can start a direct message. Names only: no email, no phone.
create or replace function public.nx_org_people(p_org uuid)
returns table (user_id uuid, name text, role text)
language sql stable security definer set search_path = public as $$
  select distinct on (x.user_id) x.user_id,
         coalesce(nullif(btrim(u.raw_user_meta_data->>'name'), ''), nullif(btrim(u.raw_user_meta_data->>'full_name'), ''), 'A colleague'),
         x.role
    from (select user_id, role::text from ngo_members where ngo_id = p_org
          union all select user_id, role::text from oh_members where organisation_id = p_org
          union all select user_id, role::text from review_office_members where office_id = p_org) x
    join auth.users u on u.id = x.user_id
   where public.nx_is_member(p_org)
   order by x.user_id;
$$;
revoke all on function public.nx_org_people(uuid) from public, anon;
grant execute on function public.nx_org_people(uuid) to authenticated;

-- Direct messages -------------------------------------------------------------------------------------------------
-- A direct message is a private channel with exactly two members of the same organisation. Opening one twice returns
-- the same channel. Nobody else can read it, and Kaju is not offered in it.
create or replace function public.nx_open_dm(p_org uuid, p_user uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_name text;
begin
  if auth.uid() is null or not public.nx_is_member(p_org) then raise exception 'You are not a member of this organisation.' using errcode = '42501'; end if;
  if p_user is null or p_user = auth.uid() then raise exception 'Choose someone else to message.' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.nx_org_people(p_org) p where p.user_id = p_user) then raise exception 'That person is not in this organisation.' using errcode = '42501'; end if;
  v_name := 'dm-' || substr(md5(least(auth.uid()::text, p_user::text) || ':' || greatest(auth.uid()::text, p_user::text)), 1, 24);
  insert into public.nx_channels (org_id, name, kind, private, created_by) values (p_org, v_name, 'dm', true, auth.uid())
  on conflict (org_id, name) do nothing returning id into v_id;
  if v_id is null then select id into v_id from public.nx_channels where org_id = p_org and name = v_name; end if;
  insert into public.nx_channel_members (channel_id, user_id) values (v_id, auth.uid()), (v_id, p_user) on conflict do nothing;
  return v_id;
end $$;
revoke all on function public.nx_open_dm(uuid, uuid) from public, anon;
grant execute on function public.nx_open_dm(uuid, uuid) to authenticated;

-- The signed-in person's direct messages in an organisation, with the other person's name and the last message time.
create or replace function public.nx_my_dms(p_org uuid)
returns table (channel_id uuid, other_id uuid, other_name text, last_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, o.user_id,
         coalesce(nullif(btrim(u.raw_user_meta_data->>'name'), ''), nullif(btrim(u.raw_user_meta_data->>'full_name'), ''), 'A colleague'),
         (select max(m.created_at) from nx_messages m where m.channel_id = c.id)
    from nx_channels c
    join nx_channel_members me on me.channel_id = c.id and me.user_id = auth.uid()
    join nx_channel_members o on o.channel_id = c.id and o.user_id <> auth.uid()
    join auth.users u on u.id = o.user_id
   where c.org_id = p_org and c.kind = 'dm' and public.nx_is_member(p_org);
$$;
revoke all on function public.nx_my_dms(uuid) from public, anon;
grant execute on function public.nx_my_dms(uuid) to authenticated;

-- Unread ----------------------------------------------------------------------------------------------------------
-- Opening a channel marks it read for that person (and records that they have opened it).
create or replace function public.nx_mark_read(p_channel uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.nx_can_read_channel(p_channel) then raise exception 'You cannot read this channel.' using errcode = '42501'; end if;
  insert into public.nx_channel_members (channel_id, user_id, last_read_at) values (p_channel, auth.uid(), now())
  on conflict (channel_id, user_id) do update set last_read_at = now();
end $$;
revoke all on function public.nx_mark_read(uuid) from public, anon;
grant execute on function public.nx_mark_read(uuid) to authenticated;

-- New top-level messages by others since the person last opened each channel they can read. A channel never opened
-- counts the last 14 days, so an old organisation does not greet a newcomer with hundreds.
create or replace function public.nx_unread(p_org uuid)
returns table (channel_id uuid, unread integer)
language sql stable security definer set search_path = public as $$
  select c.id, (select count(*)::int from nx_messages m
                 where m.channel_id = c.id and m.parent_id is null and m.author_id is distinct from auth.uid()
                   and m.created_at > coalesce(cm.last_read_at, now() - interval '14 days'))
    from nx_channels c
    left join nx_channel_members cm on cm.channel_id = c.id and cm.user_id = auth.uid()
   where c.org_id = p_org and public.nx_is_member(p_org) and public.nx_can_read_channel(c.id);
$$;
revoke all on function public.nx_unread(uuid) from public, anon;
grant execute on function public.nx_unread(uuid) to authenticated;

-- Studies (Research) ------------------------------------------------------------------------------------------------
-- A study belongs to a research organisation and names the programme whose aggregated data it uses. Its outputs are
-- versioned snapshots of that programme's suppressed extract, taken by the database as the signed-in person, so a
-- snapshot can never hold more than the person was allowed to see. Outputs are never edited, only added.
create table if not exists public.nx_studies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  title text not null check (char_length(title) between 3 and 160),
  question text check (char_length(question) <= 2000),
  design text check (char_length(design) <= 2000),
  programme_id uuid,
  cohort jsonb not null default '{"days": 365}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists nx_studies_org on public.nx_studies (org_id, updated_at desc);
create table if not exists public.nx_study_notes (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.nx_studies on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  author_id uuid not null default auth.uid(),
  author_name text,
  created_at timestamptz not null default now()
);
create table if not exists public.nx_study_outputs (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.nx_studies on delete cascade,
  org_id uuid not null,
  version integer not null,
  title text not null check (char_length(title) between 3 and 160),
  summary text check (char_length(summary) <= 4000),
  caveats text check (char_length(caveats) <= 2000),
  query jsonb not null,
  snapshot jsonb not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (study_id, version)
);
alter table public.nx_studies enable row level security;
alter table public.nx_study_notes enable row level security;
alter table public.nx_study_outputs enable row level security;
revoke all on public.nx_studies, public.nx_study_notes, public.nx_study_outputs from anon;
grant select, insert, update on public.nx_studies to authenticated;
grant select, insert on public.nx_study_notes to authenticated;
grant select on public.nx_study_outputs to authenticated;
create policy nx_studies_read on public.nx_studies for select to authenticated using (public.nx_is_member(org_id));
create policy nx_studies_add on public.nx_studies for insert to authenticated with check (public.nx_is_member(org_id) and created_by = auth.uid());
create policy nx_studies_change on public.nx_studies for update to authenticated using (public.nx_is_member(org_id)) with check (public.nx_is_member(org_id));
create policy nx_study_notes_read on public.nx_study_notes for select to authenticated using (exists (select 1 from public.nx_studies s where s.id = study_id and public.nx_is_member(s.org_id)));
create policy nx_study_notes_add on public.nx_study_notes for insert to authenticated with check (author_id = auth.uid() and exists (select 1 from public.nx_studies s where s.id = study_id and public.nx_is_member(s.org_id)));
create policy nx_study_outputs_read on public.nx_study_outputs for select to authenticated using (public.nx_is_member(org_id));

-- Take a versioned snapshot of the study's programme extract, filtered by its cohort (period, species, category, areas).
create or replace function public.nx_study_snapshot(p_study uuid, p_title text, p_summary text default null, p_caveats text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare s public.nx_studies%rowtype; x jsonb; rows jsonb; v integer; out_id uuid; d integer;
begin
  select * into s from public.nx_studies where id = p_study for update;
  if not found or not public.nx_is_member(s.org_id) then raise exception 'You cannot add to this study.' using errcode = '42501'; end if;
  if s.programme_id is null then raise exception 'Choose the programme whose data this study uses.' using errcode = 'P0001'; end if;
  d := least(greatest(coalesce((s.cohort->>'days')::int, 365), 7), 730);
  x := public.oh_research_extract(s.programme_id, d);
  select coalesce(jsonb_agg(r), '[]'::jsonb) into rows
    from jsonb_array_elements(coalesce(x->'rows', '[]'::jsonb)) r
   where (coalesce(s.cohort->>'species', '') = '' or r->>'species' = s.cohort->>'species')
     and (coalesce(s.cohort->>'category', '') = '' or r->>'category' = s.cohort->>'category')
     and (jsonb_typeof(s.cohort->'areas') is distinct from 'array' or jsonb_array_length(s.cohort->'areas') = 0 or (s.cohort->'areas') ? (r->>'area'));
  select coalesce(max(version), 0) + 1 into v from public.nx_study_outputs where study_id = p_study;
  insert into public.nx_study_outputs (study_id, org_id, version, title, summary, caveats, query, snapshot)
  values (p_study, s.org_id, v, left(btrim(p_title), 160), left(p_summary, 4000), left(p_caveats, 2000),
          jsonb_build_object('programme_id', s.programme_id, 'days', d, 'cohort', s.cohort, 'source', 'oh_research_extract'),
          jsonb_build_object('since', x->'since', 'suppress_below', x->'suppress_below', 'rows', rows))
  returning id into out_id;
  update public.nx_studies set updated_at = now(), status = case when status = 'draft' then 'active' else status end where id = p_study;
  return out_id;
end $$;
revoke all on function public.nx_study_snapshot(uuid, text, text, text) from public, anon;
grant execute on function public.nx_study_snapshot(uuid, text, text, text) to authenticated;

-- Appointments (Veterinary) ------------------------------------------------------------------------------------------
-- An appointment for an animal on the organisation's own register. Booking it is not a clinical decision; the visit's
-- findings are recorded on the animal and case as before.
create table if not exists public.nx_appointments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  dog_id uuid references public.dogs on delete set null,
  case_id uuid references public.cases on delete set null,
  title text not null check (char_length(title) between 2 and 160),
  kind text not null default 'check' check (kind in ('check', 'procedure', 'vaccination', 'recovery', 'other')),
  starts_at timestamptz not null,
  duration_min integer not null default 30 check (duration_min between 5 and 480),
  status text not null default 'booked' check (status in ('booked', 'done', 'missed', 'cancelled')),
  note text check (char_length(note) <= 1000),
  vet_name text check (char_length(vet_name) <= 120),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists nx_appointments_org_time on public.nx_appointments (org_id, starts_at);
alter table public.nx_appointments enable row level security;
revoke all on public.nx_appointments from anon;
grant select, insert, update on public.nx_appointments to authenticated;
create policy nx_appointments_read on public.nx_appointments for select to authenticated using (public.nx_is_member(org_id));
create policy nx_appointments_add on public.nx_appointments for insert to authenticated with check (
  public.nx_is_member(org_id) and created_by = auth.uid()
  and (dog_id is null or exists (select 1 from public.dogs d where d.id = dog_id and d.ngo_id = org_id))
  and (case_id is null or exists (select 1 from public.cases c where c.id = case_id and c.ngo_id = org_id)));
create policy nx_appointments_change on public.nx_appointments for update to authenticated using (public.nx_is_member(org_id)) with check (
  public.nx_is_member(org_id)
  and (dog_id is null or exists (select 1 from public.dogs d where d.id = dog_id and d.ngo_id = org_id))
  and (case_id is null or exists (select 1 from public.cases c where c.id = case_id and c.ngo_id = org_id)));

-- Workspaces: a veterinarian in an NGO also gets the Healthcare workspace, scoped to that NGO's animals. ---------------
create or replace function public.nx_my_workspaces()
returns table (org_id uuid, name text, short_name text, source text, kind text, workspace text, role text, sample boolean)
language sql stable security definer set search_path = public as $$
  select n.id, n.name, null::text, 'ngo', 'ngo', 'ngo', m.role, coalesce(n.demo_mode, false)
    from ngo_members m join ngos n on n.id = m.ngo_id where m.user_id = auth.uid()
  union all
  select n.id, n.name, null::text, 'ngo_vet', 'veterinary', 'healthcare', m.role, coalesce(n.demo_mode, false)
    from ngo_members m join ngos n on n.id = m.ngo_id where m.user_id = auth.uid() and m.role = 'veterinarian'
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
