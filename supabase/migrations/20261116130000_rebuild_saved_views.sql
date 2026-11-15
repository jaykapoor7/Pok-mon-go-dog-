-- Saved views and pinned records (the frame's sidebar). Additive: one table, private to each person.
create table if not exists public.nx_saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  org_id uuid,
  kind text not null check (kind in ('view', 'pin')),
  page text not null check (page ~ '^/' and length(page) <= 200),
  name text not null check (length(name) between 1 and 80),
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object' and length(state::text) <= 4000),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists nx_saved_views_user on public.nx_saved_views (user_id, kind, page);
alter table public.nx_saved_views enable row level security;
drop policy if exists nx_saved_views_own on public.nx_saved_views;
create policy nx_saved_views_own on public.nx_saved_views for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (org_id is null or public.nx_is_member(org_id)));
grant select, insert, update, delete on public.nx_saved_views to authenticated;
revoke all on public.nx_saved_views from anon;
