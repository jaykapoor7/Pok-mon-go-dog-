-- Kaju Connections: Slack and Zoho as providers; 'sms' as an organisation policy (2026-11-01).
-- Applied to staging and production. Widens two CHECK constraints only.
alter table public.connections drop constraint if exists connections_provider_check;
alter table public.connections add constraint connections_provider_check check (provider in ('google', 'microsoft', 'slack', 'zoho'));
alter table public.org_connection_policies drop constraint if exists org_connection_policies_provider_check;
alter table public.org_connection_policies add constraint org_connection_policies_provider_check check (provider in ('google', 'microsoft', 'slack', 'zoho', 'sms'));
