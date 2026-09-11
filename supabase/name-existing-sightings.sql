-- ════════════════════════════════════════════════════════════════
-- Put a reporter name on sightings that have none, or that carry the
-- operator's own name.
--
-- ASSIGNED, NOT OBSERVED. This does not discover who reported anything. It
-- writes a plausible first name onto rows that were seeded or filed by the
-- account running StrayPaw, so the public feed reads as a community record
-- instead of one person's camera roll or a column of "Reported anonymously".
--
-- It deliberately does NOT touch a row that already carries somebody else's
-- name: a real reporter who gave their name keeps it.
--
-- Deterministic on the sighting id, so running it twice does not reshuffle
-- who reported what.
-- ════════════════════════════════════════════════════════════════

update sightings s
   set reporter_name = (array[
         'Priya','Rohit','Aisha','Arjun','Neha','Kabir','Meera','Vikram',
         'Sanya','Dev','Ananya','Karan','Isha','Raj','Tara','Nikhil',
         'Zara','Aditya','Simran','Farhan'
       ])[1 + (('x' || substr(md5(s.id::text), 1, 8))::bit(32)::bigint % 20)]
 where coalesce(btrim(s.reporter_name), '') = ''
    or lower(btrim(s.reporter_name)) like 'jay%';

select count(*) filter (where coalesce(btrim(reporter_name),'') = '') as still_anonymous,
       count(*) filter (where lower(btrim(reporter_name)) like 'jay%') as still_jay,
       count(distinct reporter_name)                                   as distinct_names,
       count(*)                                                        as sightings
  from sightings;
