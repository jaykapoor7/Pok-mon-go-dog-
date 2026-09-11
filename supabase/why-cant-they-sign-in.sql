-- ════════════════════════════════════════════════════════════════
-- Why can this person not sign in?
--
-- Put their email address in the one place marked below, then run the
-- whole file in the Supabase SQL editor. It reads only — nothing is
-- changed — and it answers the question the sign-in screen cannot: is
-- there a code for this person at all, is it still alive, and is it filed
-- under the address they are actually typing?
--
-- A code has to match BOTH the six characters AND the email on the
-- record. Typing a different address — a personal one instead of the work
-- one the invite went to — fails in exactly the same way a wrong code
-- does, which is why this file exists.
-- ════════════════════════════════════════════════════════════════

-- ┌──────────────────────────────────────────────────────────────┐
-- │  THE ONE LINE TO EDIT: put their email address here.          │
-- └──────────────────────────────────────────────────────────────┘
drop table if exists who_we_are_checking;
create temp table who_we_are_checking as
select lower(btrim( 'janice@example.org' )) as email;


-- ── 1. is the code machinery installed at all ─────────────────────
--
-- A null in any of these columns is the whole answer: that lookup cannot
-- run, so everyone using that kind of code is told their code is wrong.
-- Run RUN-PILOT-MIGRATIONS.sql, then org-access-codes.sql, and retry.

select to_regclass('public.org_email_invites')              as staff_codes_table,
       to_regclass('public.org_invite_codes')               as volunteer_codes_table,
       to_regclass('public.personal_access_codes')          as personal_codes_table,
       to_regprocedure('public.resolve_access_code(text)')  as staff_lookup,
       to_regprocedure('public.resolve_invite_code(text)')  as volunteer_lookup;


-- ── 2. every code on file for that address ────────────────────────
--
-- Built through dynamic SQL so a table that was never created reports
-- itself as missing instead of aborting the rest of the file.

drop table if exists code_report;
create temp table code_report (
  kind    text,
  address text,
  person  text,
  role    text,
  org     text,
  code    text,
  verdict text,
  uses    int,
  last_used timestamptz
);

do $$
declare v_email text := (select email from who_we_are_checking);
begin
  -- staff / organisation codes
  if to_regclass('public.org_email_invites') is null then
    insert into code_report (kind, verdict)
      values ('staff', 'TABLE NOT INSTALLED. Run RUN-PILOT-MIGRATIONS.sql');
  else
    execute format($q$
      insert into code_report
      select 'staff', i.email, i.person_name, i.role, n.name, i.code,
             case
               when i.code is null           then 'NO CODE ON THIS INVITE. Reissue it from the team page'
               when i.revoked_at is not null then 'TURNED OFF on ' || i.revoked_at::date
               when i.expires_at is not null
                and i.expires_at < now()     then 'EXPIRED on ' || i.expires_at::date || '. Reissue it'
               else                               'OK, this code should work'
             end,
             i.uses, i.last_used_at
        from org_email_invites i
        left join ngos n on n.id = i.ngo_id
       where lower(btrim(i.email)) = %L $q$, v_email);
  end if;

  -- personal codes, from "get my code" on the site
  if to_regclass('public.personal_access_codes') is null then
    insert into code_report (kind, verdict)
      values ('personal', 'TABLE NOT INSTALLED. Run RUN-PILOT-MIGRATIONS.sql');
  else
    execute format($q$
      insert into code_report
      select 'personal', email, name, role, null, code,
             case when active then 'OK, this code should work'
                  else 'TURNED OFF' end,
             uses, last_used_at
        from personal_access_codes
       where lower(btrim(email)) = %L $q$, v_email);
  end if;
end $$;

select * from code_report order by kind;


-- ── 3. near misses at the same domain ─────────────────────────────
--
-- The common one. Their code is real, but filed under an address they are
-- not typing — a colleague's, or their other address. Nothing here and
-- nothing in section 2 means no code was ever issued to them.

do $$
declare v_email text := (select email from who_we_are_checking);
begin
  drop table if exists near_misses;
  create temp table near_misses (code text, address_on_record text, organisation text);
  if to_regclass('public.org_email_invites') is not null then
    execute format($q$
      insert into near_misses
      select i.code, i.email, n.name
        from org_email_invites i
        left join ngos n on n.id = i.ngo_id
       where i.code is not null
         and lower(btrim(i.email)) <> %L
         and split_part(lower(btrim(i.email)), '@', 2) = split_part(%L, '@', 2) $q$,
      v_email, v_email);
  end if;
end $$;

select * from near_misses;

-- ── 4. is there an account behind that address yet ────────────────
--
-- A personal code creates the auth account the first time it is redeemed,
-- so an empty result here is normal for somebody who has not signed in
-- yet. It matters when the code looks right and the sign-in still fails:
-- an account that exists but was never confirmed cannot exchange a token.
--
-- Read through dynamic SQL because auth is Supabase's schema, not ours,
-- and a column that is not there should report itself rather than abort
-- the rest of this file.

drop table if exists account_report;
create temp table account_report (email text, created_at timestamptz, verdict text);

do $$
declare v_email text := (select email from who_we_are_checking);
begin
  if to_regclass('auth.users') is null then
    insert into account_report (verdict) values ('Cannot see auth.users from here.');
    return;
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema='auth' and table_name='users'
                and column_name='email_confirmed_at') then
    execute format($q$
      insert into account_report
      select u.email, u.created_at,
             case when u.email_confirmed_at is null
                  then 'ACCOUNT NOT CONFIRMED. This blocks sign-in.'
                  else 'Account is fine' end
        from auth.users u
       where lower(btrim(u.email)) = %L $q$, v_email);
  else
    execute format($q$
      insert into account_report
      select u.email, u.created_at, 'Account exists'
        from auth.users u
       where lower(btrim(u.email)) = %L $q$, v_email);
  end if;
end $$;

select * from account_report;


-- ── 5. the codes issued most recently ─────────────────────────────
--
-- For testing the flow end to end: request a code on the site, run this,
-- read your own code out of the table, and sign in with it. Beats waiting
-- on an inbox to work out whether the rest of the chain is sound.

select email, name, role, code, active, uses, last_used_at, created_at
  from personal_access_codes
 order by created_at desc
 limit 10;
