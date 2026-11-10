-- Self-registered organisations stay private until StrayPaw verifies them.
--
-- An organisation that registered itself (ngos.partner_status =
-- 'self_registered') and is not yet verified must not appear anywhere the
-- public can read: not on the map, not in case stories, not in programme
-- cards, not in the organisations table itself. Its own members see
-- everything as usual.
--
-- Every public view already hides demo rows with the same clause,
--   NOT COALESCE(<alias>.is_demo, false)
-- so this migration extends that clause, in place, on whichever public
-- views exist in this database, to also exclude rows owned by an unlisted
-- organisation. CREATE OR REPLACE VIEW keeps each view's columns, owner,
-- options (security_barrier, security_invoker) and grants. Non-destructive:
-- no table, column or row is dropped or rewritten.

create or replace function public.org_is_unlisted(p_ngo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_ngo is not null and exists (
    select 1 from ngos u where u.id = p_ngo and u.partner_status = 'self_registered' and not coalesce(u.verified, false)
  );
$$;
revoke all on function public.org_is_unlisted(uuid) from public;
grant execute on function public.org_is_unlisted(uuid) to anon, authenticated, service_role;

do $$
declare v record; def text; patched text; alias text; has_ngo boolean;
begin
  for v in
    select c.oid, c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'v' and (c.relname like 'public\_%' escape '\' or c.relname in ('adoptable_animals', 'operational_animals'))
  loop
    def := pg_get_viewdef(v.oid, true);
    if def !~ 'is_demo' or def ~ 'org_is_unlisted' then continue; end if;
    patched := def;
    -- aliased rows from tables that carry ngo_id: dogs (d), cases and campaigns (c), adoption listings (a)
    foreach alias in array array['d', 'c', 'a'] loop
      has_ngo := def ~ ('\m' || alias || '\.ngo_id\M')
              or def ~* ('\m(dogs|cases|campaigns|adoption_listings)\s+' || alias || '\M');
      if has_ngo then
        patched := regexp_replace(patched, 'NOT COALESCE\(' || alias || '\.is_demo, false\)',
                                  'NOT COALESCE(' || alias || '.is_demo, false) AND NOT org_is_unlisted(' || alias || '.ngo_id)', 'g');
      end if;
    end loop;
    -- an unqualified is_demo over a single dogs/cases table
    if def ~* 'FROM (dogs|cases)( \w+)?\s+WHERE' then
      patched := regexp_replace(patched, 'NOT COALESCE\(is_demo, false\)', 'NOT COALESCE(is_demo, false) AND NOT org_is_unlisted(ngo_id)', 'g');
    end if;
    if patched <> def then
      execute format('create or replace view public.%I as %s', v.relname, patched);
      raise notice 'unlisted organisations excluded from %', v.relname;
    end if;
  end loop;
end $$;

-- The base tables: a restrictive rule on top of whatever read policies exist,
-- so no present or future permissive policy can expose an unlisted organisation's rows.
do $$
declare t text;
begin
  foreach t in array array['dogs', 'cases'] loop
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = t and column_name = 'ngo_id') then
      execute format('drop policy if exists %I on public.%I', t || '_unlisted_private', t);
      execute format('create policy %I on public.%I as restrictive for select to public using (not public.org_is_unlisted(ngo_id) or ngo_id = (select public.my_ngo()))', t || '_unlisted_private', t);
    end if;
  end loop;
end $$;

-- The organisations table: an unlisted organisation is readable only by its own members.
drop policy if exists ngos_unlisted_private on public.ngos;
create policy ngos_unlisted_private on public.ngos as restrictive for select to public
  using (partner_status is distinct from 'self_registered' or coalesce(verified, false) or id = (select public.my_ngo()));
