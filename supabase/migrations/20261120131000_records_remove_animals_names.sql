-- Deleting records, the default animal colour, and people's names on records (November 2026).
--
-- 1. A case opened from a field intake could not be deleted: its intake field record depends on it, the screen offers
--    no way to delete that record, and the refusal ("Other records still depend on this one") did not say which.
--    Deleting a case now takes its intake record with it (kept in removed_records and restored with it), as long as
--    nobody has reviewed or corrected that record and it holds no care record. Any other refusal names what is in the
--    way, for example "1 vaccination record, 2 WhatsApp reports".
-- 2. An animal record could not be deleted at all. remove_record('animal', …) now deletes one that holds nothing
--    else: no case, care, vaccination, sterilisation, field, laboratory or adoption record, follow-up, request,
--    appointment, evidence, document or WhatsApp report. Its timeline and identifiers go with it and come back when
--    it is restored. Who may: a coordinator or admin, or the person who registered it, within 24 hours.
--    The 24-hour rule also reads created_by_id now, the column cases and dogs actually use for their author.
-- 3. dogs.color defaulted to 'Brown', so every animal registered without a colour was recorded as brown. New
--    animals have no colour until someone records one. Existing rows are left as they are: a real brown and a
--    defaulted one cannot be told apart.
-- 4. Some records name people by their sign-in email or its first part ("demo-oh-ngo@…", "demo-oh-ngo"), written by
--    older versions of the app. Where a name column holds exactly that person's own email or email prefix, and their
--    account has a name, the name replaces it. Nothing else is changed.
--
-- 5. Who may delete: the rule is "a coordinator or admin, or the person who added it within 24 hours". When a record had
--    no author on it the check came out NULL instead of false, and NULL let the delete through, so any member could
--    delete such a record (every case, since cases keep their author in created_by_id). It is false now.
--
-- Not applied automatically. Safe to re-run.

alter table public.removed_records drop constraint if exists removed_records_kind_check;
alter table public.removed_records add constraint removed_records_kind_check
  check (kind in ('case', 'update', 'timeline', 'care', 'followup', 'evidence', 'animal'));

create or replace function operations_private.removable_table(p_kind text)
returns text language sql immutable set search_path = pg_catalog as $$
  select case p_kind
    when 'case' then 'cases' when 'update' then 'case_updates' when 'timeline' then 'animal_timeline_events'
    when 'care' then 'medical_events' when 'followup' then 'animal_followups' when 'evidence' then 'evidence_items'
    when 'animal' then 'dogs' end
$$;
revoke all on function operations_private.removable_table(text) from public, anon, authenticated;

/* Counts the rows that point at p_id, for each [table, column, label] in p_refs whose table exists, and says them
   in one line: "1 case, 2 vaccination records". Empty when nothing points at it. */
create or replace function operations_private.dependents(p_refs jsonb, p_id uuid, p_skip text[] default '{}')
returns text language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare r jsonb; n bigint; parts text[] := '{}';
begin
  for r in select * from jsonb_array_elements(p_refs) loop
    if to_regclass(r->>0) is null then continue; end if;
    if not exists (select 1 from pg_attribute where attrelid = to_regclass(r->>0) and attname = r->>1 and not attisdropped) then continue; end if;
    execute format('select count(*) from %s t where t.%I = $1 and not (coalesce(to_jsonb(t)->>''id'', '''') = any ($2))', to_regclass(r->>0), r->>1)
      into n using p_id, coalesce(p_skip, '{}');
    if n > 0 then parts := parts || (n || ' ' || (r->>2) || case when n = 1 then '' else 's' end); end if;
  end loop;
  return array_to_string(parts, ', ');
end $$;
drop function if exists operations_private.dependents(jsonb, uuid);
revoke all on function operations_private.dependents(jsonb, uuid, text[]) from public, anon, authenticated;

/* Every row that blocks deleting a row of p_table (foreign keys that neither cascade nor clear), in one line. */
create or replace function operations_private.blockers(p_table regclass, p_id uuid, p_skip text[] default '{}')
returns text language sql stable security definer set search_path = pg_catalog, public as $$
  select operations_private.dependents(coalesce(jsonb_agg(jsonb_build_array(c.conrelid::regclass::text, a.attname,
    case c.conrelid::regclass::text
      when 'animal_operation_events' then 'field record' when 'careos.inbox' then 'WhatsApp report'
      when 'operations_item_decisions' then 'municipal decision' when 'operations_package_claims' then 'report package claim'
      when 'operations_package_snapshots' then 'report package entry' when 'abc_attestations' then 'veterinary sign-off'
      when 'animalid_decisions' then 'photo-match decision' when 'animal_operation_reviews' then 'review'
      else replace(c.conrelid::regclass::text, '_', ' ') || ' row' end)), '[]'::jsonb), p_id, p_skip)
  from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
  where c.contype = 'f' and c.confrelid = p_table and c.confdeltype in ('a', 'r')
$$;
drop function if exists operations_private.blockers(regclass, uuid);
revoke all on function operations_private.blockers(regclass, uuid, text[]) from public, anon, authenticated;

create or replace function public.remove_record(p_kind text, p_id uuid, p_reason text default null)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare
  uid uuid := auth.uid(); org uuid := public.my_ngo(); tbl text := operations_private.removable_table(p_kind);
  v jsonb; owner_ngo uuid; lead boolean; author uuid; made timestamptz; case_ref uuid; data jsonb; rid uuid; held text; intake jsonb;
begin
  if uid is null or org is null then raise exception 'Sign in to your organisation to delete records'; end if;
  if tbl is null or p_id is null then raise exception 'This kind of record cannot be deleted here'; end if;
  if p_reason is not null and length(p_reason) > 500 then raise exception 'Keep the reason under 500 characters'; end if;

  execute format('select to_jsonb(t) from public.%I t where t.id = $1 for update', tbl) into v using p_id;
  if v is null then raise exception 'That record no longer exists'; end if;

  case_ref := case when p_kind = 'case' then p_id when p_kind = 'animal' then null else nullif(v->>'case_id', '')::uuid end;
  owner_ngo := coalesce(nullif(v->>'ngo_id', '')::uuid,
    (select c.ngo_id from public.cases c where c.id = case_ref),
    (select d.ngo_id from public.dogs d where d.id = nullif(v->>'dog_id', '')::uuid));
  if owner_ngo is distinct from org then raise exception 'That record belongs to another organisation'; end if;

  lead := coalesce(public.sp_member_role(org), '') in ('admin', 'coordinator');
  /* cases and dogs name their author in created_by_id; the earlier version read only created_by and actor_id, so
     nobody but a lead could delete a case they had just opened. */
  author := coalesce(nullif(v->>'created_by', ''), nullif(v->>'created_by_id', ''), nullif(v->>'actor_id', ''))::uuid;
  made := (v->>'created_at')::timestamptz;
  if p_kind = 'animal' and author is null then
    /* An animal registered by a field intake: the person who recorded the intake. */
    select e.actor_id into author from public.animal_operation_events e
     where e.dog_id = p_id and e.kind = 'intake' order by e.created_at limit 1;
  end if;
  /* coalesce: with no author recorded the comparison is NULL, and "not NULL" let any member delete it. */
  if not lead and not coalesce(author = uid and made > now() - interval '24 hours', false) then
    raise exception 'Only a coordinator or admin can delete this. You can delete what you added in the last 24 hours';
  end if;

  if case_ref is not null and exists (select 1 from public.report_packages q where case_ref = any (q.case_ids) and q.status <> 'returned') then
    raise exception 'This record is part of a report package. Return or remove the package first';
  end if;
  if p_kind = 'case' and exists (select 1 from public.abc_attestations a where a.case_id = p_id and a.revoked_at is null) then
    raise exception 'A veterinarian has signed this case. Ask them to revoke the sign-off first';
  end if;
  if p_kind = 'evidence' and exists (select 1 from public.evidence_reviews r where r.evidence_id = p_id) then
    raise exception 'This evidence has been reviewed and stays on the record';
  end if;
  if p_kind = 'animal' then
    /* Deleting an animal would take its medical history with it (those tables cascade), so anything that is a record
       in its own right has to go first, and the refusal says what. */
    held := operations_private.dependents(jsonb_build_array(
      jsonb_build_array('public.cases', 'dog_id', 'case'), jsonb_build_array('public.vaccinations', 'dog_id', 'vaccination record'),
      jsonb_build_array('public.sterilisations', 'dog_id', 'sterilisation record'), jsonb_build_array('public.medical_events', 'dog_id', 'care record'),
      jsonb_build_array('public.animal_operation_events', 'dog_id', 'field record'), jsonb_build_array('public.animal_followups', 'dog_id', 'follow-up'),
      jsonb_build_array('public.oh_samples', 'animal_id', 'laboratory sample'), jsonb_build_array('public.oh_handoffs', 'animal_id', 'request'),
      jsonb_build_array('public.adoption_listings', 'dog_id', 'adoption listing'), jsonb_build_array('public.nx_appointments', 'dog_id', 'appointment'),
      jsonb_build_array('public.nx_vet_patients', 'dog_id', 'clinic patient record'), jsonb_build_array('public.evidence_items', 'dog_id', 'evidence file'),
      jsonb_build_array('public.documents', 'dog_id', 'document'), jsonb_build_array('careos.inbox', 'linked_dog_id', 'WhatsApp report'),
      jsonb_build_array('public.animalid_decisions', 'dog_id', 'photo-match decision')), p_id);
    if held <> '' then raise exception 'This animal still has %. Delete those first, or keep the animal', held; end if;
  end if;

  data := jsonb_build_object('row', v);
  if p_kind = 'case' then
    /* The intake field record that opened this case goes with it, unless someone reviewed or corrected it or it
       holds a care record. */
    select coalesce(jsonb_agg(to_jsonb(e)), '[]'::jsonb) into intake from public.animal_operation_events e
     where e.case_id = p_id and e.kind = 'intake' and e.medical_event_id is null
       and not exists (select 1 from public.animal_operation_reviews r where r.event_id = e.id)
       and not exists (select 1 from public.animal_operation_events x where x.corrects_id = e.id);
    data := data || jsonb_build_object(
      'followups', coalesce((select jsonb_agg(to_jsonb(f)) from public.animal_followups f where f.case_id = p_id), '[]'::jsonb),
      'updates', coalesce((select jsonb_agg(to_jsonb(u)) from public.case_updates u where u.case_id = p_id), '[]'::jsonb),
      'events', intake);
  elsif p_kind = 'animal' then
    data := data || jsonb_build_object('timeline', coalesce((select jsonb_agg(to_jsonb(t)) from public.animal_timeline_events t where t.dog_id = p_id), '[]'::jsonb), 'identifiers', '[]'::jsonb);
    if to_regclass('public.animal_identifiers') is not null then
      execute 'select coalesce(jsonb_agg(to_jsonb(i)), ''[]''::jsonb) from public.animal_identifiers i where i.dog_id = $1' into intake using p_id;
      data := jsonb_set(data, '{identifiers}', intake);
    end if;
  end if;

  insert into public.removed_records (ngo_id, kind, record_id, data, reason, removed_by)
  values (org, p_kind, p_id, data, nullif(btrim(p_reason), ''), uid) returning id into rid;
  begin
    if p_kind = 'case' then
      delete from public.animal_operation_events where id in (select (x->>'id')::uuid from jsonb_array_elements(data->'events') x);
    end if;
    execute format('delete from public.%I where id = $1', tbl) using p_id;
  exception when foreign_key_violation then
    held := operations_private.blockers(format('public.%I', tbl)::regclass, p_id,
      coalesce((select array_agg(x->>'id') from jsonb_array_elements(coalesce(data->'events', '[]'::jsonb)) x), '{}'));
    raise exception 'Other records still depend on this one, so it stays%. Delete those first',
      case when coalesce(held, '') <> '' then ': ' || held else '' end;
  end;
  insert into public.operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, before_data, after_data)
  values (org, uid, tbl, p_id, 'remove_record', v, jsonb_build_object('removed_record', rid, 'reason', nullif(btrim(p_reason), '')));
  return rid;
end $$;

create or replace function public.restore_record(p_removed uuid)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare
  uid uuid := auth.uid(); org uuid := public.my_ngo(); r public.removed_records; tbl text; x jsonb;
begin
  if uid is null or org is null then raise exception 'Sign in to your organisation to restore records'; end if;
  select * into r from public.removed_records where id = p_removed and ngo_id = org for update;
  if not found then raise exception 'That deletion is not in your organisation'; end if;
  if r.restored_at is not null then raise exception 'That record has already been restored'; end if;
  if not (coalesce(public.sp_member_role(org), '') in ('admin', 'coordinator') or (r.removed_by = uid and r.removed_at > now() - interval '1 hour')) then
    raise exception 'Only a coordinator or admin can restore this';
  end if;
  if r.removed_at < now() - interval '30 days' then raise exception 'Deletions can be restored for 30 days'; end if;
  tbl := operations_private.removable_table(r.kind);
  execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)', tbl, tbl) using r.data->'row';
  if r.kind = 'case' then
    for x in select * from jsonb_array_elements(coalesce(r.data->'updates', '[]'::jsonb)) loop
      insert into public.case_updates select * from jsonb_populate_record(null::public.case_updates, x);
    end loop;
    for x in select * from jsonb_array_elements(coalesce(r.data->'followups', '[]'::jsonb)) loop
      insert into public.animal_followups select * from jsonb_populate_record(null::public.animal_followups, x);
    end loop;
    for x in select * from jsonb_array_elements(coalesce(r.data->'events', '[]'::jsonb)) loop
      insert into public.animal_operation_events select * from jsonb_populate_record(null::public.animal_operation_events, x);
    end loop;
  elsif r.kind = 'animal' then
    for x in select * from jsonb_array_elements(coalesce(r.data->'timeline', '[]'::jsonb)) loop
      insert into public.animal_timeline_events select * from jsonb_populate_record(null::public.animal_timeline_events, x);
    end loop;
    if to_regclass('public.animal_identifiers') is not null then
      for x in select * from jsonb_array_elements(coalesce(r.data->'identifiers', '[]'::jsonb)) loop
        execute 'insert into public.animal_identifiers select * from jsonb_populate_record(null::public.animal_identifiers, $1)' using x;
      end loop;
    end if;
  end if;
  update public.removed_records set restored_at = now(), restored_by = uid where id = r.id;
  insert into public.operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data)
  values (org, uid, tbl, r.record_id, 'restore_record', jsonb_build_object('removed_record', r.id));
  return r.record_id;
end $$;

revoke all on function public.remove_record(text, uuid, text), public.restore_record(uuid) from public, anon;
grant execute on function public.remove_record(text, uuid, text), public.restore_record(uuid) to authenticated;

/* 3. No colour until someone records one. */
alter table public.dogs alter column color drop default;

/* 4. A person's own email or email prefix, where a record should show their name. */
do $$
declare p record; n bigint;
begin
  for p in
    select a.table_name t, a.column_name id_col, b.column_name name_col
      from information_schema.columns a
      join information_schema.columns b on b.table_schema = a.table_schema and b.table_name = a.table_name and b.column_name = replace(a.column_name, '_id', '_name')
      join information_schema.tables x on x.table_schema = a.table_schema and x.table_name = a.table_name and x.table_type = 'BASE TABLE'
     where a.table_schema = 'public' and a.column_name in ('actor_id', 'assignee_id', 'created_by_id') and a.data_type = 'uuid'
  loop
    execute format($q$
      update public.%1$I t set %3$I = u.nm
        from (select id, email, nullif(btrim(coalesce(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name', raw_user_meta_data->>'name')), '') nm from auth.users) u
       where u.id = t.%2$I and u.nm is not null and u.email is not null
         and (t.%3$I = u.email or t.%3$I = split_part(u.email, '@', 1))$q$, p.t, p.id_col, p.name_col);
    get diagnostics n = row_count;
    if n > 0 then raise notice '%: % names', p.t, n; end if;
  end loop;
end $$;
