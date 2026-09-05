-- ════════════════════════════════════════════════════════════════
-- StrayPaw, featured / curated fundraisers.
--
-- Run ONCE in the Supabase SQL editor (idempotent). Adds a `featured` flag so
-- StrayPaw can CURATE a highlighted feed of reputable rescues' existing
-- campaigns (added by the admin, no partner onboarding needed) alongside the
-- partner-created ones. Curated entries are inserted with the service role from
-- /api/admin/fundraisers (created_by_id null, featured true).
-- ════════════════════════════════════════════════════════════════

alter table fundraisers add column if not exists featured boolean not null default false;
create index if not exists fundraisers_featured_idx on fundraisers (featured desc, created_at desc);
