-- ════════════════════════════════════════════════════════════════════
-- Remove duplicate sightings, and stop them coming back.
--
-- RUN diagnose-duplicates.sql FIRST and look at section 5. This file
-- deletes rows. It keeps the OLDEST of each duplicate group, because that
-- is the one the reporter actually made and the one anything else may
-- already point at.
--
-- Everything is wrapped in a transaction and prints what it would do
-- before it does it. Read the notices, then commit.
-- ════════════════════════════════════════════════════════════════════

begin;

-- ── 1. What is about to go ──────────────────────────────────────────
create temporary table dup_sightings on commit drop as
select id, photo_url, created_at,
       row_number() over (partition by photo_url order by created_at, id) as copy_no
  from sightings
 where photo_url is not null
   and photo_url <> ''
   and photo_url not like '/seed-dogs/%'   -- the seed reuses its 9 images on purpose
;

do $$
declare n int;
begin
  select count(*) into n from dup_sightings where copy_no > 1;
  raise notice 'Duplicate sightings to remove: %', n;
end $$;

select s.id, s.zone, s.created_at, s.photo_url
  from sightings s join dup_sightings d on d.id = s.id
 where d.copy_no > 1
 order by s.created_at desc;


-- ── 2. The animals those duplicates created ─────────────────────────
-- Each unmatched sighting made its own animal, so a doubled sighting also
-- doubled the register. An animal is only removed when the duplicate
-- sighting is the ONLY thing attached to it.

create temporary table dup_dogs on commit drop as
select distinct s.dog_id as id
  from sightings s
  join dup_sightings d on d.id = s.id
 where d.copy_no > 1
   and s.dog_id is not null
   and (select count(*) from sightings x where x.dog_id = s.dog_id) = 1;

do $$
declare n int;
begin
  select count(*) into n from dup_dogs;
  raise notice 'Animal records created only by a duplicate: %', n;
end $$;


-- ── 3. Remove them ──────────────────────────────────────────────────
delete from sightings
 where id in (select id from dup_sightings where copy_no > 1);

delete from dogs
 where id in (select id from dup_dogs);


-- ── 4. Stop it happening again ──────────────────────────────────────
-- A photo path carries a uuid generated at upload, so two rows sharing
-- one is always the same submission written twice. With this index the
-- second write fails instead of landing, which is what a retry after a
-- timeout should do.
--
-- Partial, so the seed's nine shared paths and any empty value are exempt.

create unique index if not exists sightings_photo_url_once
  on sightings (photo_url)
  where photo_url is not null
    and photo_url <> ''
    and photo_url not like '/seed-dogs/%';

-- Read the notices above. If the numbers look right:
commit;
-- If they do not:
-- rollback;
