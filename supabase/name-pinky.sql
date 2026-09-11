-- ════════════════════════════════════════════════════════════════
-- Pinky, and who reported her.
--
-- The hero leads on the animal named 'Pinky' when there is one, so this is
-- what puts her there. It names ONE record and sets the reporter on that
-- record's sighting; nothing else is touched.
--
-- IF THE WRONG DOG COMES UP, CHANGE THE ID ON THE NEXT LINE. The photographs
-- are numbered in the order they appear in seed-delhi-photographs.sql, so
-- ...0010 is the tenth one there. Set it to whichever record is actually
-- Pinky and re-run; it is idempotent.
-- ════════════════════════════════════════════════════════════════

\set pinky_id 'd0910000-0000-4000-8000-000000000010'

update dogs
   set name = 'Pinky'
 where id = :'pinky_id';

update sightings
   set reporter_name = 'Aishwarya'
 where dog_id = :'pinky_id';

-- What the hero will now open on.
select d.name, d.zone, d.color, d.cover_photo, s.reporter_name as reported_by
  from dogs d
  left join sightings s on s.dog_id = d.id
 where d.id = :'pinky_id';
