-- Generic staged workbook imports. These fields are additive: raw workbook
-- rows remain the provenance record while classification and fingerprints make
-- retries safe and auditable.

alter table import_batches add column if not exists workbook_hash text;
alter table import_batches add column if not exists preview jsonb not null default '{}'::jsonb;
alter table import_rows add column if not exists classification text;
alter table import_rows add column if not exists row_fingerprint text;
alter table import_rows add column if not exists source_subrecord text;
alter table import_rows add column if not exists imported_sighting_id uuid references sightings(id) on delete set null;
alter table dogs add column if not exists location_precision text not null default 'exact'
  check (location_precision in ('exact', 'approximate', 'unknown'));

create unique index if not exists import_batches_ngo_workbook_hash_idx
  on import_batches (ngo_id, workbook_hash, coalesce(sheet_name, ''))
  where workbook_hash is not null and status <> 'rolled_back';
create unique index if not exists import_rows_batch_fingerprint_idx
  on import_rows (batch_id, row_fingerprint, coalesce(source_subrecord, ''))
  where row_fingerprint is not null;
-- A physical spreadsheet row can legitimately contain distinct adoption and
-- foster sub-records. The old two-column constraint rejected that shape.
alter table import_rows drop constraint if exists import_rows_batch_id_source_row_number_key;
create unique index if not exists import_rows_batch_source_row_subrecord_idx
  on import_rows (batch_id, source_row_number, coalesce(source_subrecord, ''));

-- Cached locality results prevent repeated geocoder calls and keep the source
-- distinction clear: this is a neighbourhood approximation, never a claim of
-- a precise pickup point.
create table if not exists import_location_cache (
  id uuid primary key default gen_random_uuid(),
  normalized_query text not null unique,
  locality text not null,
  city text,
  state text,
  country text not null default 'India',
  lat double precision,
  lng double precision,
  provider text,
  precision text not null default 'unresolved' check (precision in ('approximate', 'unresolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table import_location_cache enable row level security;
revoke all on import_location_cache from anon, authenticated;

-- An import row may exist without a known animal. Keep the exact original
-- event date separately so unknown dates do not become import-time activity.
alter table cases add column if not exists imported_at timestamptz;
alter table cases add column if not exists source_event_at timestamptz;

-- Master Import writes the same canonical objects used by the rest of
-- StrayPaw. These links make every generated object traceable to a specific
-- organisation workbook/batch without creating a disconnected archive.
alter table dogs add column if not exists import_batch_id uuid references import_batches(id) on delete set null;
alter table cases add column if not exists import_batch_id uuid references import_batches(id) on delete set null;
alter table cases add column if not exists source_metadata jsonb not null default '{}'::jsonb;
alter table medical_events add column if not exists import_batch_id uuid references import_batches(id) on delete set null;
alter table medical_events add column if not exists source_metadata jsonb not null default '{}'::jsonb;
alter table animal_followups add column if not exists import_batch_id uuid references import_batches(id) on delete set null;
alter table animal_followups add column if not exists source_metadata jsonb not null default '{}'::jsonb;

create index if not exists dogs_import_batch_idx on dogs (import_batch_id) where import_batch_id is not null;
create index if not exists cases_import_batch_idx on cases (import_batch_id) where import_batch_id is not null;
create index if not exists medical_events_import_batch_idx on medical_events (import_batch_id) where import_batch_id is not null;
create index if not exists animal_followups_import_batch_idx on animal_followups (import_batch_id) where import_batch_id is not null;

-- The operational-record triggers already create a timeline entry for native
-- medical/follow-up rows. Preserve import provenance and the original source
-- date there as well, rather than making a parallel import-only timeline.
create or replace function timeline_from_medical_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_ngo uuid;
begin
  select ngo_id into v_ngo from dogs where id = new.dog_id;
  if new.dog_id is not null then
    insert into animal_timeline_events (ngo_id, dog_id, case_id, event_type, title, details, occurred_at, actor_id, actor_name, provenance, source_ref, visibility)
    values (v_ngo, new.dog_id, new.case_id, 'medical:' || new.kind,
            initcap(replace(new.kind, '_', ' ')), new.notes,
            coalesce(new.event_date::timestamptz, now()), new.created_by_id,
            new.performed_by,
            case when new.import_batch_id is null then 'ngo_record' else 'imported_historical_record' end,
            case when new.import_batch_id is null then jsonb_build_object('medical_event_id', new.id)
                 else coalesce(new.source_metadata, '{}'::jsonb) || jsonb_build_object('medical_event_id', new.id, 'import_batch_id', new.import_batch_id) end,
            case when new.import_batch_id is null then 'private' else 'partner' end);
  end if;
  return new;
end $$;

create or replace function timeline_from_followup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.dog_id is not null then
    insert into animal_timeline_events (ngo_id, dog_id, case_id, followup_id, event_type, title, details, occurred_at, provenance, source_ref, visibility)
    values (new.ngo_id, new.dog_id, new.case_id, new.id, 'followup:' || new.status,
            case new.status when 'done' then 'Follow-up completed' when 'missed' then 'Follow-up missed' when 'postponed' then 'Follow-up postponed' when 'cancelled' then 'Follow-up cancelled' else 'Follow-up due' end,
            new.note, coalesce(new.completed_at, new.due_at),
            case when new.import_batch_id is null then 'ngo_record' else 'imported_historical_record' end,
            case when new.import_batch_id is null then jsonb_build_object('followup_id', new.id)
                 else coalesce(new.source_metadata, '{}'::jsonb) || jsonb_build_object('followup_id', new.id, 'import_batch_id', new.import_batch_id) end,
            case when new.import_batch_id is null then 'private' else 'partner' end);
  end if;
  return new;
end $$;
