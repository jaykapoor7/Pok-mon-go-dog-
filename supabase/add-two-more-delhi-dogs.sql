-- ════════════════════════════════════════════════════════════════
-- Two more photographed Delhi animals.
--
-- Same shape as seed-delhi-photographs.sql: the animal, then the sighting
-- that put it on the record, then the stored count. Safe to run twice.
--
-- Run this AFTER fix-sightings-feed.sql. It creates its own sightings, so
-- these two are in the feed from the moment they are in the table.
-- ════════════════════════════════════════════════════════════════

insert into dogs (
  id, name, zone, lat, lng, status, cover_photo,
  size, color, is_friendly, needs_help,
  sterilisation_status, vaccination_status,
  sightings_count, first_seen, last_seen, created_at
) values

-- 21. Cream dog standing in the middle of a residential lane, looking back
--     at the camera, parked cars along the kerb.
('d0910000-0000-4000-8000-000000000021', null, 'Greater Kailash',
 28.5494, 77.2426, 'seen', '/dogs/delhi/cream-street-standing.jpg',
 'medium', 'Cream', true, false, 'unknown', 'unknown',
 1, '2026-09-06 17:20:00+05:30', '2026-09-06 17:20:00+05:30', '2026-09-06 17:34:00+05:30'),

-- 22. Tan dog lying on a granite lobby floor beside a doormat, wearing a
--     dark collar with a lead attached.
('d0910000-0000-4000-8000-000000000022', null, 'Vasant Kunj',
 28.5200, 77.1588, 'seen', '/dogs/delhi/tan-lobby-collar.jpg',
 'medium', 'Tan', true, false, 'unknown', 'unknown',
 1, '2026-09-08 11:05:00+05:30', '2026-09-08 11:05:00+05:30', '2026-09-08 11:21:00+05:30')

on conflict (id) do update set
  zone         = excluded.zone,
  lat          = excluded.lat,
  lng          = excluded.lng,
  cover_photo  = excluded.cover_photo,
  color        = excluded.color,
  last_seen    = excluded.last_seen;


-- The sighting behind each one, so they are in the feed and not only on
-- the map. The id is derived from the animal's, so re-running finds the
-- row already there.

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
  d.cover_photo, d.lat, d.lng, d.zone,
  null, null, 50, 0, 'live', d.created_at
from dogs d
where d.id in ('d0910000-0000-4000-8000-000000000021',
               'd0910000-0000-4000-8000-000000000022')
  and coalesce(d.cover_photo, '') <> ''
on conflict (id) do nothing;

update dogs d
   set sightings_count = (select count(*) from sightings s where s.dog_id = d.id)
 where d.id in ('d0910000-0000-4000-8000-000000000021',
                'd0910000-0000-4000-8000-000000000022');

-- What the site should show now.
select (select count(*) from dogs)      as animals_on_record,
       (select count(*) from sightings) as sightings_in_feed,
       (select count(*) from dogs d
         where not exists (select 1 from sightings s where s.dog_id = d.id))
                                        as animals_missing_from_feed;
