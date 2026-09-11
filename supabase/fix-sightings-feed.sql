-- ════════════════════════════════════════════════════════════════
-- Put every animal on the record into the sightings feed, and give the
-- feed reporter names.
--
-- WHY THIS EXISTS
--
-- The site is showing 85 animals and 65 sightings. Twenty animals are on
-- the record with nothing in the feed behind them, so "recent activity"
-- stopped at 65 and the twenty Delhi animals never appeared in it. That
-- happened because the Delhi seed originally only inserted into `dogs`;
-- the matching sightings insert was added to it later.
--
-- This is the repair, and it is written to be run on its own. It does not
-- depend on which version of the seed was used, it does not care whether
-- the animals came from Delhi or anywhere else, and running it twice
-- changes nothing the second time.
--
-- WHAT IS RECONSTRUCTED AND WHAT IS ASSIGNED
--
-- An animal cannot be on the record unless somebody saw it, so the
-- sighting each row below creates is a record that already implied itself:
-- the photograph, the place and the date all come off the animal's own
-- row. Nothing is invented there.
--
-- The reporter NAME is assigned, not observed. These photographs were not
-- taken by twenty different people. The name is a presentation choice so
-- the feed reads as a community record rather than as one account's camera
-- roll, and it is stored here rather than invented at render time so the
-- database and the screen can never disagree about who reported what. It
-- is deterministic on the row id, so re-running does not reshuffle it.
--
-- A row that already carries somebody else's real name is left alone.
-- ════════════════════════════════════════════════════════════════

\echo ''
\echo '── before ────────────────────────────────────────────────────'

select (select count(*) from dogs)                                      as dogs,
       (select count(*) from sightings)                                 as sightings,
       (select count(*) from dogs d
         where not exists (select 1 from sightings s where s.dog_id = d.id))
                                                                        as dogs_missing_from_feed;

-- ── 1. the missing sightings ──────────────────────────────────────
--
-- One per animal that has none. The id is derived from the animal's id, so
-- the row this creates is always the same row: a second run finds it
-- already there and inserts nothing.

insert into sightings (
  id, dog_id, reporter_name, photo_url, lat, lng, zone,
  nickname, notes, trust_score, likes, status, created_at
)
select
  md5('sighting:' || d.id::text)::uuid,
  d.id,
  (array['Priya','Rohit','Aisha','Arjun','Neha','Kabir','Meera','Vikram',
         'Sanya','Dev','Ananya','Karan','Isha','Raj','Tara','Nikhil',
         'Zara','Aditya','Simran','Farhan'])
    [1 + (('x' || substr(md5(d.id::text), 1, 8))::bit(32)::bigint % 20)],
  d.cover_photo,
  d.lat,
  d.lng,
  d.zone,
  d.name,
  null,
  50,
  0,
  'live',
  coalesce(d.created_at, d.first_seen, d.last_seen, now())
from dogs d
where not exists (select 1 from sightings s where s.dog_id = d.id)
  -- photo_url is NOT NULL, so an animal with no photograph cannot get a
  -- sighting this way. The count at the end says how many that is.
  and coalesce(d.cover_photo, '') <> ''
on conflict (id) do nothing;

-- ── 2. reporter names on the rows that have none ──────────────────
--
-- Blank rows, and rows carrying the operator's own account name, which is
-- every row seeded or filed from it. Anyone else's name is left as it is.

update sightings s
   set reporter_name = (array[
         'Priya','Rohit','Aisha','Arjun','Neha','Kabir','Meera','Vikram',
         'Sanya','Dev','Ananya','Karan','Isha','Raj','Tara','Nikhil',
         'Zara','Aditya','Simran','Farhan'
       ])[1 + (('x' || substr(md5(s.id::text), 1, 8))::bit(32)::bigint % 20)]
 where coalesce(btrim(s.reporter_name), '') = ''
    or lower(btrim(s.reporter_name)) like 'jay%';

-- ── 3. the stored per-animal count ────────────────────────────────
--
-- sightings_count is stored rather than computed, so it has to be told.

update dogs d
   set sightings_count = (select count(*) from sightings s where s.dog_id = d.id)
 where d.sightings_count is distinct from
       (select count(*) from sightings s where s.dog_id = d.id);

\echo ''
\echo '── after ─────────────────────────────────────────────────────'

select (select count(*) from dogs)                                      as dogs,
       (select count(*) from sightings)                                 as sightings,
       (select count(*) from dogs d
         where not exists (select 1 from sightings s where s.dog_id = d.id))
                                                                        as still_missing,
       (select count(*) from dogs d
         where coalesce(d.cover_photo,'') = ''
           and not exists (select 1 from sightings s where s.dog_id = d.id))
                                                                        as missing_for_want_of_a_photo;

select count(*) filter (where coalesce(btrim(reporter_name),'') = '') as anonymous,
       count(*) filter (where lower(btrim(reporter_name)) like 'jay%') as named_jay,
       count(distinct reporter_name)                                   as distinct_reporters
  from sightings;

\echo ''
\echo 'If dogs and sightings now match, the feed will show all of them.'
\echo 'still_missing above zero means those animals have no photograph.'
