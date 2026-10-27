-- Synthetic-only local staging. Columns/defaults and constraints inspected from production on 2026-10-27.
-- This fixture excludes PostGIS triggers/views; it does not pretend to be hosted Supabase.
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key, banned_until timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
grant usage on schema auth,public to anon,authenticated,service_role; grant execute on function auth.uid(),auth.role() to anon,authenticated,service_role;
create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
grant usage on schema storage to anon,authenticated;
grant select,insert on storage.objects to anon,authenticated;
create policy legacy_permissive_storage_read on storage.objects for select to anon,authenticated using(true);
create table public.import_batches(id uuid primary key);
create type public.dog_status as enum ('seen','hungry','injured','sterilised','vaccinated');
create type public.case_status as enum ('unverified','assigned','in_progress','resolved','closed');
create type public.case_severity as enum ('low','normal','high','critical');
create type public.case_category as enum ('injury','sterilisation','rescue','vaccination','other');
create type public.case_resolution as enum ('sterilized','rescued','treated');
create type public.case_update_type as enum ('created','claimed','assigned','status_changed','note','reopened');
create table public.animal_followups (
id uuid primary key not null default gen_random_uuid(),
ngo_id uuid  not null ,
dog_id uuid   ,
case_id uuid   ,
due_at timestamptz  not null ,
status text  not null default 'upcoming'::text,
kind text  not null default 'review'::text,
note text   ,
completed_at timestamptz   ,
created_by uuid   ,
created_at timestamptz  not null default now(),
updated_at timestamptz  not null default now(),
import_batch_id uuid   ,
source_metadata jsonb  not null default '{}'::jsonb,
import_source_key text   
);
create table public.animal_timeline_events (
id uuid primary key not null default gen_random_uuid(),
ngo_id uuid   ,
dog_id uuid  not null ,
case_id uuid   ,
followup_id uuid   ,
event_type text  not null ,
title text  not null ,
details text   ,
occurred_at timestamptz  not null default now(),
actor_id uuid   ,
actor_name text   ,
provenance text  not null default 'ngo_record'::text,
source_ref jsonb  not null default '{}'::jsonb,
visibility text  not null default 'private'::text,
created_at timestamptz  not null default now(),
import_source_key text   
);
create table public.case_updates (
id uuid primary key not null default gen_random_uuid(),
case_id uuid   ,
actor_id uuid   ,
actor_name text   ,
type case_update_type  not null ,
from_status case_status   ,
to_status case_status   ,
note text   ,
created_at timestamptz   default now(),
is_demo bool  not null default false
);
create table public.cases (
id uuid primary key not null default gen_random_uuid(),
dog_id uuid   ,
title text  not null ,
description text   ,
zone text   ,
lat float8   ,
lng float8   ,
severity case_severity   default 'normal'::case_severity,
category case_category   default 'other'::case_category,
tags text[]   default '{}'::text[],
status case_status   default 'unverified'::case_status,
resolution case_resolution   ,
assignee_id uuid   ,
assignee_name text   ,
ngo_id uuid   ,
created_by_id uuid   ,
created_by_name text   ,
created_at timestamptz   default now(),
updated_at timestamptz   default now(),
last_activity_at timestamptz   default now(),
due_at timestamptz   ,
resolved_at timestamptz   ,
before_url text   ,
after_url text   ,
outcome_note text   ,
proof_verified bool  not null default false,
verified_at timestamptz   ,
cost_spent numeric   ,
species text  not null default 'dog'::text,
follow_up_at date   ,
medical_notes text   ,
photos text[]  not null default '{}'::text[],
is_demo bool  not null default false,
case_code text   ,
stage text  not null default 'triage'::text,
condition_text text   ,
hospital text   ,
next_action text   ,
programme_id uuid   ,
provenance text  not null default 'community_report'::text,
verification_state text  not null default 'submitted'::text,
imported_at timestamptz   ,
source_event_at timestamptz   ,
import_batch_id uuid   ,
source_metadata jsonb  not null default '{}'::jsonb,
cost_estimate numeric   ,
h3_r8 text   ,
city text   ,
district text   ,
state text   ,
location_precision text   ,
condition_class text   ,
status_class text   ,
closure_reason text   ,
intake_channel text   ,
first_action_at timestamptz   ,
resolved_at_source text   ,
status_reviewed_at timestamptz   ,
informer_contact text   ,
import_source_key text   
);
create table public.dogs (
id uuid primary key not null default gen_random_uuid(),
name text   ,
zone text   ,
lat float8  not null ,
lng float8  not null ,
status dog_status   default 'seen'::dog_status,
cover_photo text   ,
size text   default 'medium'::text,
color text   default 'Brown'::text,
is_friendly bool   default true,
needs_help bool   default false,
sterilised bool   default false,
vaccinated bool   default false,
trust_score int4   default 50,
sightings_count int4   default 1,
feed_count int4   default 0,
first_seen timestamptz   default now(),
last_seen timestamptz   default now(),
created_at timestamptz   default now(),
colony text   ,
city text   ,
last_fed_at timestamptz   ,
ear_notch text   ,
species text  not null default 'dog'::text,
ngo_id uuid   ,
code text   ,
assignee_id uuid   ,
assignee_name text   ,
intake_notes text   ,
owner_name text   ,
owner_contact text   ,
sterilisation_status text   default 'unknown'::text,
vaccination_status text   default 'unknown'::text,
campaign_id uuid   ,
is_demo bool  not null default false,
straypaw_id text   ,
sex text   ,
identifiers text   ,
provenance text  not null default 'community_report'::text,
source_metadata jsonb  not null default '{}'::jsonb,
identity_state text  not null default 'confirmed'::text,
updated_at timestamptz  not null default now(),
created_by_id uuid   ,
created_by_name text   ,
location_precision text  not null default 'exact'::text,
import_batch_id uuid   ,
h3_r8 text   ,
district text   ,
state text   ,
data_source_id uuid   ,
source_record_id text   ,
original_observed_at timestamptz   ,
observed_date_precision text   ,
importer_version text   ,
external_image_url text   ,
geographic_precision text   ,
import_source_key text   ,
photo_sensitive bool   
);
create table public.medical_events (
id uuid primary key not null default gen_random_uuid(),
dog_id uuid   ,
case_id uuid   ,
kind text  not null ,
event_date date  not null default CURRENT_DATE,
notes text   ,
performed_by text   ,
created_by_id uuid   ,
created_at timestamptz  not null default now(),
is_demo bool  not null default false,
import_batch_id uuid   ,
source_metadata jsonb  not null default '{}'::jsonb,
import_source_key text   
);
create table public.ngo_members (
user_id uuid primary key not null ,
ngo_id uuid   ,
created_at timestamptz  not null default now(),
role text  not null default 'member'::text
);
create table public.ngos (
id uuid primary key not null default gen_random_uuid(),
name text  not null ,
area text   ,
logo_url text   ,
dogs_helped int4   default 0,
verified bool   default false,
created_at timestamptz   default now(),
slug text   ,
mission text   ,
about text   ,
website text   ,
contact_email text   ,
contact_phone text   ,
city text   ,
state text   ,
areas_of_work text[]   default '{}'::text[],
cover_photo text   ,
founded_year int4   ,
registration_no text   ,
verified_at timestamptz   ,
config jsonb  not null default '{}'::jsonb,
demo_mode bool  not null default false,
partner_status text  not null default 'directory'::text,
partnered_at timestamptz   
);
create table public.volunteers (
id uuid primary key not null ,
name text  not null ,
phone text   ,
ngo_id uuid   ,
created_at timestamptz   default now(),
is_demo bool  not null default false
);
alter table public.animal_followups add constraint animal_followups_case_id_fkey FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE;
alter table public.animal_followups add constraint animal_followups_dog_id_fkey FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE CASCADE;
alter table public.animal_followups add constraint animal_followups_import_batch_id_fkey FOREIGN KEY (import_batch_id) REFERENCES import_batches(id) ON DELETE SET NULL;
alter table public.animal_followups add constraint animal_followups_ngo_id_fkey FOREIGN KEY (ngo_id) REFERENCES ngos(id) ON DELETE CASCADE;
alter table public.animal_followups add constraint animal_followups_status_check CHECK ((status = ANY (ARRAY['upcoming'::text, 'done'::text, 'missed'::text, 'postponed'::text, 'cancelled'::text])));
alter table public.animal_timeline_events add constraint animal_timeline_events_case_id_fkey FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL;
alter table public.animal_timeline_events add constraint animal_timeline_events_dog_id_fkey FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE CASCADE;
alter table public.animal_timeline_events add constraint animal_timeline_events_followup_id_fkey FOREIGN KEY (followup_id) REFERENCES animal_followups(id) ON DELETE SET NULL;
alter table public.animal_timeline_events add constraint animal_timeline_events_ngo_id_fkey FOREIGN KEY (ngo_id) REFERENCES ngos(id) ON DELETE CASCADE;
alter table public.animal_timeline_events add constraint animal_timeline_events_visibility_check CHECK ((visibility = ANY (ARRAY['private'::text, 'partner'::text, 'public'::text])));
alter table public.cases add constraint cases_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES volunteers(id);
alter table public.cases add constraint cases_closure_reason_check CHECK (((closure_reason IS NULL) OR (closure_reason = ANY (ARRAY['could_not_locate'::text, 'died'::text, 'recovered'::text, 'caller_unreachable'::text, 'other_ngo'::text, 'duplicate'::text, 'not_attended'::text, 'other'::text, 'unspecified'::text]))));
alter table public.cases add constraint cases_dog_id_fkey FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE SET NULL;
alter table public.cases add constraint cases_import_batch_id_fkey FOREIGN KEY (import_batch_id) REFERENCES import_batches(id) ON DELETE SET NULL;
alter table public.cases add constraint cases_intake_channel_check CHECK (((intake_channel IS NULL) OR (intake_channel = ANY (ARRAY['own_line'::text, 'partner_org'::text, 'individual'::text, 'team_found'::text, 'resident_report'::text, 'other'::text]))));
alter table public.cases add constraint cases_ngo_id_fkey FOREIGN KEY (ngo_id) REFERENCES ngos(id);
alter table public.cases add constraint cases_resolved_at_source_check CHECK (((resolved_at_source IS NULL) OR (resolved_at_source = ANY (ARRAY['recorded'::text, 'import_derived'::text, 'import_assumed'::text]))));
alter table public.cases add constraint cases_species_dog_only CHECK ((NOT (species IS DISTINCT FROM 'dog'::text)));
alter table public.cases add constraint cases_status_class_check CHECK (((status_class IS NULL) OR (status_class = ANY (ARRAY['open'::text, 'in_progress'::text, 'closed'::text, 'no_action'::text, 'other_ngo'::text, 'not_attended'::text]))));
alter table public.medical_events add constraint medical_events_case_id_fkey FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL;
alter table public.medical_events add constraint medical_events_dog_id_fkey FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE CASCADE;
alter table public.medical_events add constraint medical_events_import_batch_id_fkey FOREIGN KEY (import_batch_id) REFERENCES import_batches(id) ON DELETE SET NULL;
alter table public.ngo_members add constraint ngo_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.cases enable row level security;
create policy own_cases on public.cases to authenticated using(ngo_id in(select ngo_id from public.ngo_members where user_id=auth.uid()));
grant select on public.cases,public.ngo_members to authenticated;

