-- ════════════════════════════════════════════════════════════════
-- StrayPaw local staging: schema DRIFT reconstruction (LOCAL ONLY).
--
-- Objects that later repo files depend on but that NO file in supabase/
-- creates (they exist in production through migrations that are not in the
-- repo), plus one fresh-database ordering cycle. Each item is a minimal,
-- usage-inferred reconstruction so the rest of the repo SQL can apply.
-- Every item here is a finding: see docs/straypaw-2/STAGING.md.
-- ════════════════════════════════════════════════════════════════

-- (1) Ordering cycle: register-intelligence.sql (line ~467) reads
--     cases.status_reviewed_at, which only case-review.sql adds, and
--     case-review.sql "Depends on: register-intelligence.sql".
alter table public.cases add column if not exists status_reviewed_at timestamptz;

-- (2) public.data_sources: altered/joined by data-source-organisation-register.sql,
--     source-photos-and-provenance.sql, spatial-recovery-followup.sql and read by
--     src/lib/kind-hour.ts, but created by no repo file.
create table if not exists public.data_sources (
  id                     uuid primary key default extensions.uuid_generate_v4(),
  slug                   text unique not null,
  name                   text,
  source_type            text,
  reporting_org_id       uuid references public.ngos(id),
  url                    text,
  licence                text,
  record_count           integer,
  published_record_count integer,
  metadata               jsonb default '{}'::jsonb,
  created_at             timestamptz default now()
);
alter table public.data_sources enable row level security;

-- (3) dogs provenance columns used by source-photos-and-provenance.sql and
--     later views, added by no repo file.
alter table public.dogs add column if not exists data_source_id     uuid references public.data_sources(id);
alter table public.dogs add column if not exists external_image_url text;
alter table public.dogs add column if not exists source_record_id   text;
alter table public.dogs add column if not exists source_metadata    jsonb;
alter table public.dogs add column if not exists original_observed_at    timestamptz;
alter table public.dogs add column if not exists observed_date_precision text;

-- (4) public.atlas_area_metrics: indexed by spatial-recovery-followup.sql and
--     read by src/app/for-governments (via public_atlas_area_metrics); created
--     by no repo file.
create table if not exists public.atlas_area_metrics (
  id                 uuid primary key default extensions.uuid_generate_v4(),
  reporting_org_id   uuid references public.ngos(id),
  publication_status text,
  created_at         timestamptz default now()
);
alter table public.atlas_area_metrics enable row level security;

-- (5) public_contributor_organisations: joined by living-map.sql,
--     living-map-org-and-snapshots.sql and read by src/lib/livingmap/server.ts
--     and src/lib/animal/living.ts (columns id, name); created by no repo file.
--     Reconstructed as a public projection of non-private org identity only.
create or replace view public.public_contributor_organisations as
  select n.id, n.name, n.slug, n.city, n.state from public.ngos n;
grant select on public.public_contributor_organisations to anon, authenticated;
