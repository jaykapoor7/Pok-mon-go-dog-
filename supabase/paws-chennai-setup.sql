-- ════════════════════════════════════════════════════════════════
-- StrayPaw, set up PAWS Chennai as a verified partner organisation.
--
-- HOW TO RUN
--
-- 1. Each PAWS person signs up on the site first, with the email they will
--    use. That creates their auth.users row. This script attaches those
--    accounts to the organisation; it cannot create accounts, and it
--    deliberately does not try to. An account created from SQL has no
--    password the person knows.
--
-- 2. Edit the emails in PAWS_MEMBERS below to the real addresses.
--
-- 3. Run the whole file in the Supabase SQL editor.
--
-- 4. Re-run it after each new person signs up. It is idempotent: existing
--    members are left alone and the organisation is not duplicated.
--
-- If an email has not signed up yet, the script says so by name rather
-- than failing silently, so you can see who is still missing.
--
-- Depends on: schema.sql, partner-onboarding.sql, animals.sql,
--             abc-programme.sql.
-- ════════════════════════════════════════════════════════════════

do $$
declare
  -- ─── EDIT THESE ──────────────────────────────────────────────────
  PAWS_MEMBERS text[] := array[
    'change-me-1@example.org',
    'change-me-2@example.org'
  ];
  -- ─────────────────────────────────────────────────────────────────

  v_ngo     uuid;
  v_email   text;
  v_user    uuid;
  v_added   int := 0;
  v_missing text[] := '{}';
begin
  -- The organisation. Matched on slug so re-running updates rather than
  -- creating a second PAWS.
  select id into v_ngo from ngos where slug = 'paws-chennai';

  if v_ngo is null then
    insert into ngos (name, slug, city, verified)
    values ('PAWS Chennai', 'paws-chennai', 'Chennai', true)
    returning id into v_ngo;
    raise notice 'Created organisation PAWS Chennai (%)', v_ngo;
  else
    update ngos set verified = true where id = v_ngo;
    raise notice 'PAWS Chennai already exists (%), left in place', v_ngo;
  end if;

  foreach v_email in array PAWS_MEMBERS loop
    select id into v_user from auth.users
     where lower(email) = lower(btrim(v_email));

    if v_user is null then
      v_missing := v_missing || v_email;
      continue;
    end if;

    if exists (select 1 from ngo_members where user_id = v_user) then
      raise notice 'Already a member: %', v_email;
    else
      insert into ngo_members (ngo_id, user_id) values (v_ngo, v_user);
      v_added := v_added + 1;
      raise notice 'Added to PAWS Chennai: %', v_email;
    end if;
  end loop;

  raise notice '--- % member(s) added ---', v_added;

  if array_length(v_missing, 1) > 0 then
    raise notice 'NOT FOUND (these emails have not signed up yet): %',
      array_to_string(v_missing, ', ');
    raise notice 'Ask them to create an account, then run this file again.';
  end if;
end $$;

-- What the organisation looks like now. Run this on its own any time to
-- check who has access.
select n.name,
       n.slug,
       n.verified,
       count(m.user_id) as members,
       (select count(*) from dogs d where d.ngo_id = n.id) as animals
  from ngos n
  left join ngo_members m on m.ngo_id = n.id
 where n.slug = 'paws-chennai'
 group by n.id, n.name, n.slug, n.verified;
