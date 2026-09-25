-- Public-source atlas records, provenance and aggregate area facts.
--
-- This extends the existing dogs/import/ngos architecture.  Individual
-- source observations remain dogs; aggregate census rows never do.

create table if not exists public.data_sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  source_type text not null check (source_type in ('research_dataset','municipal_dataset','public_api','media_repository','government_dataset')),
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
  updated_at timestamptz not null default now()
);

comment on table public.data_sources is 'Machine-readable registry for every external atlas source, including licensing and publication decisions.';

alter table public.data_sources enable row level security;
drop policy if exists "published atlas sources are public" on public.data_sources;
create policy "published atlas sources are public"
  on public.data_sources for select to anon, authenticated
  using (publication_status = 'published' and license_status = 'verified');

revoke all on public.data_sources from anon, authenticated;
grant select on public.data_sources to anon, authenticated;
grant all on public.data_sources to service_role;

alter table public.dogs
  add column if not exists data_source_id uuid references public.data_sources(id) on delete set null,
  add column if not exists source_record_id text,
  add column if not exists original_observed_at timestamptz,
  add column if not exists observed_date_precision text,
  add column if not exists importer_version text,
  add column if not exists external_image_url text,
  add column if not exists geographic_precision text;

do $$ begin
  alter table public.dogs add constraint dogs_observed_date_precision_check
    check (observed_date_precision is null or observed_date_precision in ('day','month','year','unknown'));
exception when duplicate_object then null; end $$;

create unique index if not exists dogs_data_source_record_uidx
  on public.dogs(data_source_id, source_record_id)
  where data_source_id is not null and source_record_id is not null;
create index if not exists dogs_data_source_id_idx on public.dogs(data_source_id);
create index if not exists dogs_original_observed_at_idx on public.dogs(original_observed_at desc)
  where original_observed_at is not null;

-- Append public-safe identity fields required by native profiles.  Provenance
-- JSON and exact coordinates remain private; the existing coordinate rounding
-- is preserved verbatim.
create or replace view public.public_animal_profiles
with (security_invoker = true) as
select
  d.id, d.name, d.species, d.zone,
  case when d.lat between -90 and 90 and d.lng between -180 and 180
         and not (d.lat = 0 and d.lng = 0)
       then round(d.lat::numeric, 2)::double precision end as lat,
  case when d.lat between -90 and 90 and d.lng between -180 and 180
         and not (d.lat = 0 and d.lng = 0)
       then round(d.lng::numeric, 2)::double precision end as lng,
  d.status, d.cover_photo, d.size, d.color, d.is_friendly, d.needs_help,
  d.sterilised, d.vaccinated, d.sterilisation_status, d.vaccination_status,
  d.ear_notch, d.trust_score, d.sightings_count, d.feed_count,
  d.first_seen, d.last_seen, d.last_fed_at, d.created_at, d.ngo_id, d.code,
  d.provenance, n.name as ngo_name,
  d.straypaw_id, d.sex, d.city, d.state,
  d.data_source_id, d.source_record_id, d.original_observed_at,
  d.observed_date_precision, d.external_image_url
from public.dogs d left join public.ngos n on n.id = d.ngo_id;

revoke all on public.public_animal_profiles from anon, authenticated;
grant select on public.public_animal_profiles to anon, authenticated;

alter table public.import_batches
  add column if not exists data_source_id uuid references public.data_sources(id) on delete set null;
create index if not exists import_batches_data_source_id_idx on public.import_batches(data_source_id)
  where data_source_id is not null;

create table if not exists public.atlas_area_metrics (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references public.data_sources(id) on delete restrict,
  reporting_org_id uuid references public.ngos(id) on delete set null,
  source_record_id text not null,
  state text not null,
  district text,
  city text,
  area_level text not null check (area_level in ('country','state','district','city','zone','ward','sector','locality','survey_route','site')),
  area_code text,
  area_name text not null,
  centroid_lat double precision,
  centroid_lng double precision,
  observed_from date,
  observed_to date,
  census_year integer,
  estimated_population numeric,
  observed_individuals integer,
  density_per_sq_km numeric,
  male_count integer,
  female_count integer,
  puppy_count integer,
  lactating_female_count integer,
  sterilised_count integer,
  sterilisation_percent numeric,
  vaccinated_count integer,
  vaccination_percent numeric,
  complaint_count integer,
  abc_activity_count integer,
  catching_count integer,
  release_count integer,
  treatment_count integer,
  feeding_site_count integer,
  shelter_count integer,
  abc_centre_count integer,
  veterinary_site_count integer,
  confidence_low numeric,
  confidence_high numeric,
  methodology text,
  geographic_precision text,
  extra_metrics jsonb not null default '{}'::jsonb,
  publication_status text not null default 'staged' check (publication_status in ('staged','validated','published','blocked')),
  imported_at timestamptz not null default now(),
  importer_version text not null,
  unique(data_source_id, source_record_id),
  check ((centroid_lat is null and centroid_lng is null) or
         (centroid_lat between -90 and 90 and centroid_lng between -180 and 180)),
  check (census_year is null or census_year between 1900 and 2200)
);

comment on table public.atlas_area_metrics is 'Area-level census and programme facts. Rows are never expanded into synthetic animals.';

create index if not exists atlas_area_metrics_place_idx on public.atlas_area_metrics(state, city, area_level);
create index if not exists atlas_area_metrics_source_idx on public.atlas_area_metrics(data_source_id);
create index if not exists atlas_area_metrics_centroid_idx on public.atlas_area_metrics(centroid_lat, centroid_lng)
  where centroid_lat is not null and centroid_lng is not null;

alter table public.atlas_area_metrics enable row level security;
drop policy if exists "published atlas area facts are public" on public.atlas_area_metrics;
create policy "published atlas area facts are public"
  on public.atlas_area_metrics for select to anon, authenticated
  using (
    publication_status = 'published'
    and exists (
      select 1 from public.data_sources s
      where s.id = data_source_id
        and s.publication_status = 'published'
        and s.license_status = 'verified'
    )
  );

revoke all on public.atlas_area_metrics from anon, authenticated;
grant select on public.atlas_area_metrics to anon, authenticated;
grant all on public.atlas_area_metrics to service_role;

create or replace view public.public_atlas_area_metrics
with (security_invoker = true) as
select
  m.id, m.data_source_id, m.reporting_org_id, m.source_record_id,
  m.state, m.district, m.city, m.area_level, m.area_code, m.area_name,
  m.centroid_lat, m.centroid_lng, m.observed_from, m.observed_to, m.census_year,
  m.estimated_population, m.observed_individuals, m.density_per_sq_km,
  m.male_count, m.female_count, m.puppy_count, m.lactating_female_count,
  m.sterilised_count, m.sterilisation_percent,
  m.vaccinated_count, m.vaccination_percent,
  m.complaint_count, m.abc_activity_count, m.catching_count, m.release_count,
  m.treatment_count, m.feeding_site_count, m.shelter_count,
  m.abc_centre_count, m.veterinary_site_count,
  m.confidence_low, m.confidence_high, m.methodology, m.geographic_precision,
  m.extra_metrics, s.organization_name, s.source_dataset, s.source_url,
  s.source_license, n.name as reporting_org_name, n.slug as reporting_org_slug
from public.atlas_area_metrics m
join public.data_sources s on s.id = m.data_source_id
left join public.ngos n on n.id = m.reporting_org_id
where m.publication_status = 'published'
  and s.publication_status = 'published'
  and s.license_status = 'verified';

revoke all on public.public_atlas_area_metrics from anon, authenticated;
grant select on public.public_atlas_area_metrics to anon, authenticated;

create or replace view public.public_contributor_organisations
with (security_invoker = true) as
select
  n.id, n.name, n.slug, n.area, n.logo_url, n.verified, n.mission, n.about,
  n.website, n.city, n.state, n.areas_of_work, n.cover_photo, n.founded_year,
  n.partner_status,
  case when n.partner_status = 'operational_partner' then 'partner' else 'data_source' end as directory_kind,
  (select count(*)::integer from public.dogs d where d.ngo_id = n.id) as animal_count,
  (select count(*)::integer from public.atlas_area_metrics m where m.reporting_org_id = n.id and m.publication_status = 'published') as area_record_count,
  (select count(*)::integer from public.data_sources s where s.reporting_org_id = n.id and s.publication_status = 'published' and s.license_status = 'verified') as source_count
from public.ngos n
where n.partner_status = 'operational_partner'
   or exists (
     select 1 from public.data_sources s
     where s.reporting_org_id = n.id
       and s.publication_status = 'published'
       and s.license_status = 'verified'
   );

revoke all on public.public_contributor_organisations from anon, authenticated;
grant select on public.public_contributor_organisations to anon, authenticated;
