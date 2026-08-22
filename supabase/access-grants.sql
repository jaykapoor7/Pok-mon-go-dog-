-- ════════════════════════════════════════════════════════════════
-- Access grant log — a record of every partner access you grant, so there's
-- an audit trail of who was onboarded and when. Written by the admin route
-- (service role). Idempotent.
-- ════════════════════════════════════════════════════════════════
create table if not exists access_grants (
  id         uuid primary key default gen_random_uuid(),
  email      text,
  org_name   text,
  ngo_id     uuid,
  created_at timestamptz not null default now()
);
create index if not exists access_grants_created_idx on access_grants (created_at desc);

alter table access_grants enable row level security; -- service role only (no policy)
