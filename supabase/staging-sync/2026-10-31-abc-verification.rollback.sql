-- Rollback for 2026-10-31-abc-verification.sql (and the staging provenance
-- schema). Everything that migration adds is new, so rolling back is dropping
-- it. Nothing below touches cases, animals, evidence or history rows that
-- existed before; the optional restore block brings back the exact pre-change
-- rows from the private sp_backup schema taken on 2026-10-31 (staging only).
begin;
drop trigger if exists cases_operator_provenance on public.cases;
drop function if exists public.sp_case_operator_provenance();
drop function if exists public.abc_my_context();
drop function if exists public.abc_case_history(uuid);
drop function if exists public.abc_revoke_attestation(uuid, text);
drop function if exists public.abc_return_evidence(uuid, text);
drop function if exists public.abc_package_cases(uuid);
drop function if exists public.abc_package_act(uuid, text, text);
drop function if exists public.abc_create_package(text, date, date, uuid);
drop function if exists public.abc_review_evidence(uuid, text);
drop function if exists public.abc_vet_authorise(uuid, text);
drop function if exists public.abc_add_evidence(uuid, text, text, text, text);
drop function if exists public.abc_verification_queue(int);
drop function if exists public.abc_case_checklist(uuid);
drop function if exists public.sp_actor_name();
drop function if exists public.sp_member_role(uuid);
drop table if exists public.package_events;
drop table if exists public.report_packages;
drop table if exists public.abc_attestations;
drop table if exists public.review_office_members;
drop table if exists public.review_offices;
-- org_followup_scope_counts: staging did not have it before; drop to return
-- to the exact earlier state (production keeps its own copy).
drop function if exists public.org_followup_scope_counts();
commit;

-- Optional, staging only: restore rows exactly as they were (evidence and
-- history written by the workflow are removed with them).
-- begin;
-- delete from public.evidence_items where id not in (select id from sp_backup.evidence_items_20261031);
-- delete from public.case_updates where id not in (select id from sp_backup.case_updates_20261031);
-- update public.cases c set provenance = b.provenance, verification_state = b.verification_state from sp_backup.cases_20261031 b where b.id = c.id;
-- commit;
