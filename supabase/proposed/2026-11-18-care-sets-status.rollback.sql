-- Rollback for 2026-11-18-care-sets-status.sql: stops care events setting the status. Statuses already set stay, since
-- each is backed by a recorded sterilisation or vaccination event.
drop trigger if exists medical_events_set_dog_status on public.medical_events;
drop function if exists public.care_sets_dog_status();
