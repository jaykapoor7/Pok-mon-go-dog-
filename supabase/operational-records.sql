-- StrayPaw operational record foundation.
--
-- This migration turns the existing animal + case model into an auditable
-- longitudinal record without replacing working community or NGO tables.
-- It is deliberately additive and idempotent. Existing `dogs`, `cases`,
-- `medical_events`, `campaigns`, and their data remain the canonical source
-- for their current workflows.

-- ── Stable identity and provenance ────────────────────────────────────────

alter table dogs add column if not exists straypaw_id text;
alter table dogs add column if not exists sex text;
alter table dogs add column if not exists identifiers text;
alter table dogs add column if not exists provenance text not null default 'community_report';
alter table dogs add column if not exists source_metadata jsonb not null default '{}'::jsonb;
alter table dogs add column if not exists identity_state text not null default 'confirmed';
alter table dogs add column if not exists updated_at timestamptz not null default now();

-- Keep a separately-owned permanent ID. `code` remains an NGO's own legacy
-- identifier, so imports do not overwrite labels teams already recognize.
update dogs
set straypaw_id = 'SPA-' || upper(left(coalesce(species, 'animal'), 3)) || '-' || upper(left(replace(id::text, '-', ''), 8))
where straypaw_id is null or btrim(straypaw_id) = '';

create unique index if not exists dogs_straypaw_id_idx on dogs (straypaw_id) where straypaw_id is not null;
create index if not exists dogs_ngo_identity_idx on dogs (ngo_id, code) where ngo_id is not null and code is not null;
create index if not exists dogs_ngo_location_idx on dogs (ngo_id, zone) where ngo_id is not null;

-- ── Cases remain the operational episode, now with a useful next action ───

alter table cases add column if not exists case_code text;
alter table cases add column if not exists stage text not null default 'triage';
alter table cases add column if not exists condition_text text;
alter table cases add column if not exists hospital text;
alter table cases add column if not exists next_action text;
alter table cases add column if not exists programme_id uuid;
alter table cases add column if not exists provenance text not null default 'community_report';
alter table cases add column if not exists verification_state text not null default 'submitted';

update cases
set case_code = 'SPC-' || upper(left(replace(id::text, '-', ''), 8))
where case_code is null or btrim(case_code) = '';

create unique index if not exists cases_case_code_idx on cases (case_code) where case_code is not null;
create index if not exists cases_ngo_stage_idx on cases (ngo_id, stage, last_activity_at desc) where ngo_id is not null;
create index if not exists cases_ngo_followup_idx on cases (ngo_id, follow_up_at) where ngo_id is not null and follow_up_at is not null;

-- ── First-class follow-ups and a unified timeline ─────────────────────────

create table if not exists animal_followups (
  id uuid primary key default gen_random_uuid(),
  ngo_id uuid not null references ngos(id) on delete cascade,
  dog_id uuid references dogs(id) on delete cascade,
  case_id uuid references cases(id) on delete cascade,
  due_at timestamptz not null,
  status text not null default 'upcoming' check (status in ('upcoming','done','missed','postponed','cancelled')),
  kind text not null default 'review',
  note text,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists animal_followups_ngo_due_idx on animal_followups (ngo_id, status, due_at);
create index if not exists animal_followups_animal_idx on animal_followups (dog_id, due_at desc);

create table if not exists animal_timeline_events (
  id uuid primary key default gen_random_uuid(),
  ngo_id uuid references ngos(id) on delete cascade,
  dog_id uuid not null references dogs(id) on delete cascade,
  case_id uuid references cases(id) on delete set null,
  followup_id uuid references animal_followups(id) on delete set null,
  event_type text not null,
  title text not null,
  details text,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  actor_name text,
  provenance text not null default 'ngo_record',
  source_ref jsonb not null default '{}'::jsonb,
  visibility text not null default 'private' check (visibility in ('private','partner','public')),
  created_at timestamptz not null default now()
);
create index if not exists animal_timeline_events_animal_idx on animal_timeline_events (dog_id, occurred_at desc);
create index if not exists animal_timeline_events_case_idx on animal_timeline_events (case_id, occurred_at desc) where case_id is not null;

-- Medical events become part of the record automatically. Existing rows are
-- not mutated; the trigger only applies to future activity.
create or replace function timeline_from_medical_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_ngo uuid;
begin
  select ngo_id into v_ngo from dogs where id = new.dog_id;
  if new.dog_id is not null then
    insert into animal_timeline_events (ngo_id, dog_id, case_id, event_type, title, details, occurred_at, actor_id, actor_name, provenance, source_ref)
    values (v_ngo, new.dog_id, new.case_id, 'medical:' || new.kind,
            initcap(replace(new.kind, '_', ' ')), new.notes,
            coalesce(new.event_date::timestamptz, now()), new.created_by_id,
            new.performed_by, 'ngo_record', jsonb_build_object('medical_event_id', new.id));
  end if;
  return new;
end $$;
drop trigger if exists medical_event_to_timeline on medical_events;
create trigger medical_event_to_timeline after insert on medical_events
for each row execute function timeline_from_medical_event();

create or replace function timeline_from_followup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.dog_id is not null then
    insert into animal_timeline_events (ngo_id, dog_id, case_id, followup_id, event_type, title, details, occurred_at, provenance, source_ref)
    values (new.ngo_id, new.dog_id, new.case_id, new.id, 'followup:' || new.status,
            case new.status when 'done' then 'Follow-up completed' when 'missed' then 'Follow-up missed' when 'postponed' then 'Follow-up postponed' when 'cancelled' then 'Follow-up cancelled' else 'Follow-up due' end,
            new.note, coalesce(new.completed_at, new.due_at), 'ngo_record', jsonb_build_object('followup_id', new.id));
  end if;
  return new;
end $$;
drop trigger if exists followup_to_timeline on animal_followups;
create trigger followup_to_timeline after insert or update of status, completed_at, note on animal_followups
for each row execute function timeline_from_followup();

-- ── Imports are staging records, not automatic animal creation ────────────

create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  ngo_id uuid not null references ngos(id) on delete cascade,
  source_filename text not null,
  source_kind text not null check (source_kind in ('xlsx','xls','csv')),
  source_storage_path text,
  sheet_name text,
  mapping jsonb not null default '{}'::jsonb,
  status text not null default 'staged' check (status in ('staged','reviewing','imported','rolled_back','failed')),
  rows_total integer not null default 0,
  rows_imported integer not null default 0,
  rows_needing_review integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists import_batches_ngo_created_idx on import_batches (ngo_id, created_at desc);

-- Private source workbooks are retained for provenance. Nothing in this
-- bucket is public; the import API uses the service role after verifying an
-- organisation session.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imports', 'imports', false, 26214400, array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel','text/csv'])
on conflict (id) do update set public = false, file_size_limit = 26214400;

create table if not exists import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references import_batches(id) on delete cascade,
  source_row_number integer not null,
  raw_row jsonb not null,
  normalized jsonb not null default '{}'::jsonb,
  decision text not null default 'review' check (decision in ('new','merge','review','skip')),
  matched_dog_id uuid references dogs(id) on delete set null,
  match_score numeric(5,2),
  match_reasons jsonb not null default '[]'::jsonb,
  imported_dog_id uuid references dogs(id) on delete set null,
  imported_case_id uuid references cases(id) on delete set null,
  error text,
  created_at timestamptz not null default now(),
  unique (batch_id, source_row_number)
);
create index if not exists import_rows_batch_decision_idx on import_rows (batch_id, decision);

-- ── Evidence and review chain ────────────────────────────────────────────

create table if not exists evidence_items (
  id uuid primary key default gen_random_uuid(),
  ngo_id uuid not null references ngos(id) on delete cascade,
  dog_id uuid references dogs(id) on delete set null,
  case_id uuid references cases(id) on delete set null,
  programme_id uuid,
  kind text not null,
  url text,
  title text,
  captured_at timestamptz,
  location_text text,
  metadata jsonb not null default '{}'::jsonb,
  provenance text not null default 'ngo_record',
  verification_state text not null default 'submitted' check (verification_state in ('submitted','evidence_complete','needs_review','verified')),
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists evidence_items_ngo_case_idx on evidence_items (ngo_id, case_id, created_at desc);

-- A story is a deliberate public editorial selection, never an automatic
-- publication of a resolved case. It links to proof but keeps internal
-- timeline details and reporter information private.
create table if not exists case_stories (
  id uuid primary key default gen_random_uuid(),
  ngo_id uuid not null references ngos(id) on delete cascade,
  dog_id uuid references dogs(id) on delete set null,
  case_id uuid references cases(id) on delete set null,
  title text not null,
  public_summary text not null,
  location_label text,
  cover_url text,
  stages jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists case_stories_published_idx on case_stories (published_at desc) where published_at is not null;
alter table case_stories enable row level security;
drop policy if exists case_stories_public_read on case_stories;
create policy case_stories_public_read on case_stories for select using (published_at is not null);
drop policy if exists case_stories_own_read on case_stories;
create policy case_stories_own_read on case_stories for select to authenticated using (ngo_id = my_ngo());

create table if not exists evidence_reviews (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references evidence_items(id) on delete cascade,
  reviewer_id uuid,
  state text not null check (state in ('evidence_complete','needs_review','verified')),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists operational_audit_log (
  id bigserial primary key,
  ngo_id uuid references ngos(id) on delete set null,
  actor_id uuid,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists operational_audit_ngo_time_idx on operational_audit_log (ngo_id, created_at desc);

-- ── Scoped read access. No public policies for operational records. ───────

alter table animal_followups enable row level security;
alter table animal_timeline_events enable row level security;
alter table import_batches enable row level security;
alter table import_rows enable row level security;
alter table evidence_items enable row level security;
alter table evidence_reviews enable row level security;
alter table operational_audit_log enable row level security;

drop policy if exists animal_followups_org_read on animal_followups;
create policy animal_followups_org_read on animal_followups for select to authenticated using (ngo_id = my_ngo());
drop policy if exists animal_timeline_events_org_read on animal_timeline_events;
create policy animal_timeline_events_org_read on animal_timeline_events for select to authenticated using (ngo_id = my_ngo());
drop policy if exists import_batches_org_read on import_batches;
create policy import_batches_org_read on import_batches for select to authenticated using (ngo_id = my_ngo());
drop policy if exists import_rows_org_read on import_rows;
create policy import_rows_org_read on import_rows for select to authenticated using (batch_id in (select id from import_batches where ngo_id = my_ngo()));
drop policy if exists evidence_items_org_read on evidence_items;
create policy evidence_items_org_read on evidence_items for select to authenticated using (ngo_id = my_ngo());
drop policy if exists evidence_reviews_org_read on evidence_reviews;
create policy evidence_reviews_org_read on evidence_reviews for select to authenticated using (evidence_id in (select id from evidence_items where ngo_id = my_ngo()));
drop policy if exists operational_audit_org_read on operational_audit_log;
create policy operational_audit_org_read on operational_audit_log for select to authenticated using (ngo_id = my_ngo());

-- ── Deterministic, drillable operational indicators ───────────────────────

create or replace view org_operations_snapshot with (security_invoker = true) as
select
  c.ngo_id,
  count(*) filter (where c.status not in ('resolved','closed')) as open_cases,
  count(*) filter (where c.status not in ('resolved','closed') and c.severity in ('high','critical')) as urgent_open_cases,
  count(*) filter (where c.follow_up_at < current_date and c.status not in ('resolved','closed')) as overdue_cases,
  count(*) filter (where c.last_activity_at < now() - interval '7 days' and c.status not in ('resolved','closed')) as stale_cases,
  count(*) filter (where c.status = 'resolved') as resolved_cases,
  count(*) filter (where c.status = 'resolved' and c.proof_verified) as verified_cases
from cases c
group by c.ngo_id;

create or replace view org_followup_snapshot with (security_invoker = true) as
select
  ngo_id,
  count(*) filter (where status = 'upcoming' and due_at::date = current_date) as due_today,
  count(*) filter (where status = 'upcoming' and due_at < now()) as overdue,
  count(*) filter (where status = 'missed' and due_at >= now() - interval '30 days') as missed_30d,
  count(*) filter (where status = 'upcoming' and due_at < now() + interval '7 days') as due_this_week,
  count(*) filter (where status = 'done' and completed_at >= now() - interval '30 days') as completed_30d
from animal_followups
group by ngo_id;

-- Support the original workbook without making this NGO-specific product
-- logic. It gives the confirmed operational partner a public profile and is
-- harmless on repeated migration runs.
alter table ngos add column if not exists slug text;
alter table ngos add column if not exists mission text;
alter table ngos add column if not exists city text;
alter table ngos add column if not exists state text;
alter table ngos add column if not exists areas_of_work text[] default '{}';
alter table ngos add column if not exists verified_at timestamptz;
alter table ngos add column if not exists partner_status text not null default 'directory';
alter table ngos add column if not exists partnered_at timestamptz;

-- Public work is an explicit aggregate publication, never an accidental
-- consequence of importing a private operational workbook.
alter table campaigns add column if not exists public_visibility text not null default 'private'
  check (public_visibility in ('private','summary','public'));
alter table campaigns add column if not exists public_summary text;
alter table campaigns add column if not exists published_at timestamptz;

create or replace view public_programme_cards as
select
  c.id, c.name, c.kind, c.starts_on, c.ends_on, c.zone, c.public_summary,
  n.name as ngo_name, n.slug as ngo_slug, n.city, n.state,
  count(d.id) as animals_recorded,
  count(d.id) filter (where d.sterilisation_status = 'sterilised') as sterilised_recorded,
  count(d.id) filter (where d.vaccination_status = 'vaccinated') as vaccinated_recorded
from campaigns c
join ngos n on n.id = c.ngo_id
left join dogs d on d.campaign_id = c.id
where c.public_visibility in ('summary','public')
  and c.archived_at is not null
group by c.id, n.id;

grant select on public_programme_cards to anon, authenticated;

insert into ngos (name, area, city, state, slug, mission, areas_of_work, verified, verified_at, partner_status, partnered_at)
select
  'The Pawsome People Project',
  'Coimbatore',
  'Coimbatore',
  'Tamil Nadu',
  'the-pawsome-people-project',
  'Community animal rescue, treatment follow-up, sterilisation and vaccination work in Coimbatore.',
  array['Rescue', 'Treatment', 'ABC', 'Follow-up'],
  true,
  now(),
  'operational_partner',
  now()
where not exists (select 1 from ngos where slug = 'the-pawsome-people-project' or name = 'The Pawsome People Project');
