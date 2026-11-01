-- Authenticated budgets are bound to auth.uid(), never a client-supplied bucket.
CREATE OR REPLACE FUNCTION public.check_own_rate_limit(p_action text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE cap integer;
BEGIN
 IF auth.uid() IS NULL THEN RETURN false; END IF;
 cap := CASE WHEN p_action='ai' THEN 40 WHEN p_action IN ('file-read','file-export','package-export','conn-act','ai-act') THEN 20 ELSE 0 END;
 IF cap=0 THEN RETURN false; END IF;
 RETURN public.check_rate_limit(auth.uid()::text,p_action,cap,600);
END $$;
REVOKE ALL ON FUNCTION public.check_own_rate_limit(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.check_own_rate_limit(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.kaju_action_receipts (
 actor_id uuid NOT NULL REFERENCES auth.users(id), request_id text NOT NULL,
 ngo_id uuid NOT NULL REFERENCES public.ngos(id), kind text NOT NULL,
 payload_hash bytea NOT NULL, record_id uuid NOT NULL, record_table text NOT NULL,
 audit_id bigint NOT NULL REFERENCES public.operational_audit_log(id),
 confirmed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(actor_id,request_id)
);
ALTER TABLE public.kaju_action_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kaju_action_receipts FROM anon,authenticated;
GRANT SELECT ON public.kaju_action_receipts TO authenticated;
CREATE POLICY kaju_receipt_read ON public.kaju_action_receipts FOR SELECT TO authenticated USING(actor_id=(SELECT auth.uid()) AND ngo_id=public.my_ngo());

-- A confirmed action and its audit/receipt commit together. Replaying the same
-- request returns the same receipt; changed payloads cannot reuse a request ID.
CREATE OR REPLACE FUNCTION public.kaju_confirm_action(p_request text,p_kind text,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE uid uuid:=auth.uid(); org uuid:=public.my_ngo(); old public.kaju_action_receipts;
 h bytea; rid uuid; aid bigint; tab text; who text; mark text; txt text; cid uuid;
BEGIN
 IF uid IS NULL OR org IS NULL THEN RAISE EXCEPTION 'Organisation access required' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_request !~ '^[a-zA-Z0-9_-]{6,80}$' OR p_kind NOT IN ('open_case','add_note','schedule_followup','record_care') OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object' OR octet_length(p_payload::text)>12000 THEN RAISE EXCEPTION 'Invalid confirmed action'; END IF;
 h:=sha256(convert_to(p_kind||p_payload::text,'UTF8'));
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||p_request,1));
 SELECT * INTO old FROM public.kaju_action_receipts WHERE actor_id=uid AND request_id=p_request;
 IF FOUND THEN
  IF old.payload_hash<>h OR old.ngo_id<>org THEN RAISE EXCEPTION 'Request ID already used for different work'; END IF;
  RETURN jsonb_build_object('record_id',old.record_id,'record_table',old.record_table,'audit_id',old.audit_id,'replayed',true);
 END IF;
 SELECT coalesce(nullif(name,''),'Team member') INTO who FROM public.volunteers WHERE id=uid;
 who:=coalesce(who,'Team member');
 mark:='Prepared with StrayPaw AI, confirmed by '||who||'. Kaju request '||p_request||'.';
 IF p_kind='open_case' THEN
  IF nullif(btrim(p_payload->>'title'),'') IS NULL OR length(p_payload->>'title')>120 OR nullif(btrim(p_payload->>'city'),'') IS NULL THEN RAISE EXCEPTION 'A case needs a title and city'; END IF;
  rid:=public.create_case_with_location(p_city=>left(p_payload->>'city',60),p_title=>p_payload->>'title',p_description=>left(coalesce(p_payload->>'description',''),1500)||E'\n\n'||mark,p_dog_id=>nullif(p_payload->>'dogId','')::uuid,p_zone=>left(p_payload->>'zone',80),p_severity=>coalesce(p_payload->>'severity','normal')::public.case_severity,p_category=>coalesce(p_payload->>'category','other')::public.case_category,p_actor_id=>uid,p_actor_name=>who,p_species=>'dog');
  tab:='cases';
 ELSIF p_kind='add_note' THEN
  cid:=(p_payload->>'caseId')::uuid; txt:=btrim(p_payload->>'note');
  IF txt IS NULL OR txt='' OR length(txt)>1500 THEN RAISE EXCEPTION 'A note needs text (up to 1500 characters)'; END IF;
  txt:=txt||E'\n\n'||mark;
  PERFORM public.add_case_note(cid,uid,who,txt);
  SELECT id INTO rid FROM public.case_updates WHERE case_id=cid AND note=txt ORDER BY created_at DESC LIMIT 1;
  tab:='case_updates';
 ELSIF p_kind='schedule_followup' THEN
  cid:=(p_payload->>'caseId')::uuid;
  IF (p_payload->>'dueAt')::timestamptz < current_date THEN RAISE EXCEPTION 'Choose today or a later date'; END IF;
  rid:=public.add_case_followup(p_case_id=>cid,p_dog_id=>nullif(p_payload->>'dogId','')::uuid,p_due_at=>(p_payload->>'dueAt')::date,p_note=>left(coalesce(p_payload->>'note',''),500)||E'\n'||mark);
  tab:='animal_followups';
 ELSE
  rid:=public.add_medical_event((p_payload->>'dogId')::uuid,null,p_payload->>'careKind',nullif(p_payload->>'date','')::date,left(coalesce(p_payload->>'notes',''),800)||E'\n'||mark,who);
  tab:='medical_events';
 END IF;
 IF rid IS NULL THEN RAISE EXCEPTION 'The action did not produce a record'; END IF;
 SELECT id INTO aid FROM public.operational_audit_log WHERE actor_id=uid AND entity_id=rid AND entity_type=tab AND action='ai_assisted_insert' ORDER BY created_at DESC LIMIT 1;
 IF aid IS NULL THEN RAISE EXCEPTION 'The audit could not be verified; the action was not committed'; END IF;
 INSERT INTO public.kaju_action_receipts(actor_id,request_id,ngo_id,kind,payload_hash,record_id,record_table,audit_id) VALUES(uid,p_request,org,p_kind,h,rid,tab,aid);
 RETURN jsonb_build_object('record_id',rid,'record_table',tab,'audit_id',aid,'replayed',false);
END $$;
REVOKE ALL ON FUNCTION public.kaju_confirm_action(text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.kaju_confirm_action(text,text,jsonb) TO authenticated;
