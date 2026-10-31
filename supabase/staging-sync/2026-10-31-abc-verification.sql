-- STAGING ONLY (project straypaw-staging, ucxfxiddufwqithtdtix).
-- Reviewed copy for production: supabase/proposed/2026-10-31-abc-verification.sql
-- (identical body; NOT applied to production; needs separate approval).
--
-- StrayPaw ABC Operations & Verification: the core workflow, end to end.
--   capture (cases, existing) → evidence items per case → vet authorisation
--   → coordinator evidence review → report package → submission to a
--   reviewing office → query / answer → acceptance or return.
-- Every step is a SECURITY DEFINER function that checks the caller's
-- organisation and role; tables are read-only to clients (RLS) and written
-- only through these functions. Every step writes a case_updates line or a
-- package event and an operational_audit_log row. Nothing is approved
-- automatically, and no role can approve its own kind of work twice.
--
-- Also fixes the provenance fault found in production: cases opened by an
-- organisation member were left with the column default 'community_report'.

begin;

-- ── roles ──────────────────────────────────────────────────────────────
-- ngo_members.role is free text today ('admin', 'member'). Two more values
-- are recognised by the functions below: 'veterinarian' and 'coordinator'.
comment on column public.ngo_members.role is
  'admin | coordinator | veterinarian | member. Checked by SECURITY DEFINER functions; never chosen by the member.';

create or replace function public.sp_member_role(p_ngo uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.ngo_members where user_id = auth.uid() and ngo_id = p_ngo
$$;
revoke all on function public.sp_member_role(uuid) from public, anon;
grant execute on function public.sp_member_role(uuid) to authenticated;

-- ── reviewing offices (government side) ───────────────────────────────
create table if not exists public.review_offices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  created_at timestamptz not null default now()
);
create table if not exists public.review_office_members (
  office_id uuid not null references public.review_offices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'reviewer' check (role in ('reviewer')),
  created_at timestamptz not null default now(),
  primary key (office_id, user_id)
);

-- ── attestations: vet authorisation and evidence review, per case ─────
create table if not exists public.abc_attestations (
  id uuid primary key default gen_random_uuid(),
  ngo_id uuid not null references public.ngos(id),
  case_id uuid not null references public.cases(id) on delete restrict,
  kind text not null check (kind in ('vet_authorised', 'evidence_reviewed', 'evidence_returned')),
  actor_id uuid not null,
  actor_name text not null,
  actor_role text not null,
  note text,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid
);
create unique index if not exists abc_attestations_one_live on public.abc_attestations (case_id, kind) where revoked_at is null;

-- ── report packages and their events ──────────────────────────────────
create table if not exists public.report_packages (
  id uuid primary key default gen_random_uuid(),
  ngo_id uuid not null references public.ngos(id),
  office_id uuid not null references public.review_offices(id),
  title text not null,
  period_start date not null,
  period_end date not null,
  case_ids uuid[] not null default '{}',
  summary jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'queried', 'accepted', 'returned')),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  decided_by uuid,
  decided_by_name text,
  decided_at timestamptz,
  check (period_end >= period_start)
);
create table if not exists public.package_events (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.report_packages(id) on delete cascade,
  actor_id uuid not null,
  actor_name text not null,
  side text not null check (side in ('operator', 'reviewer')),
  kind text not null check (kind in ('created', 'submitted', 'query', 'answer', 'accepted', 'returned')),
  body text,
  created_at timestamptz not null default now()
);

-- ── RLS: read your own; write only through functions ──────────────────
alter table public.review_offices enable row level security;
alter table public.review_office_members enable row level security;
alter table public.abc_attestations enable row level security;
alter table public.report_packages enable row level security;
alter table public.package_events enable row level security;

drop policy if exists ro_read on public.review_offices;
create policy ro_read on public.review_offices for select to authenticated using (true);
drop policy if exists rom_read on public.review_office_members;
create policy rom_read on public.review_office_members for select to authenticated using (user_id = auth.uid());
drop policy if exists att_read on public.abc_attestations;
create policy att_read on public.abc_attestations for select to authenticated
  using (ngo_id = public.my_ngo()
    or exists (select 1 from public.report_packages p join public.review_office_members m on m.office_id = p.office_id
               where m.user_id = auth.uid() and p.status <> 'draft' and abc_attestations.case_id = any (p.case_ids)));
drop policy if exists pkg_read on public.report_packages;
create policy pkg_read on public.report_packages for select to authenticated
  using (ngo_id = public.my_ngo()
    or (status <> 'draft' and exists (select 1 from public.review_office_members m where m.office_id = report_packages.office_id and m.user_id = auth.uid())));
drop policy if exists pev_read on public.package_events;
create policy pev_read on public.package_events for select to authenticated
  using (exists (select 1 from public.report_packages p where p.id = package_events.package_id));
revoke insert, update, delete on public.review_offices, public.review_office_members, public.abc_attestations, public.report_packages, public.package_events from anon, authenticated;
grant select on public.review_offices, public.review_office_members, public.abc_attestations, public.report_packages, public.package_events to authenticated;

-- ── helpers ───────────────────────────────────────────────────────────
create or replace function public.sp_actor_name()
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(u.raw_user_meta_data->>'name', ''), nullif(u.raw_user_meta_data->>'display_name', ''), nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1), 'StrayPaw user') from auth.users u where u.id = auth.uid()
$$;
revoke all on function public.sp_actor_name() from public, anon;

/* The evidence an ABC procedure needs, per case. Evidence items are the
   existing evidence_items rows (kind), so imports and uploads count too. */
create or replace function public.abc_case_checklist(p_case_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_ngo uuid; v jsonb; v_missing text[] := '{}'; k text;
begin
  select ngo_id into v_ngo from cases where id = p_case_id;
  if v_ngo is null then raise exception 'Case not found'; end if;
  if v_ngo is distinct from public.my_ngo()
     and not exists (select 1 from report_packages p join review_office_members m on m.office_id = p.office_id
                     where m.user_id = auth.uid() and p.status <> 'draft' and p_case_id = any (p.case_ids)) then
    raise exception 'You cannot read this case';
  end if;
  v := jsonb_build_object();
  foreach k in array array['capture_photo', 'surgery_record', 'ear_notch_photo', 'release_photo', 'release_location'] loop
    v := v || jsonb_build_object(k, exists (select 1 from evidence_items e where e.case_id = p_case_id and e.kind = k));
    if not exists (select 1 from evidence_items e where e.case_id = p_case_id and e.kind = k) then v_missing := v_missing || k; end if;
  end loop;
  return jsonb_build_object(
    'items', v,
    'missing', to_jsonb(v_missing),
    'vet_authorised', exists (select 1 from abc_attestations a where a.case_id = p_case_id and a.kind = 'vet_authorised' and a.revoked_at is null),
    'evidence_reviewed', exists (select 1 from abc_attestations a where a.case_id = p_case_id and a.kind = 'evidence_reviewed' and a.revoked_at is null),
    'government_accepted', exists (select 1 from report_packages p where p.status = 'accepted' and p_case_id = any (p.case_ids))
  );
end $$;
revoke all on function public.abc_case_checklist(uuid) from public, anon;
grant execute on function public.abc_case_checklist(uuid) to authenticated;

/* One row per case in the caller's organisation, with its verification
   state: what the operator workspace's Verification screen lists. */
drop function if exists public.abc_verification_queue(int);
create or replace function public.abc_verification_queue(p_limit int default 200)
returns table (case_id uuid, case_code text, title text, city text, created_at timestamptz, provenance text,
               evidence_count int, missing text[], vet_authorised boolean, evidence_reviewed boolean, government_accepted boolean,
               vet_name text, reviewer_name text, returned_note text, returned_by text, in_package text)
language plpgsql stable security definer set search_path = public as $$
declare v_ngo uuid := public.my_ngo();
begin
  if auth.uid() is null or v_ngo is null then raise exception 'Organisation access required'; end if;
  return query
  select c.id, c.case_code, c.title, c.city, c.created_at, c.provenance,
    (select count(distinct e.kind)::int from evidence_items e where e.case_id = c.id and e.kind in ('capture_photo','surgery_record','ear_notch_photo','release_photo','release_location')),
    array(select k from unnest(array['capture_photo','surgery_record','ear_notch_photo','release_photo','release_location']) k
          where not exists (select 1 from evidence_items e where e.case_id = c.id and e.kind = k)),
    exists (select 1 from abc_attestations a where a.case_id = c.id and a.kind = 'vet_authorised' and a.revoked_at is null),
    exists (select 1 from abc_attestations a where a.case_id = c.id and a.kind = 'evidence_reviewed' and a.revoked_at is null),
    exists (select 1 from report_packages p where p.status = 'accepted' and c.id = any (p.case_ids)),
    (select a.actor_name from abc_attestations a where a.case_id = c.id and a.kind = 'vet_authorised' and a.revoked_at is null),
    (select a.actor_name from abc_attestations a where a.case_id = c.id and a.kind = 'evidence_reviewed' and a.revoked_at is null),
    (select a.note from abc_attestations a where a.case_id = c.id and a.kind = 'evidence_returned' and a.revoked_at is null),
    (select a.actor_name from abc_attestations a where a.case_id = c.id and a.kind = 'evidence_returned' and a.revoked_at is null),
    (select p.status from report_packages p where c.id = any (p.case_ids) and p.status <> 'returned' order by p.created_at desc limit 1)
  from cases c
  where c.ngo_id = v_ngo and coalesce(c.provenance, '') not in ('imported_historical_record', 'public_dataset')
    and c.category = 'sterilisation'
  order by c.created_at desc
  limit greatest(1, least(p_limit, 500));
end $$;
revoke all on function public.abc_verification_queue(int) from public, anon;
grant execute on function public.abc_verification_queue(int) to authenticated;

create or replace function public.abc_add_evidence(p_case_id uuid, p_kind text, p_url text default null, p_location text default null, p_title text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_ngo uuid := public.my_ngo(); v_id uuid; v_dog uuid;
begin
  if auth.uid() is null or v_ngo is null then raise exception 'Organisation access required'; end if;
  if p_kind not in ('capture_photo','surgery_record','ear_notch_photo','release_photo','release_location') then raise exception 'Unknown evidence kind'; end if;
  select dog_id into v_dog from cases where id = p_case_id and ngo_id = v_ngo;
  if not found then raise exception 'That case is not in your organisation'; end if;
  if p_kind like '%photo' and coalesce(btrim(p_url), '') = '' then raise exception 'A photo needs its file link'; end if;
  if p_kind = 'release_location' and coalesce(btrim(p_location), '') = '' then raise exception 'Say where the animal was released'; end if;
  insert into evidence_items (ngo_id, dog_id, case_id, kind, url, title, captured_at, location_text, provenance, verification_state, created_by)
  values (v_ngo, v_dog, p_case_id, p_kind, nullif(btrim(p_url), ''), coalesce(nullif(btrim(p_title), ''), replace(p_kind, '_', ' ')), now(), nullif(btrim(p_location), ''), 'operator_created', 'submitted', auth.uid())
  returning id into v_id;
  insert into case_updates (case_id, actor_id, actor_name, type, note) values (p_case_id, auth.uid(), public.sp_actor_name(), 'note', 'Evidence added: ' || replace(p_kind, '_', ' '));
  insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data) values (v_ngo, auth.uid(), 'evidence_item', v_id, 'abc_add_evidence', jsonb_build_object('case_id', p_case_id, 'kind', p_kind));
  return v_id;
end $$;
revoke all on function public.abc_add_evidence(uuid, text, text, text, text) from public, anon;
grant execute on function public.abc_add_evidence(uuid, text, text, text, text) to authenticated;

/* Only a member with the veterinarian role authorises, in their own name. */
create or replace function public.abc_vet_authorise(p_case_id uuid, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_ngo uuid := public.my_ngo(); v_id uuid; v_name text := public.sp_actor_name();
begin
  if auth.uid() is null or v_ngo is null then raise exception 'Organisation access required'; end if;
  if public.sp_member_role(v_ngo) is distinct from 'veterinarian' then raise exception 'Only a veterinarian in this organisation can authorise a procedure'; end if;
  if not exists (select 1 from cases where id = p_case_id and ngo_id = v_ngo) then raise exception 'That case is not in your organisation'; end if;
  if not exists (select 1 from evidence_items where case_id = p_case_id and kind = 'surgery_record') then raise exception 'Add the surgery record before authorising'; end if;
  insert into abc_attestations (ngo_id, case_id, kind, actor_id, actor_name, actor_role, note, snapshot)
  values (v_ngo, p_case_id, 'vet_authorised', auth.uid(), v_name, 'veterinarian', nullif(btrim(p_note), ''), public.abc_case_checklist(p_case_id))
  returning id into v_id;
  insert into case_updates (case_id, actor_id, actor_name, type, note) values (p_case_id, auth.uid(), v_name, 'note', 'Procedure authorised by veterinarian ' || v_name);
  insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data) values (v_ngo, auth.uid(), 'case', p_case_id, 'abc_vet_authorise', jsonb_build_object('attestation', v_id));
  return v_id;
end $$;
revoke all on function public.abc_vet_authorise(uuid, text) from public, anon;
grant execute on function public.abc_vet_authorise(uuid, text) to authenticated;

/* A coordinator (or admin) reviews evidence, only when it is complete and a
   vet has authorised the procedure; and never their own vet sign-off. */
create or replace function public.abc_review_evidence(p_case_id uuid, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_ngo uuid := public.my_ngo(); v_id uuid; v_chk jsonb; v_name text := public.sp_actor_name();
begin
  if auth.uid() is null or v_ngo is null then raise exception 'Organisation access required'; end if;
  if coalesce(public.sp_member_role(v_ngo), '') not in ('admin', 'coordinator') then raise exception 'Only a coordinator or admin can review evidence'; end if;
  if not exists (select 1 from cases where id = p_case_id and ngo_id = v_ngo) then raise exception 'That case is not in your organisation'; end if;
  v_chk := public.abc_case_checklist(p_case_id);
  if jsonb_array_length(v_chk->'missing') > 0 then raise exception 'Evidence incomplete: %', (select string_agg(replace(x, '_', ' '), ', ') from jsonb_array_elements_text(v_chk->'missing') x); end if;
  if not (v_chk->>'vet_authorised')::boolean then raise exception 'A veterinarian has not authorised this procedure yet'; end if;
  if exists (select 1 from abc_attestations where case_id = p_case_id and kind = 'vet_authorised' and revoked_at is null and actor_id = auth.uid()) then raise exception 'You authorised this procedure; another person must review its evidence'; end if;
  insert into abc_attestations (ngo_id, case_id, kind, actor_id, actor_name, actor_role, note, snapshot)
  values (v_ngo, p_case_id, 'evidence_reviewed', auth.uid(), v_name, public.sp_member_role(v_ngo), nullif(btrim(p_note), ''), v_chk)
  returning id into v_id;
  update abc_attestations set revoked_at = now(), revoked_by = auth.uid() where case_id = p_case_id and kind = 'evidence_returned' and revoked_at is null;
  insert into case_updates (case_id, actor_id, actor_name, type, note) values (p_case_id, auth.uid(), v_name, 'note', 'Evidence reviewed and approved for reporting by ' || v_name);
  insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data) values (v_ngo, auth.uid(), 'case', p_case_id, 'abc_review_evidence', jsonb_build_object('attestation', v_id));
  return v_id;
end $$;
revoke all on function public.abc_review_evidence(uuid, text) from public, anon;
grant execute on function public.abc_review_evidence(uuid, text) to authenticated;

/* A package holds only reviewed cases from the period; its figures are
   computed here from those records and frozen with the package. */
create or replace function public.abc_create_package(p_title text, p_start date, p_end date, p_office uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_ngo uuid := public.my_ngo(); v_ids uuid[]; v_id uuid; v_name text := public.sp_actor_name();
begin
  if auth.uid() is null or v_ngo is null then raise exception 'Organisation access required'; end if;
  if coalesce(public.sp_member_role(v_ngo), '') not in ('admin', 'coordinator') then raise exception 'Only a coordinator or admin can prepare a report package'; end if;
  if not exists (select 1 from review_offices where id = p_office) then raise exception 'Choose a reviewing office'; end if;
  if p_end < p_start then raise exception 'The period ends before it starts'; end if;
  select array_agg(c.id order by c.created_at) into v_ids from cases c
  where c.ngo_id = v_ngo and c.created_at::date between p_start and p_end
    and exists (select 1 from abc_attestations a where a.case_id = c.id and a.kind = 'evidence_reviewed' and a.revoked_at is null)
    and not exists (select 1 from report_packages q where c.id = any (q.case_ids) and q.status <> 'returned');
  if coalesce(array_length(v_ids, 1), 0) = 0 then raise exception 'No reviewed records in that period that are not already in a package'; end if;
  insert into report_packages (ngo_id, office_id, title, period_start, period_end, case_ids, summary, created_by)
  values (v_ngo, p_office, coalesce(nullif(btrim(p_title), ''), 'Report package'), p_start, p_end, v_ids,
          jsonb_build_object('records', array_length(v_ids, 1), 'vet_authorised', (select count(*) from abc_attestations a where a.case_id = any (v_ids) and a.kind = 'vet_authorised' and a.revoked_at is null),
                             'evidence_items', (select count(*) from evidence_items e where e.case_id = any (v_ids)), 'generated_at', now()),
          auth.uid())
  returning id into v_id;
  insert into package_events (package_id, actor_id, actor_name, side, kind, body) values (v_id, auth.uid(), v_name, 'operator', 'created', null);
  insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data) values (v_ngo, auth.uid(), 'report_package', v_id, 'abc_create_package', jsonb_build_object('records', array_length(v_ids, 1)));
  return v_id;
end $$;
revoke all on function public.abc_create_package(text, date, date, uuid) from public, anon;
grant execute on function public.abc_create_package(text, date, date, uuid) to authenticated;

/* Operator: submit a draft, or answer a query. Reviewer: query, accept or
   return. Each is a recorded event; acceptance is only ever a person's act. */
create or replace function public.abc_package_act(p_package uuid, p_kind text, p_body text default null)
returns text language plpgsql security definer set search_path = public as $$
declare p report_packages%rowtype; v_name text := public.sp_actor_name(); v_reviewer boolean; v_operator boolean; v_next text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into p from report_packages where id = p_package for update;
  if not found then raise exception 'Package not found'; end if;
  v_operator := p.ngo_id = public.my_ngo() and coalesce(public.sp_member_role(p.ngo_id), '') in ('admin', 'coordinator');
  v_reviewer := exists (select 1 from review_office_members m where m.office_id = p.office_id and m.user_id = auth.uid());
  if p_kind = 'submitted' then
    if not v_operator then raise exception 'Only the operator''s coordinator can submit'; end if;
    if p.status not in ('draft', 'returned') then raise exception 'This package has already been submitted'; end if;
    v_next := 'submitted';
  elsif p_kind = 'answer' then
    if not v_operator then raise exception 'Only the operator can answer a query'; end if;
    if p.status <> 'queried' then raise exception 'There is no open query'; end if;
    if coalesce(btrim(p_body), '') = '' then raise exception 'Write the answer'; end if;
    v_next := 'submitted';
  elsif p_kind in ('query', 'accepted', 'returned') then
    if not v_reviewer then raise exception 'Only a reviewer at the receiving office can do that'; end if;
    if p.ngo_id = public.my_ngo() then raise exception 'A member of the organisation that prepared this package cannot review it'; end if;
    if p.status not in ('submitted') then raise exception 'The package is not waiting for review'; end if;
    if p_kind in ('query', 'returned') and coalesce(btrim(p_body), '') = '' then raise exception 'Say what needs attention'; end if;
    v_next := case p_kind when 'query' then 'queried' when 'accepted' then 'accepted' else 'returned' end;
  else raise exception 'Unknown action';
  end if;
  update report_packages set status = v_next,
    submitted_at = case when p_kind = 'submitted' then now() else submitted_at end,
    decided_by = case when p_kind in ('accepted', 'returned') then auth.uid() else decided_by end,
    decided_by_name = case when p_kind in ('accepted', 'returned') then v_name else decided_by_name end,
    decided_at = case when p_kind in ('accepted', 'returned') then now() else decided_at end
  where id = p.id;
  insert into package_events (package_id, actor_id, actor_name, side, kind, body) values (p.id, auth.uid(), v_name, case when v_reviewer and p_kind in ('query', 'accepted', 'returned') then 'reviewer' else 'operator' end, p_kind, nullif(btrim(p_body), ''));
  insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, before_data, after_data) values (p.ngo_id, auth.uid(), 'report_package', p.id, 'abc_package_' || p_kind, jsonb_build_object('status', p.status), jsonb_build_object('status', v_next));
  return v_next;
end $$;
revoke all on function public.abc_package_act(uuid, text, text) from public, anon;
grant execute on function public.abc_package_act(uuid, text, text) to authenticated;

/* The cases inside a package, for the operator and for its reviewer. */
create or replace function public.abc_package_cases(p_package uuid)
returns table (case_id uuid, case_code text, title text, city text, created_at timestamptz, evidence jsonb, vet_name text, reviewer_name text)
language plpgsql stable security definer set search_path = public as $$
declare p report_packages%rowtype;
begin
  select * into p from report_packages where id = p_package;
  if not found then raise exception 'Package not found'; end if;
  if not (p.ngo_id = public.my_ngo() or (p.status <> 'draft' and exists (select 1 from review_office_members m where m.office_id = p.office_id and m.user_id = auth.uid()))) then
    raise exception 'You cannot read this package';
  end if;
  return query
  select c.id, c.case_code, c.title, c.city, c.created_at,
    coalesce((select jsonb_agg(jsonb_build_object('kind', e.kind, 'url', e.url, 'location', e.location_text, 'at', e.captured_at) order by e.kind) from evidence_items e where e.case_id = c.id), '[]'::jsonb),
    (select a.actor_name from abc_attestations a where a.case_id = c.id and a.kind = 'vet_authorised' and a.revoked_at is null),
    (select a.actor_name from abc_attestations a where a.case_id = c.id and a.kind = 'evidence_reviewed' and a.revoked_at is null)
  from cases c where c.id = any (p.case_ids) order by c.created_at;
end $$;
revoke all on function public.abc_package_cases(uuid) from public, anon;
grant execute on function public.abc_package_cases(uuid) to authenticated;

-- ── provenance: organisation-created cases are operator-created ───────
create or replace function public.sp_case_operator_provenance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  /* A case created by a signed-in member of the owning organisation, not by
     an import, is an operator-created record. Imports set their provenance
     explicitly and are left alone; so are community reports (no member). */
  if new.provenance = 'community_report' and new.import_batch_id is null and new.ngo_id is not null and auth.uid() is not null
     and exists (select 1 from ngo_members m where m.user_id = auth.uid() and m.ngo_id = new.ngo_id) then
    new.provenance := 'operator_created';
  end if;
  return new;
end $$;
drop trigger if exists cases_operator_provenance on public.cases;
create trigger cases_operator_provenance before insert on public.cases for each row execute function public.sp_case_operator_provenance();


-- ── rejection, withdrawal, history and context ────────────────────────
/* A coordinator or admin returns a case's evidence with a reason. The case
   stays out of reporting until someone reviews it again. */
create or replace function public.abc_return_evidence(p_case_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_ngo uuid := public.my_ngo(); v_id uuid; v_name text := public.sp_actor_name();
begin
  if auth.uid() is null or v_ngo is null then raise exception 'Organisation access required'; end if;
  if coalesce(public.sp_member_role(v_ngo), '') not in ('admin', 'coordinator') then raise exception 'Only a coordinator or admin can return evidence'; end if;
  if not exists (select 1 from cases where id = p_case_id and ngo_id = v_ngo) then raise exception 'That case is not in your organisation'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'Say what is missing or wrong'; end if;
  if exists (select 1 from report_packages p where p_case_id = any (p.case_ids) and p.status in ('submitted', 'queried', 'accepted')) then raise exception 'This record is in a submitted package; answer through the package instead'; end if;
  update abc_attestations set revoked_at = now(), revoked_by = auth.uid() where case_id = p_case_id and kind in ('evidence_reviewed', 'evidence_returned') and revoked_at is null;
  insert into abc_attestations (ngo_id, case_id, kind, actor_id, actor_name, actor_role, note, snapshot)
  values (v_ngo, p_case_id, 'evidence_returned', auth.uid(), v_name, public.sp_member_role(v_ngo), btrim(p_reason), public.abc_case_checklist(p_case_id))
  returning id into v_id;
  insert into case_updates (case_id, actor_id, actor_name, type, note) values (p_case_id, auth.uid(), v_name, 'note', 'Evidence returned by ' || v_name || ': ' || btrim(p_reason));
  insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data) values (v_ngo, auth.uid(), 'case', p_case_id, 'abc_return_evidence', jsonb_build_object('attestation', v_id, 'reason', btrim(p_reason)));
  return v_id;
end $$;
revoke all on function public.abc_return_evidence(uuid, text) from public, anon;
grant execute on function public.abc_return_evidence(uuid, text) to authenticated;

/* Withdraw a sign-off: by the person who gave it, or an admin. A withdrawn
   vet authorisation withdraws the evidence review that relied on it. Nothing
   in a submitted or accepted package can be withdrawn here. */
create or replace function public.abc_revoke_attestation(p_attestation uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare a abc_attestations%rowtype; v_ngo uuid := public.my_ngo(); v_name text := public.sp_actor_name();
begin
  if auth.uid() is null or v_ngo is null then raise exception 'Organisation access required'; end if;
  select * into a from abc_attestations where id = p_attestation and ngo_id = v_ngo and revoked_at is null for update;
  if not found then raise exception 'Sign-off not found'; end if;
  if a.kind = 'evidence_returned' then raise exception 'A return is cleared by reviewing the evidence again'; end if;
  if a.actor_id <> auth.uid() and coalesce(public.sp_member_role(v_ngo), '') <> 'admin' then raise exception 'Only the person who signed, or an admin, can withdraw this'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'Say why it is withdrawn'; end if;
  if exists (select 1 from report_packages p where a.case_id = any (p.case_ids) and p.status in ('submitted', 'queried', 'accepted')) then raise exception 'This record is in a submitted package'; end if;
  update abc_attestations set revoked_at = now(), revoked_by = auth.uid()
  where revoked_at is null and (id = a.id or (a.kind = 'vet_authorised' and case_id = a.case_id and kind = 'evidence_reviewed'));
  insert into case_updates (case_id, actor_id, actor_name, type, note) values (a.case_id, auth.uid(), v_name, 'note',
    case a.kind when 'vet_authorised' then 'Veterinary authorisation withdrawn by ' else 'Evidence review withdrawn by ' end || v_name || ': ' || btrim(p_reason));
  insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, before_data, after_data) values (v_ngo, auth.uid(), 'case', a.case_id, 'abc_revoke_' || a.kind, jsonb_build_object('attestation', a.id), jsonb_build_object('reason', btrim(p_reason)));
end $$;
revoke all on function public.abc_revoke_attestation(uuid, text) from public, anon;
grant execute on function public.abc_revoke_attestation(uuid, text) to authenticated;

/* Everything that happened to one case's verification, oldest first:
   evidence, sign-offs (live and withdrawn), returns, notes and packages. */
create or replace function public.abc_case_history(p_case_id uuid)
returns table (at timestamptz, kind text, actor text, detail text)
language plpgsql stable security definer set search_path = public as $$
declare v_ngo uuid;
begin
  select ngo_id into v_ngo from cases where id = p_case_id;
  if v_ngo is null then raise exception 'Case not found'; end if;
  if v_ngo is distinct from public.my_ngo()
     and not exists (select 1 from report_packages p join review_office_members m on m.office_id = p.office_id
                     where m.user_id = auth.uid() and p.status <> 'draft' and p_case_id = any (p.case_ids)) then
    raise exception 'You cannot read this case';
  end if;
  return query
  select * from (
    select e.created_at, 'evidence'::text, coalesce((select coalesce(nullif(u.raw_user_meta_data->>'name',''), nullif(u.raw_user_meta_data->>'display_name',''), split_part(u.email,'@',1)) from auth.users u where u.id = e.created_by), 'Import'), replace(e.kind, '_', ' ') || coalesce(' · ' || e.location_text, '')
      from evidence_items e where e.case_id = p_case_id
    union all
    select a.created_at, a.kind, a.actor_name, coalesce(a.note, '') from abc_attestations a where a.case_id = p_case_id
    union all
    select a.revoked_at, 'withdrawn:' || a.kind, coalesce((select coalesce(nullif(u.raw_user_meta_data->>'name',''), nullif(u.raw_user_meta_data->>'display_name',''), split_part(u.email,'@',1)) from auth.users u where u.id = a.revoked_by), ''), ''
      from abc_attestations a where a.case_id = p_case_id and a.revoked_at is not null and a.kind <> 'evidence_returned'
    union all
    select pe.created_at, 'package:' || pe.kind, pe.actor_name, p.title || coalesce(' · ' || pe.body, '')
      from package_events pe join report_packages p on p.id = pe.package_id where p_case_id = any (p.case_ids)
  ) h order by 1;
end $$;
revoke all on function public.abc_case_history(uuid) from public, anon;
grant execute on function public.abc_case_history(uuid) to authenticated;

/* What the signed-in person can do: their organisation role and the
   reviewing offices they sit in. Display only; every action re-checks. */
create or replace function public.abc_my_context()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'ngo_id', public.my_ngo(),
    'role', public.sp_member_role(public.my_ngo()),
    'name', public.sp_actor_name(),
    'offices', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'city', o.city)) from review_office_members m join review_offices o on o.id = m.office_id where m.user_id = auth.uid()), '[]'::jsonb))
$$;
revoke all on function public.abc_my_context() from public, anon;
grant execute on function public.abc_my_context() to authenticated;

-- ── follow-up counts used by the work queue (same body as production) ─
create or replace function public.org_followup_scope_counts()
returns table(scheduled_overdue bigint, scheduled_due_week bigint, historical_upcoming bigint)
language sql stable security definer set search_path to 'public' as $function$
  with me as (
    select public.my_ngo() as ngo_id
  ), scoped as (
    select
      af.due_at,
      (
        af.import_batch_id is not null
        or af.import_source_key is not null
        or lower(coalesce(af.kind, '')) like 'imported%'
        or c.provenance = 'imported_historical_record'
        or (af.case_id is null and d.provenance = 'imported_historical_record')
      ) as is_historical
    from public.animal_followups af
    left join public.cases c on c.id = af.case_id
    left join public.dogs d on d.id = coalesce(af.dog_id, c.dog_id)
    cross join me
    where auth.uid() is not null
      and me.ngo_id is not null
      and coalesce(c.ngo_id, d.ngo_id) = me.ngo_id
      and af.status = 'upcoming'
      and not coalesce(c.is_demo, d.is_demo, false)
  )
  select
    count(*) filter (where not is_historical and due_at < now())::bigint,
    count(*) filter (where not is_historical and due_at >= now() and due_at <= now() + interval '7 days')::bigint,
    count(*) filter (where is_historical)::bigint
  from scoped;
$function$;
revoke all on function public.org_followup_scope_counts() from public, anon;
grant execute on function public.org_followup_scope_counts() to authenticated;

-- ── record-origin schema (staging lacked it; same columns as production) ──
-- data_sources mirrors production, plus record_scope, which marks research
-- archives so they never count in operations or verified programme figures.
-- provenance_corrections keeps the prior value of every relabelled field, so
-- a provenance cleanup can be reversed exactly. Nothing is deleted.
create table if not exists public.data_sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  source_type text not null check (source_type in ('research_dataset','municipal_dataset','public_api','media_repository','government_dataset','organisation_register')),
  source_name text not null,
  source_dataset text not null,
  organization_name text not null,
  reporting_org_id uuid references public.ngos(id) on delete set null,
  source_url text not null,
  source_license text,
  source_license_url text,
  license_status text not null default 'pending' check (license_status in ('verified','pending','restricted','rejected')),
  publication_status text not null default 'staged' check (publication_status in ('discovered','staged','validated','published','blocked')),
  attribution_requirements text,
  restrictions text,
  importer_version text not null,
  geographic_precision text,
  record_count integer not null default 0 check (record_count >= 0),
  published_record_count integer not null default 0 check (published_record_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  discovered_at timestamptz not null default now(),
  validated_at timestamptz,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  record_scope text not null default 'operational' check (record_scope in ('operational','research_archive'))
);
alter table public.data_sources enable row level security;
create policy ds_read on public.data_sources for select to authenticated using (true);
revoke insert, update, delete on public.data_sources from anon, authenticated;
grant select on public.data_sources to authenticated;
alter table public.dogs add constraint dogs_data_source_id_fkey foreign key (data_source_id) references public.data_sources(id);

create table if not exists public.provenance_corrections (
  id bigserial primary key,
  batch text not null,
  table_name text not null,
  row_id uuid not null,
  column_name text not null,
  old_value text,
  new_value text,
  reason text not null,
  corrected_at timestamptz not null default now(),
  reverted_at timestamptz
);
alter table public.provenance_corrections enable row level security;
revoke all on public.provenance_corrections from anon, authenticated;

create or replace view public.operational_animals with (security_invoker = true) as
  select d.* from public.dogs d
  where not exists (select 1 from public.data_sources s where s.id = d.data_source_id and s.record_scope = 'research_archive');
grant select on public.operational_animals to authenticated;

commit;

