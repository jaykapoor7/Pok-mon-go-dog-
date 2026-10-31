-- Rollback for supabase/proposed/2026-10-31-release.sql (production).
-- The release only ADDS objects, so rollback is dropping exactly those.
-- No pre-existing table, row, function, policy or trigger is touched.
-- To be tested on staging inside a transaction that is then rolled back
-- (every object below should disappear; nothing else should change).
begin;
drop trigger if exists zz_sp_audit_write on public.cases;
drop trigger if exists zz_sp_audit_write on public.case_updates;
drop trigger if exists zz_sp_audit_write on public.animal_followups;
drop trigger if exists zz_sp_audit_write on public.medical_events;
drop trigger if exists cases_operator_provenance on public.cases;
drop function if exists public.sp_audit_write();
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
comment on column public.ngo_members.role is null;
commit;
