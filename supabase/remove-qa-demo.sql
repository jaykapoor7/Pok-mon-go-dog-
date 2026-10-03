-- ════════════════════════════════════════════════════════════════════
-- One-off: remove the QA demo rows (is_demo = true) from the live record.
--
-- Copies of every row below were written to operational_audit_log with
-- action 'delete_demo' before this was prepared, so each can be restored
-- by hand. Only rows flagged is_demo are touched; a demo dog is removed
-- only when no real case or sighting points at it. At preparation time:
-- 5 cases, 4 case updates, 1 care entry, 3 dogs.
-- ════════════════════════════════════════════════════════════════════
begin;
delete from medical_events where is_demo;
delete from case_updates where is_demo;
delete from cases where is_demo;
delete from dogs d
 where d.is_demo
   and not exists (select 1 from cases c where c.dog_id = d.id)
   and not exists (select 1 from sightings s where s.dog_id = d.id);
commit;
