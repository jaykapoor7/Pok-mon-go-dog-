-- ════════════════════════════════════════════════════════════════
-- StrayPaw — "reached out / acknowledged" flag on Help-form sign-ups.
--
-- Run ONCE in the Supabase SQL editor (idempotent). Lets the moderation panel
-- tick a volunteer/NGO once you've contacted them, without removing the row.
-- Toggled via the service role from /api/admin/helpers (no public access).
-- ════════════════════════════════════════════════════════════════

alter table helpers add column if not exists acknowledged    boolean not null default false;
alter table helpers add column if not exists acknowledged_at timestamptz;
