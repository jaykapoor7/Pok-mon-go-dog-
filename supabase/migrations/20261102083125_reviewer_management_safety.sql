-- A moderation secret is checked by the server before these service-only RPCs.
-- Office access and its audit entry commit together; no officials are seeded.
CREATE UNIQUE INDEX IF NOT EXISTS review_office_request_id_unique
 ON public.operational_audit_log ((after_data->>'request_id'))
 WHERE entity_type='review_office' AND after_data ? 'request_id';

CREATE OR REPLACE FUNCTION public.admin_review_office_act(
 p_request uuid,p_action text,p_confirmed boolean DEFAULT false,
 p_office uuid DEFAULT NULL,p_name text DEFAULT NULL,p_city text DEFAULT NULL,
 p_email text DEFAULT NULL,p_user uuid DEFAULT NULL,p_authorised boolean DEFAULT false,
 p_expected_name text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
DECLARE v_office public.review_offices%ROWTYPE;v_user uuid;v_audit bigint;v_before jsonb;
 v_saved public.operational_audit_log%ROWTYPE;v_name text:=btrim(p_name);
 v_city text:=nullif(btrim(p_city),'');v_email text:=lower(btrim(p_email));
 v_payload jsonb;v_hash text;v_event text;
BEGIN
 IF NOT coalesce(p_confirmed,false) THEN RAISE EXCEPTION 'Confirm the change first' USING ERRCODE='22023';END IF;
 IF p_request IS NULL OR p_action IS NULL OR p_action NOT IN ('create','rename','addReviewer','removeReviewer') THEN RAISE EXCEPTION 'Invalid office action' USING ERRCODE='22023';END IF;
 IF p_action='addReviewer' AND NOT coalesce(p_authorised,false) THEN RAISE EXCEPTION 'Confirm this person is authorised to review for the office' USING ERRCODE='22023';END IF;
 IF length(coalesce(v_name,''))>160 OR length(coalesce(v_city,''))>80 OR length(coalesce(v_email,''))>254 THEN RAISE EXCEPTION 'An office field is too long' USING ERRCODE='22023';END IF;
 v_payload:=jsonb_build_object('action',p_action,'office',p_office,'name',v_name,'city',v_city,'email',v_email,'user',p_user,'authorised',p_authorised,'expected_name',p_expected_name);
 v_hash:=md5(v_payload::text);
 PERFORM pg_advisory_xact_lock(hashtextextended('review-request:'||p_request::text,0));
 SELECT * INTO v_saved FROM public.operational_audit_log WHERE entity_type='review_office' AND after_data->>'request_id'=p_request::text;
 IF FOUND THEN
  IF v_saved.after_data->>'payload_hash' IS DISTINCT FROM v_hash THEN RAISE EXCEPTION 'This request was already used for another change' USING ERRCODE='22023';END IF;
  RETURN jsonb_build_object('office_id',v_saved.entity_id,'audit_id',v_saved.id,'user_id',v_saved.after_data->>'user_id','action',p_action,'replayed',true);
 END IF;
 IF p_action IN ('create','rename') AND length(coalesce(v_name,''))<3 THEN RAISE EXCEPTION 'Give the office its full name' USING ERRCODE='22023';END IF;
 IF p_action='create' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('review-office:'||lower(v_name)||coalesce(lower(v_city),''),0));
  IF EXISTS(SELECT 1 FROM public.review_offices WHERE lower(name)=lower(v_name) AND coalesce(lower(city),'')=coalesce(lower(v_city),'')) THEN RAISE EXCEPTION 'That reviewing office already exists' USING ERRCODE='23505';END IF;
  INSERT INTO public.review_offices(name,city) VALUES(v_name,v_city) RETURNING * INTO v_office;
  v_event:='review_office_created';
 ELSE
  SELECT * INTO v_office FROM public.review_offices WHERE id=p_office FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'That office no longer exists' USING ERRCODE='P0002';END IF;
  v_before:=jsonb_build_object('name',v_office.name,'city',v_office.city);
  IF p_action='rename' THEN
   IF p_expected_name IS DISTINCT FROM v_office.name THEN RAISE EXCEPTION 'The office changed. Read it again before saving' USING ERRCODE='40001';END IF;
   UPDATE public.review_offices SET name=v_name,city=v_city WHERE id=p_office RETURNING * INTO v_office;
   v_event:='review_office_renamed';
  ELSIF p_action='addReviewer' THEN
   SELECT id INTO v_user FROM auth.users WHERE lower(email)=v_email AND email_confirmed_at IS NOT NULL AND deleted_at IS NULL AND (banned_until IS NULL OR banned_until<now());
   IF v_user IS NULL THEN RAISE EXCEPTION 'No verified StrayPaw account uses that email. Ask them to sign in once first' USING ERRCODE='P0002';END IF;
   INSERT INTO public.review_office_members(office_id,user_id) VALUES(p_office,v_user);
   v_event:='reviewer_added';
  ELSE
   v_user:=p_user;
   DELETE FROM public.review_office_members WHERE office_id=p_office AND user_id=p_user;
   IF NOT FOUND THEN RAISE EXCEPTION 'They were not a reviewer here' USING ERRCODE='P0002';END IF;
   v_event:='reviewer_removed';
  END IF;
 END IF;
 INSERT INTO public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,before_data,after_data)
 VALUES(NULL,NULL,'review_office',v_office.id,v_event,v_before,jsonb_build_object(
  'request_id',p_request,'payload_hash',v_hash,'name',v_office.name,'city',v_office.city,
  'user_id',v_user,'authorisation_confirmed',p_action='addReviewer' AND p_authorised,
  'by','StrayPaw moderation console')) RETURNING id INTO v_audit;
 RETURN jsonb_build_object('office_id',v_office.id,'audit_id',v_audit,'user_id',v_user,'action',p_action,'replayed',false);
END $$;
REVOKE ALL ON FUNCTION public.admin_review_office_act(uuid,text,boolean,uuid,text,text,text,uuid,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_office_act(uuid,text,boolean,uuid,text,text,text,uuid,boolean,text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_review_offices(p_limit integer DEFAULT 100)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT jsonb_build_object('offices',coalesce(jsonb_agg(item ORDER BY name,id),'[]'::jsonb),
  'truncated',(SELECT count(*) FROM public.review_offices)>greatest(1,least(coalesce(p_limit,100),200)))
 FROM (
  SELECT o.name,o.id,jsonb_build_object('id',o.id,'name',o.name,'city',o.city,'created_at',o.created_at,
   'packages',(SELECT count(*) FROM public.report_packages p WHERE p.office_id=o.id AND p.status<>'draft'),
   'reviewer_count',(SELECT count(*) FROM public.review_office_members m WHERE m.office_id=o.id),
   'reviewers',coalesce((SELECT jsonb_agg(person ORDER BY added_at,user_id) FROM (
    SELECT m.user_id,m.created_at AS added_at,jsonb_build_object('user_id',m.user_id,'added_at',m.created_at,
     'email',u.email,'name',coalesce(u.raw_user_meta_data->>'display_name',u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name')) AS person
    FROM public.review_office_members m JOIN auth.users u ON u.id=m.user_id WHERE m.office_id=o.id ORDER BY m.created_at,m.user_id LIMIT 100
   ) people),'[]'::jsonb)) AS item
  FROM public.review_offices o ORDER BY o.name,o.id LIMIT greatest(1,least(coalesce(p_limit,100),200))
 ) offices;
$$;
REVOKE ALL ON FUNCTION public.admin_review_offices(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_offices(integer) TO service_role;
