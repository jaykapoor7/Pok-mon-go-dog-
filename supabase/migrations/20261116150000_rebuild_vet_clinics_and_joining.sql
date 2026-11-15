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
  select m, p_org, 'approval', left(coalesce(nullif(btrim(p_name), ''), 'Someone') || ' asked to join', 200), case when k = 'ngo' then '/ngo/team' else '/start' end
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
