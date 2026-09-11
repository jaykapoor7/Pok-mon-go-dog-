-- ════════════════════════════════════════════════════════════════
-- Somebody is holding a code that will not let them in.
--
-- Put their address and the exact code from their email in the two
-- marked lines below and run the whole file in the Supabase SQL editor.
--
-- It does two things. First it tells you where that code actually lives,
-- if anywhere, and what codes that address already has. Then it makes the
-- code they are holding work, so you do not have to send another email
-- and they do not have to retype anything.
--
-- WHY A GOOD-LOOKING CODE GETS REFUSED
--
--   The code was never minted. A code typed into an email by hand is not
--   a credential; nothing in the database knows about it.
--
--   The code was reissued. Inviting the same address to an organisation
--   again REPLACES its code, and the one in their inbox stops working
--   that moment.
--
--   The code is real but filed under a different address. The sign-in
--   needs both halves to agree, so this fails exactly like a wrong code.
--
-- Section 3 fixes all three, because it makes the pair they are holding
-- true by definition.
-- ════════════════════════════════════════════════════════════════

-- ┌──────────────────────────────────────────────────────────────┐
-- │  THE TWO LINES TO EDIT.                                       │
-- └──────────────────────────────────────────────────────────────┘
drop table if exists fixing;
create temp table fixing as
select lower(btrim( 'info@janicestrust.org' )) as email,
       upper(btrim( '9PNE4H'                )) as code,
       btrim( 'Manoj Oswal'                   ) as person,
       -- 'individual' for a community member, 'feeder' for a feeder.
       'individual'                            as role;


-- ── 1. where does that code live, if anywhere ─────────────────────

drop table if exists code_found;
create temp table code_found (kind text, code text, registered_to text, detail text);

do $$
declare v_code text := (select code from fixing);
begin
  if to_regclass('public.personal_access_codes') is not null then
    execute format($q$
      insert into code_found
      select 'personal', code, email,
             case when active then 'Active' else 'TURNED OFF' end
        from personal_access_codes
       where upper(btrim(code)) = %L $q$, v_code);
  end if;
  if to_regclass('public.org_email_invites') is not null then
    execute format($q$
      insert into code_found
      select 'staff', i.code, i.email,
             case when i.revoked_at is not null then 'TURNED OFF'
                  when i.expires_at is not null and i.expires_at < now() then 'EXPIRED'
                  else 'Active' end
        from org_email_invites i
       where upper(btrim(i.code)) = %L $q$, v_code);
  end if;
  if to_regclass('public.org_invite_codes') is not null then
    execute format($q$
      insert into code_found
      select 'volunteer', code, email, 'Active'
        from org_invite_codes
       where upper(btrim(code)) = %L $q$, v_code);
  end if;
  if not exists (select 1 from code_found) then
    insert into code_found (kind, detail)
      values ('none', 'This code is not in the database at all. It was never minted, or it was replaced by a newer one.');
  end if;
end $$;

select * from code_found;


-- ── 2. what codes does that address already have ──────────────────

drop table if exists address_codes;
create temp table address_codes (kind text, code text, detail text);

do $$
declare v_email text := (select email from fixing);
begin
  if to_regclass('public.personal_access_codes') is not null then
    execute format($q$
      insert into address_codes
      select 'personal', code, case when active then 'Active' else 'TURNED OFF' end
        from personal_access_codes where lower(btrim(email)) = %L $q$, v_email);
  end if;
  if to_regclass('public.org_email_invites') is not null then
    execute format($q$
      insert into address_codes
      select 'staff', i.code,
             case when i.code is null then 'INVITE HAS NO CODE'
                  when i.revoked_at is not null then 'TURNED OFF'
                  when i.expires_at is not null and i.expires_at < now() then 'EXPIRED'
                  else 'Active' end
        from org_email_invites i where lower(btrim(i.email)) = %L $q$, v_email);
  end if;
end $$;

select * from address_codes;


-- ── 3. make the code they are holding work ────────────────────────
--
-- Writes the exact pair from the top of this file into the personal code
-- table. If that address already has a code it is replaced by this one,
-- and if this code was sitting on somebody else's row that row is cleared
-- first, because a code belongs to one person.
--
-- This grants a community sign-in, not organisation staff access. Adding
-- somebody to an organisation is the team page, deliberately: it decides
-- who can see an NGO's casework.

delete from personal_access_codes
 where upper(btrim(code)) = (select code from fixing)
   and lower(btrim(email)) <> (select email from fixing);

insert into personal_access_codes (email, name, role, code, active)
select email, person, role, code, true from fixing
on conflict (email) do update
  set code   = excluded.code,
      name   = coalesce(excluded.name, personal_access_codes.name),
      role   = excluded.role,
      active = true;

-- What they can now sign in with, at /join.
select email as "sign in with this email",
       code  as "and this code",
       name, role, active
  from personal_access_codes
 where lower(btrim(email)) = (select email from fixing);
