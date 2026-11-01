-- Kaju Connections (2026-11-01). Additive: four new tables, no existing object changed.
--
-- connections            one row per person per provider account. A person sees
--                        their own; a connection is visible to their organisation
--                        only when they choose to share it and the organisation's
--                        policy allows sharing.
-- connection_secrets     OAuth tokens, encrypted by the server (AES-256-GCM, key in
--                        the CONNECTIONS_ENC_KEY environment variable). No client
--                        role can read or write this table.
-- org_connection_policies an organisation lead can switch a provider off for the
--                        organisation, and decide whether members may share.
-- connection_audit       every connect, use, refresh, failure and disconnect.
--
-- All writes go through server routes that verify the signed-in person first
-- (src/app/api/connections). Clients only read, and only what RLS allows.

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ngo_id uuid references public.ngos(id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft')),
  account_email text,
  account_name text,
  scopes text[] not null default '{}',
  capabilities text[] not null default '{}',
  status text not null default 'connected' check (status in ('connected', 'expired', 'error', 'revoked')),
  share_with_org boolean not null default false,
  last_error text,
  connected_at timestamptz not null default now(),
  last_used_at timestamptz,
  last_refreshed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.connection_secrets (
  connection_id uuid primary key references public.connections(id) on delete cascade,
  access_token_enc text not null,
  refresh_token_enc text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.org_connection_policies (
  ngo_id uuid not null references public.ngos(id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft')),
  allowed boolean not null default true,
  allow_org_sharing boolean not null default false,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  primary key (ngo_id, provider)
);

create table if not exists public.connection_audit (
  id bigserial primary key,
  connection_id uuid,
  user_id uuid,
  ngo_id uuid,
  provider text not null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists connection_audit_conn on public.connection_audit (connection_id, created_at desc);

alter table public.connections enable row level security;
alter table public.connection_secrets enable row level security;
alter table public.org_connection_policies enable row level security;
alter table public.connection_audit enable row level security;

create policy conn_read on public.connections for select to authenticated
  using (user_id = auth.uid()
    or (share_with_org and ngo_id is not null and ngo_id = public.my_ngo()
        and exists (select 1 from public.org_connection_policies p where p.ngo_id = connections.ngo_id and p.provider = connections.provider and p.allowed and p.allow_org_sharing)));
create policy ocp_read on public.org_connection_policies for select to authenticated using (ngo_id = public.my_ngo());
create policy caud_read on public.connection_audit for select to authenticated
  using (user_id = auth.uid() or (ngo_id = public.my_ngo() and exists (select 1 from public.ngo_members m where m.user_id = auth.uid() and m.ngo_id = connection_audit.ngo_id and m.role = 'admin')));

revoke all on public.connection_secrets from anon, authenticated;
revoke insert, update, delete on public.connections, public.org_connection_policies, public.connection_audit from anon, authenticated;
revoke all on public.connections, public.org_connection_policies, public.connection_audit from anon;
grant select on public.connections, public.org_connection_policies, public.connection_audit to authenticated;

-- Rollback:
--   drop table if exists public.connection_audit, public.org_connection_policies, public.connection_secrets, public.connections;
