CREATE TABLE public.kaju_check_settings (
 ngo_id uuid PRIMARY KEY REFERENCES public.ngos(id), report_due_on date,
 updated_by uuid NOT NULL REFERENCES auth.users(id), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.kaju_check_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ngo_id uuid NOT NULL REFERENCES public.ngos(id),
 checked_at timestamptz NOT NULL DEFAULT now(), rules_version text NOT NULL DEFAULT '2026-11-01-v1',
 findings jsonb NOT NULL, actor_id uuid REFERENCES auth.users(id)
);
CREATE INDEX kaju_checks_org_time ON public.kaju_check_runs(ngo_id,checked_at DESC);
ALTER TABLE public.kaju_check_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kaju_check_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kaju_check_settings,public.kaju_check_runs FROM anon,authenticated;
GRANT SELECT ON public.kaju_check_settings,public.kaju_check_runs TO authenticated;
GRANT ALL ON public.kaju_check_settings,public.kaju_check_runs TO service_role;
CREATE POLICY kaju_settings_read ON public.kaju_check_settings FOR SELECT TO authenticated USING(ngo_id=public.my_ngo());
CREATE POLICY kaju_runs_read ON public.kaju_check_runs FOR SELECT TO authenticated USING(ngo_id=public.my_ngo());
CREATE OR REPLACE FUNCTION public.kaju_set_report_deadline(p_due date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE org uuid:=public.my_ngo();
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.ngo_members WHERE user_id=auth.uid() AND ngo_id=org AND role='admin') THEN RAISE EXCEPTION 'Only an organisation lead can set its reporting deadline' USING ERRCODE='42501'; END IF;
 INSERT INTO public.kaju_check_settings(ngo_id,report_due_on,updated_by) VALUES(org,p_due,auth.uid()) ON CONFLICT(ngo_id) DO UPDATE SET report_due_on=excluded.report_due_on,updated_by=excluded.updated_by,updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.kaju_set_report_deadline(date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.kaju_set_report_deadline(date) TO authenticated;

CREATE OR REPLACE FUNCTION public.kaju_refresh_checks(p_ngo uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE org uuid; items jsonb:='[]'; rows jsonb; runid uuid; deadline date; role_claim text:=auth.jwt()->>'role';
BEGIN
 IF role_claim='service_role' THEN org:=p_ngo;
 ELSE
  org:=public.my_ngo();
  IF auth.uid() IS NULL OR org IS NULL OR (p_ngo IS NOT NULL AND p_ngo<>org) THEN RAISE EXCEPTION 'Organisation access required' USING ERRCODE='42501'; END IF;
  IF NOT public.check_rate_limit(auth.uid()::text,'kaju-check',10,600) THEN RAISE EXCEPTION 'Checks are temporarily limited'; END IF;
 END IF;
 IF org IS NULL OR NOT EXISTS(SELECT 1 FROM public.ngos WHERE id=org) THEN RAISE EXCEPTION 'Choose an organisation'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(org::text,2));
 SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]') INTO rows FROM (
  SELECT f.id,c.id AS case_id,coalesce(c.case_code,c.title,'Case') AS label,f.due_at,'/ngo/cases/'||c.id AS href
  FROM public.animal_followups f JOIN public.cases c ON c.id=f.case_id AND c.ngo_id=org
  WHERE f.ngo_id=org AND f.status='upcoming' AND f.due_at<current_date AND c.status_class IN ('open','in_progress')
   AND coalesce(c.provenance,'') NOT IN ('imported_historical_record','public_dataset')
  ORDER BY f.due_at LIMIT 100
 ) s;
 items:=items||jsonb_build_array(jsonb_build_object('rule','overdue_followup','explanation','Upcoming follow-ups dated before today on current open cases.','sample_limit',100,'count',jsonb_array_length(rows),'records',rows));
 SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]') INTO rows FROM (
  SELECT c.id,coalesce(c.case_code,c.title,'Case') AS label,'/ngo/verification/'||c.id AS href,
   ARRAY(SELECT k FROM unnest(ARRAY['capture_photo','surgery_record','ear_notch_photo','release_photo','release_location']) k WHERE NOT EXISTS(SELECT 1 FROM public.evidence_items e WHERE e.case_id=c.id AND e.kind=k)) AS missing
  FROM public.cases c WHERE c.ngo_id=org AND c.category='sterilisation' AND coalesce(c.provenance,'') NOT IN ('imported_historical_record','public_dataset')
   AND (SELECT count(DISTINCT kind) FROM public.evidence_items e WHERE e.case_id=c.id AND kind IN ('capture_photo','surgery_record','ear_notch_photo','release_photo','release_location'))<5
  ORDER BY c.created_at DESC LIMIT 100
 ) s;
 items:=items||jsonb_build_array(jsonb_build_object('rule','missing_evidence','explanation','ABC records missing one or more of the five required evidence kinds. File presence is not content verification.','sample_limit',100,'count',jsonb_array_length(rows),'records',rows));
 SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]') INTO rows FROM (
  SELECT c.id,coalesce(c.case_code,c.title,'Case') AS label,'/ngo/verification/'||c.id AS href
  FROM public.cases c WHERE c.ngo_id=org AND c.category='sterilisation' AND coalesce(c.provenance,'') NOT IN ('imported_historical_record','public_dataset')
   AND EXISTS(SELECT 1 FROM public.evidence_items e WHERE e.case_id=c.id AND e.kind='surgery_record')
   AND NOT EXISTS(SELECT 1 FROM public.abc_attestations a WHERE a.case_id=c.id AND a.kind='vet_authorised' AND a.revoked_at IS NULL)
  ORDER BY c.created_at DESC LIMIT 100
 ) s;
 items:=items||jsonb_build_array(jsonb_build_object('rule','awaiting_vet','explanation','A surgery record is attached but no current veterinary authorisation is recorded. Only a veterinarian can authorise.','sample_limit',100,'count',jsonb_array_length(rows),'records',rows));
 SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]') INTO rows FROM (
  SELECT p.id,p.title AS label,'/ngo/packages/'||p.id AS href FROM public.report_packages p WHERE p.ngo_id=org AND p.status='queried' ORDER BY p.created_at LIMIT 100
 ) s;
 items:=items||jsonb_build_array(jsonb_build_object('rule','open_clarification','explanation','Submitted packages with an unanswered municipal query.','sample_limit',100,'count',jsonb_array_length(rows),'records',rows));
 SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]') INTO rows FROM (
  SELECT c.id,c.name AS label,'/ngo/programmes/'||c.id AS href FROM public.campaigns c WHERE c.ngo_id=org AND c.archived_at IS NULL AND c.created_at<now()-interval '7 days' AND (c.ends_on IS NULL OR c.ends_on>=current_date)
   AND NOT EXISTS(SELECT 1 FROM public.dogs d WHERE d.campaign_id=c.id AND d.last_seen>=now()-interval '7 days')
  ORDER BY c.created_at LIMIT 100
 ) s;
 items:=items||jsonb_build_array(jsonb_build_object('rule','programme_activity','explanation','Active programmes older than seven days with no linked animal observation recorded in the last seven days. This is a record gap, not proof of no fieldwork.','sample_limit',100,'count',jsonb_array_length(rows),'records',rows));
 SELECT report_due_on INTO deadline FROM public.kaju_check_settings WHERE ngo_id=org;
 items:=items||jsonb_build_array(jsonb_build_object('rule','reporting_deadline','explanation','The organisation lead supplied this deadline. No deadline is inferred when it has not been set.','configured',deadline IS NOT NULL,'due_on',deadline,'count',CASE WHEN deadline<=current_date+7 THEN 1 ELSE 0 END,'records',jsonb_build_array()));
 INSERT INTO public.kaju_check_runs(ngo_id,findings,actor_id) VALUES(org,items,auth.uid()) RETURNING id INTO runid;
 RETURN jsonb_build_object('id',runid,'checked_at',now(),'rules_version','2026-11-01-v1','findings',items,'note','Counts are bounded samples, at most 100 per rule. No case, procedure or external account was changed.');
END $$;
REVOKE ALL ON FUNCTION public.kaju_refresh_checks(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.kaju_refresh_checks(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.kaju_due_checks(p_limit integer DEFAULT 10)
RETURNS TABLE(ngo_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT n.id FROM public.ngos n
 LEFT JOIN LATERAL(SELECT max(r.checked_at) AS checked FROM public.kaju_check_runs r WHERE r.ngo_id=n.id) last ON true
 WHERE NOT n.demo_mode AND EXISTS(SELECT 1 FROM public.ngo_members m WHERE m.ngo_id=n.id)
  AND (last.checked IS NULL OR last.checked<now()-interval '23 hours')
 ORDER BY last.checked NULLS FIRST,n.id LIMIT greatest(1,least(p_limit,20));
$$;
REVOKE ALL ON FUNCTION public.kaju_due_checks(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kaju_due_checks(integer) TO service_role;
