-- Self-registered organisations stay private until StrayPaw verifies them.
--
-- An organisation that registered itself (ngos.partner_status =
-- 'self_registered') and is not yet verified must not appear anywhere the
-- public can read: not on the map, not in case stories, care facts or
-- programme cards, not in the organisations table itself. Its own members
-- see everything as usual. Verification (verified = true, partner_status
-- 'directory') publishes it.
--
-- Every public view already hides demo rows with the same clause,
--   NOT COALESCE(<alias>.is_demo, false)
-- so this migration extends that clause, in place, on whichever public
-- views exist in this database. CREATE OR REPLACE VIEW keeps each view's
-- columns, owner, options and grants. Non-destructive and idempotent: no
-- table, column or row is dropped or rewritten, and running it twice
-- changes nothing the second time.
--
-- Applied to staging 2026-11-11 and verified there: an unverified
-- organisation's animal was absent from dogs, public_spatial_animals,
-- operational_animals and ngos for the anon role, and present after
-- verification.

create or replace function public.org_is_unlisted(p_ngo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_ngo is not null and exists (
    select 1 from ngos u where u.id = p_ngo and u.partner_status = 'self_registered' and not coalesce(u.verified, false)
  );
$$;
revoke all on function public.org_is_unlisted(uuid) from public;
grant execute on function public.org_is_unlisted(uuid) to anon, authenticated, service_role;

-- One self-contained check any role may call. It must not depend on my_ngo(), which anonymous
-- visitors are not allowed to execute: a policy that called it failed every anonymous read.
create or replace function public.org_rows_visible(p_ngo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_ngo is null
      or not exists (select 1 from ngos u where u.id = p_ngo and u.partner_status = 'self_registered' and not coalesce(u.verified, false))
      or exists (select 1 from ngo_members m where m.ngo_id = p_ngo and m.user_id = auth.uid());
$$;
revoke all on function public.org_rows_visible(uuid) from public;
grant execute on function public.org_rows_visible(uuid) to anon, authenticated, service_role;

do $$
declare v record; def text; patched text; alias text; has_ngo boolean;
begin
  for v in
    select c.oid, c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'v' and (c.relname like 'public\_%' escape '\' or c.relname in ('adoptable_animals', 'operational_animals'))
  loop
    def := pg_get_viewdef(v.oid, true);
    patched := def;
    if def ~ 'is_demo' and def !~ 'org_is_unlisted' then
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
    end if;
    -- care events reach an organisation through their animal
    if def ~ 'medical_events m\M' and def !~ 'ud\.ngo_id' then
      patched := regexp_replace(patched, 'NOT COALESCE\(m\.is_demo, false\)',
        'NOT COALESCE(m.is_demo, false) AND NOT (EXISTS ( SELECT 1 FROM dogs ud WHERE ud.id = m.dog_id AND org_is_unlisted(ud.ngo_id)))', 'g');
    end if;
    -- programme cards where no demo clause exists to extend
    if v.relname = 'public_programme_cards' and patched !~ 'org_is_unlisted\(c\.ngo_id\)' then
      patched := regexp_replace(patched, 'WHERE \(c\.public_visibility', 'WHERE NOT org_is_unlisted(c.ngo_id) AND (c.public_visibility');
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
      execute format('create policy %I on public.%I as restrictive for select to public using (public.org_rows_visible(ngo_id))', t || '_unlisted_private', t);
    end if;
  end loop;
end $$;

-- The organisations table: an unlisted organisation is readable only by its own members.
drop policy if exists ngos_unlisted_private on public.ngos;
create policy ngos_unlisted_private on public.ngos as restrictive for select to public using (public.org_rows_visible(id));
