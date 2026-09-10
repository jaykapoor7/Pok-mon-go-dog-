-- Personal, non-organisation access codes for residents and feeders.
-- These are deliberately separate from NGO credentials: they identify a
-- person and restore their workspace, but grant no organisation permissions.
create table if not exists personal_access_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  role text not null check (role in ('individual', 'feeder')),
  code text not null unique,
  active boolean not null default true,
  uses int not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table personal_access_codes enable row level security;
-- All reads and writes flow through the server-side access endpoints.
