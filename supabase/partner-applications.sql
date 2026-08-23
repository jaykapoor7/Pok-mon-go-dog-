-- ════════════════════════════════════════════════════════════════
-- Partnership applications — a public lead-capture form for NGOs that want to
-- onboard: organisation details, a message, and uploaded onboarding documents.
-- Lands in the moderation console. Idempotent.
-- ════════════════════════════════════════════════════════════════
create table if not exists partner_applications (
  id           uuid primary key default gen_random_uuid(),
  org_name     text not null,
  contact_name text,
  email        text,
  phone        text,
  city         text,
  website      text,
  about        text,
  documents    jsonb not null default '[]',   -- [{name,url}]
  status       text not null default 'new',   -- new | reviewed | approved | rejected
  created_at   timestamptz not null default now()
);
create index if not exists partner_applications_status_idx on partner_applications (status, created_at desc);

alter table partner_applications enable row level security;
-- Anyone may submit an application; nobody may read them (service role only, for
-- the moderation console).
drop policy if exists partner_applications_insert on partner_applications;
create policy partner_applications_insert on partner_applications for insert with check (true);

-- Storage bucket for uploaded onboarding documents.
insert into storage.buckets (id, name, public)
values ('partner-docs', 'partner-docs', true)
on conflict (id) do nothing;

drop policy if exists partner_docs_insert on storage.objects;
create policy partner_docs_insert on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'partner-docs');

drop policy if exists partner_docs_read on storage.objects;
create policy partner_docs_read on storage.objects
  for select using (bucket_id = 'partner-docs');
