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
