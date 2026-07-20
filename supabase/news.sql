-- ════════════════════════════════════════════════════════════════
-- StrayPaw — verified news / government orders about street dogs in India.
--
-- Run ONCE in the Supabase SQL editor (idempotent). Admin-curated: each item is
-- posted from the moderation panel with a source link, so it's verifiable.
-- Public can read PUBLISHED items only; all writes go through the service role.
-- ════════════════════════════════════════════════════════════════

create table if not exists news (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  summary      text,
  source_name  text,                       -- e.g. "The Hindu", "Times of India"
  source_url   text,                       -- link to the article
  category     text not null default 'other', -- govt-order | policy | welfare | community | other
  image_url    text,
  published_at date,                        -- date of the news
  is_published boolean not null default true,
  auto         boolean not null default false, -- true = fetched by the scraper
  created_at   timestamptz not null default now()
);
alter table news add column if not exists auto boolean not null default false;
create index if not exists news_pub_idx on news (is_published, published_at desc);
-- Dedupe key for the scraper (partial unique so admin rows may have null url).
create unique index if not exists news_source_url_uniq on news (source_url)
  where source_url is not null;

alter table news enable row level security;
drop policy if exists news_read on news;
create policy news_read on news for select using (is_published = true);
-- No public write policy — the moderation panel writes via the service role.
