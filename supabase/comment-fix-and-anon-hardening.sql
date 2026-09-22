-- ════════════════════════════════════════════════════════════════════
-- Comment mapping fix, and abuse limits on the anonymous write RPCs.
--
-- Idempotent and non-destructive: it replaces function bodies, narrows one
-- public view, and touches no data. Safe to run more than once.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. add_comment wrote the comment into the name column ───────────
--
-- The insert listed its columns as (dog_id, reporter_name, body) and its
-- values as (p_dog_id, p_body, p_reporter_name), so every comment ever filed
-- through this function stored the comment text as the commenter's name and
-- the commenter's name as the comment. That is a data-integrity bug and a
-- privacy one: reporter_name is the field surfaces treat as a short public
-- label, so free text a person wrote about an animal was being displayed
-- where a name belongs.
--
-- Only new rows are corrected here. Existing rows are left alone on purpose:
-- this migration cannot tell a genuinely swapped row from a legitimate one,
-- and silently rewriting people's words is worse than leaving them.
create or replace function add_comment(
  p_dog_id uuid, p_body text, p_reporter_name text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_body is null or btrim(p_body) = '' then
    raise exception 'A comment needs some text.';
  end if;

  /* Per-animal, so flooding one record's comments is what gets stopped
     rather than a whole city's commenting. The browser calls this directly
     with the anon key, so there is no server route in front of it to do the
     limiting instead. */
  if not check_rate_limit(p_dog_id::text, 'add_comment', 10, 600) then
    raise exception 'Too many comments on this animal just now. Please try again shortly.';
  end if;

  insert into comments (dog_id, reporter_name, body)
  values (p_dog_id, p_reporter_name, p_body);
end;
$$;

-- ── 2. Counter and telemetry RPCs ───────────────────────────────────
--
-- These are anonymous by design: a resident should be able to say an animal
-- was seen or fed without an account. They were also unbounded, and each one
-- moves a number that is shown publicly, so a single script could inflate
-- them freely. Each now silently stops counting past a generous threshold
-- rather than raising: these are fire-and-forget signals, and an error
-- message would interrupt a flow that has nothing to do with the limit.

create or replace function like_sighting(p_sighting_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not check_rate_limit(p_sighting_id::text, 'like_sighting', 30, 60) then
    return;
  end if;
  update sightings set likes = likes + 1 where id = p_sighting_id;
end;
$$;

create or replace function log_seen(p_dog_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not check_rate_limit(p_dog_id::text, 'log_seen', 20, 600) then
    return;
  end if;
  update dogs set last_seen = now(), sightings_count = sightings_count + 1
  where id = p_dog_id;
end;
$$;

-- ── 3. Adoption listings no longer publish a phone number ───────────
--
-- adoptable_animals is granted to anon and carried contact_phone and
-- contact_email, so a personal phone number and address sat behind the
-- public API key for anyone to enumerate. Nothing in the product reads
-- them: adoptableAnimals() has no callers and /adopt redirects to /orgs,
-- so this is exposure with no feature behind it.
--
-- contact_name stays. A listing that says who to ask for is useful and is
-- not a contact detail. Reaching that person goes through the organisation,
-- which is what the rest of the product already does.
--
-- Dropped and recreated because CREATE OR REPLACE VIEW cannot remove a
-- column. The grants are restored immediately afterwards.
drop view if exists adoptable_animals;
create view adoptable_animals as
  select a.id            as listing_id,
         a.dog_id,
         a.summary,
         a.good_with,
         a.needs,
         a.contact_name,
         a.created_at,
         d.name,
         d.zone,
         d.cover_photo,
         d.sterilised,
         d.vaccinated,
         d.is_friendly,
         n.name          as org_name,
         n.slug          as org_slug
    from adoption_listings a
    join dogs d on d.id = a.dog_id
    left join ngos n on n.id = a.ngo_id
   where a.status = 'open';

grant select on adoptable_animals to anon, authenticated, service_role;

-- ── 4. log_feed (already live; recorded here so rebuilds match) ─────
--
-- Applied directly to production as a hotfix and mirrored into schema.sql
-- and the RUN-ALL bundle. It is repeated here so a database rebuilt from
-- this file alone cannot regress to the unbounded version.
--
-- log_feed is anonymous by design, and one call did four things: inserted a
-- feed event, incremented dogs.feed_count, and moved last_fed_at and
-- last_seen. Three of those are shown publicly, so an unbounded anonymous
-- caller could make an animal look continuously fed and freshly seen.
--
-- Silent rather than raising: feeding is a fire-and-forget signal, and an
-- error would interrupt a flow that has nothing to do with the limit.
--
-- PRODUCTION ALREADY HAS THIS. Re-running is harmless (create or replace,
-- identical body) but unnecessary.
create or replace function log_feed(
  p_dog_id uuid,
  p_reporter_name text default null,
  p_food_type text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not check_rate_limit(p_dog_id::text, 'log_feed', 10, 600) then
    return;
  end if;
  insert into feed_events (dog_id, reporter_name, food_type)
  values (p_dog_id, p_reporter_name, p_food_type);
  update dogs
  set feed_count = feed_count + 1,
      last_fed_at = now(),
      last_seen = now()
  where id = p_dog_id;
end;
$$;

-- ── Audit corrections, recorded so they are not "fixed" again ───────
--
-- create_feeding_zone is anonymous ON PURPOSE. launch-security-lockdown.sql
-- grants it so a guest can create a feeding zone without an account. An
-- earlier pass read that as an oversight; it is not. Do not revoke it
-- without a product decision to remove guest zone creation, and if that
-- decision is ever made, remove the guest flow at the same time rather
-- than leaving a button that fails.
--
-- st_estimatedextent is owned by the PostGIS extension. Revoking it does
-- not remove the effective platform grants, so the advisor keeps reporting
-- it however many times the revoke is applied. It is an extension/platform
-- exception, not a StrayPaw finding, and it should be left alone rather
-- than modified again: changing PostGIS grants to quiet a warning risks
-- the geometry functions the map depends on.
