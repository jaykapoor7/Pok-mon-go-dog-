-- ════════════════════════════════════════════════════════════════
-- StrayPaw, twenty photographed Delhi street dogs.
--
-- WHAT IS REAL HERE AND WHAT IS NOT. READ THIS BEFORE RUNNING IT.
--
-- REAL: the twenty photographs. Each is a photograph of an actual street dog
-- in Delhi, and the coat, build, collar and setting described below are
-- what is visible in the frame.
--
-- ASSIGNED: the coordinates and the timestamps. One locality per district,
-- deliberately, so the twenty sit across all nine districts rather than
-- piling into South. Nine, not ten, because the boundary data is Census
-- 2011 and Delhi had nine districts then — Shahdara and South East were
-- carved out in 2012 and do not exist in the polygons this counts against.
-- Either way that spread is a presentation choice, not a finding. The photographs did not
-- come with either, so a locality has been chosen for each and a plausible
-- time of day picked to match the light in the picture. They are real
-- Delhi localities at their real coordinates — but WHICH dog was seen
-- WHERE, and WHEN, is not established by the photograph.
--
-- That distinction matters more here than almost anywhere else in this
-- product. "How many animals, in which ward, seen when" is the entire
-- claim StrayPaw makes; a record whose location was picked to look good on
-- a map is the exact failure the rest of this schema is built to prevent.
--
-- So: EDIT THE lat/lng AND last_seen VALUES BELOW to where and when you
-- actually took each photograph before running this. They are laid out one
-- per line for that reason. If you cannot remember, that is worth knowing
-- too — five records with honest locations are worth more than five with
-- decorative ones.
--
-- Sterilisation and vaccination are 'unknown' for all twenty, which is not a
-- placeholder, it is the finding: nobody has examined these animals. Five of
-- them wear a collar, which in Delhi can mean an owned dog, a community-fed
-- dog, or an ABC programme's marker. It is not evidence of sterilisation
-- and is not recorded as any.
--
-- One of them (Nehru Place, the ginger dog under the chair) wears a collar
-- with a YELLOW TAG. Some ABC and vaccination drives tag animals that way.
-- If you know what that tag is, that dog's status is a real answer rather
-- than an unknown, and it is worth setting — one confirmed animal is worth
-- more than ten guesses.
--
-- Idempotent: fixed ids, so re-running updates rather than duplicating.
-- Depends on: RUN-ALL-MIGRATIONS.sql, abc-programme.sql (both in the pilot
-- bundle).
-- ════════════════════════════════════════════════════════════════

insert into dogs (
  id, name, zone, lat, lng, status, cover_photo,
  size, color, is_friendly, needs_help,
  sterilisation_status, vaccination_status,
  sightings_count, first_seen, last_seen, created_at
) values

-- 1. Slim ginger dog standing in the road at night, ears up, alongside a
--    boundary wall; a gate and a plate reading W-56 behind it.
('d0910000-0000-4000-8000-000000000001', null, 'Karol Bagh',
 28.6519, 77.1909, 'seen', '/dogs/delhi/tan-standing-night.jpg',
 'medium', 'Tan', true, false, 'unknown', 'unknown',
 1, '2026-08-19 21:40:00+05:30', '2026-08-19 21:40:00+05:30', '2026-08-19 21:52:00+05:30'),

-- 2. Golden dog curled asleep on a wooden floor beside planters and a
--    seated customer. Wearing a light collar.
('d0910000-0000-4000-8000-000000000002', null, 'Rohini',
 28.7495, 77.0565, 'seen', '/dogs/delhi/golden-curled-indoors.jpg',
 'medium', 'Golden', true, false, 'unknown', 'unknown',
 1, '2026-08-24 16:05:00+05:30', '2026-08-24 16:05:00+05:30', '2026-08-24 16:18:00+05:30'),

-- 3. Black-and-tan dog lying flat on tiles outside a shopfront, head down,
--    a parked motorcycle in the foreground.
('d0910000-0000-4000-8000-000000000003', null, 'Lajpat Nagar',
 28.5677, 77.2433, 'seen', '/dogs/delhi/black-tan-shopfront.jpg',
 'large', 'Black and tan', true, false, 'unknown', 'unknown',
 1, '2026-08-30 13:20:00+05:30', '2026-08-30 13:20:00+05:30', '2026-08-30 13:31:00+05:30'),

-- 4. Reddish-brown dog asleep on a stone ledge above the street, dark
--    collar, palm fronds to one side.
('d0910000-0000-4000-8000-000000000004', null, 'Dwarka',
 28.5921, 77.0460, 'seen', '/dogs/delhi/brown-on-ledge.jpg',
 'medium', 'Brown', true, false, 'unknown', 'unknown',
 1, '2026-09-02 08:15:00+05:30', '2026-09-02 08:15:00+05:30', '2026-09-02 08:26:00+05:30'),

-- 5. Dark dog curled on a mat in a doorway, nose tucked to its paws.
('d0910000-0000-4000-8000-000000000005', null, 'Mayur Vihar',
 28.6091, 77.2951, 'seen', '/dogs/delhi/dark-asleep-doorway.jpg',
 'medium', 'Black', true, false, 'unknown', 'unknown',
 1, '2026-09-05 17:45:00+05:30', '2026-09-05 17:45:00+05:30', '2026-09-05 17:58:00+05:30'),

-- 6. Pale cream dog lying on a paved forecourt, head up, watching the
--    camera. Greying muzzle.
('d0910000-0000-4000-8000-000000000006', null, 'Connaught Place',
 28.6315, 77.2167, 'seen', '/dogs/delhi/cream-forecourt.jpg',
 'medium', 'Cream', true, false, 'unknown', 'unknown',
 1, '2026-08-21 11:30:00+05:30', '2026-08-21 11:30:00+05:30', '2026-08-21 11:41:00+05:30'),

-- 7. Ginger dog asleep under a metal chair on a wood-effect floor. Collar
--    with a yellow tag on it — see the note above about tags.
('d0910000-0000-4000-8000-000000000007', null, 'Nehru Place',
 28.5494, 77.2500, 'seen', '/dogs/delhi/ginger-under-chair.jpg',
 'medium', 'Ginger', true, false, 'unknown', 'unknown',
 1, '2026-08-27 14:50:00+05:30', '2026-08-27 14:50:00+05:30', '2026-08-27 15:02:00+05:30'),

-- 8. Black-and-white dog asleep on its back, legs in the air, beside
--    planters. Wearing a collar.
('d0910000-0000-4000-8000-000000000008', null, 'Janakpuri',
 28.6219, 77.0878, 'seen', '/dogs/delhi/black-white-on-back.jpg',
 'medium', 'Black and white', true, false, 'unknown', 'unknown',
 1, '2026-09-01 15:25:00+05:30', '2026-09-01 15:25:00+05:30', '2026-09-01 15:36:00+05:30'),

-- 9. Red-brown dog asleep under café tables with people seated nearby, a
--    motorcycle parked at the kerb. Wearing a collar.
('d0910000-0000-4000-8000-000000000009', null, 'Civil Lines',
 28.6800, 77.2250, 'seen', '/dogs/delhi/red-under-tables.jpg',
 'medium', 'Red brown', true, false, 'unknown', 'unknown',
 1, '2026-09-03 12:10:00+05:30', '2026-09-03 12:10:00+05:30', '2026-09-03 12:22:00+05:30'),

-- 10. White dog with a tan and black marked ear, lying on a stone floor,
--     watching the camera.
('d0910000-0000-4000-8000-000000000010', null, 'Yamuna Vihar',
 28.6970, 77.2760, 'seen', '/dogs/delhi/white-stone-floor.jpg',
 'medium', 'White', true, false, 'unknown', 'unknown',
 1, '2026-09-06 18:20:00+05:30', '2026-09-06 18:20:00+05:30', '2026-09-06 18:33:00+05:30'),

-- 11. Brown dog lying on a concrete forecourt; a second dog asleep on the
--     step behind it. Two animals in the frame, one record — the one in
--     focus. The other is a sighting nobody has filed.
('d0910000-0000-4000-8000-000000000011', null, 'Paharganj',
 28.6450, 77.2120, 'seen', '/dogs/delhi/two-on-concrete.jpg',
 'medium', 'Brown', true, false, 'unknown', 'unknown',
 1, '2026-08-20 19:05:00+05:30', '2026-08-20 19:05:00+05:30', '2026-08-20 19:18:00+05:30'),

-- 12. Fawn dog with a greying muzzle standing on paving outside a café.
('d0910000-0000-4000-8000-000000000012', null, 'Sarojini Nagar',
 28.5760, 77.1960, 'seen', '/dogs/delhi/tan-outside-cafe.jpg',
 'medium', 'Fawn', true, false, 'unknown', 'unknown',
 1, '2026-08-22 10:45:00+05:30', '2026-08-22 10:45:00+05:30', '2026-08-22 10:57:00+05:30'),

-- 13. Tan dog sitting upright on a granite step, mouth open; a pale dog
--     asleep behind it.
('d0910000-0000-4000-8000-000000000013', null, 'Punjabi Bagh',
 28.6690, 77.1310, 'seen', '/dogs/delhi/tan-granite-step.jpg',
 'medium', 'Tan', true, false, 'unknown', 'unknown',
 1, '2026-08-25 12:35:00+05:30', '2026-08-25 12:35:00+05:30', '2026-08-25 12:48:00+05:30'),

-- 14. Tan dog asleep on a tiled step, a bicycle propped in the foreground.
('d0910000-0000-4000-8000-000000000014', null, 'Pitampura',
 28.6980, 77.1310, 'seen', '/dogs/delhi/asleep-by-bicycle.jpg',
 'medium', 'Tan', true, false, 'unknown', 'unknown',
 1, '2026-08-28 09:50:00+05:30', '2026-08-28 09:50:00+05:30', '2026-08-28 10:02:00+05:30'),

-- 15. Tan dog walking along a road between parked cars, early evening.
('d0910000-0000-4000-8000-000000000015', null, 'Preet Vihar',
 28.6410, 77.2940, 'seen', '/dogs/delhi/walking-at-dusk.jpg',
 'medium', 'Tan', true, false, 'unknown', 'unknown',
 1, '2026-08-31 18:40:00+05:30', '2026-08-31 18:40:00+05:30', '2026-08-31 18:52:00+05:30'),

-- 16. Brindle dog asleep on concrete beside an air-conditioning unit at
--     night, next to a potted plant.
('d0910000-0000-4000-8000-000000000016', null, 'Kashmere Gate',
 28.6670, 77.2290, 'seen', '/dogs/delhi/beside-ac-unit.jpg',
 'medium', 'Brindle', true, false, 'unknown', 'unknown',
 1, '2026-09-01 22:15:00+05:30', '2026-09-01 22:15:00+05:30', '2026-09-01 22:26:00+05:30'),

-- 17. Tan dog crossing a residential street past parked cars.
('d0910000-0000-4000-8000-000000000017', null, 'Shastri Park',
 28.6790, 77.2620, 'seen', '/dogs/delhi/crossing-street.jpg',
 'medium', 'Tan', true, false, 'unknown', 'unknown',
 1, '2026-09-03 07:55:00+05:30', '2026-09-03 07:55:00+05:30', '2026-09-03 08:07:00+05:30'),

-- 18. Black-and-white dog standing beside a snake plant on wet paving,
--     white-tipped tail curled up.
('d0910000-0000-4000-8000-000000000018', null, 'Najafgarh',
 28.6090, 76.9800, 'seen', '/dogs/delhi/black-white-snake-plant.jpg',
 'medium', 'Black and white', true, false, 'unknown', 'unknown',
 1, '2026-09-04 16:30:00+05:30', '2026-09-04 16:30:00+05:30', '2026-09-04 16:42:00+05:30'),

-- 19. Brown dog with a dark saddle standing beside a bamboo ladder,
--     looking back at the camera.
('d0910000-0000-4000-8000-000000000019', null, 'Malviya Nagar',
 28.5350, 77.2060, 'seen', '/dogs/delhi/brown-by-ladder.jpg',
 'medium', 'Brown and black', true, false, 'unknown', 'unknown',
 1, '2026-09-06 11:20:00+05:30', '2026-09-06 11:20:00+05:30', '2026-09-06 11:33:00+05:30'),

-- 20. Pale tan dog walking past a shuttered shop. Two feeding bowls on a
--     stand are visible on the ground beside it — somebody puts food out
--     here. That is worth knowing and is NOT recorded as a feeding: this
--     file has no evidence of who, or when, and feed_count is a claim
--     about a person's action rather than about the animal.
('d0910000-0000-4000-8000-000000000020', null, 'Chandni Chowk',
 28.6465, 77.2295, 'seen', '/dogs/delhi/pale-by-bowls.jpg',
 'medium', 'Pale tan', true, false, 'unknown', 'unknown',
 1, '2026-09-07 09:15:00+05:30', '2026-09-07 09:15:00+05:30', '2026-09-07 09:28:00+05:30')

on conflict (id) do update set
  zone       = excluded.zone,
  lat        = excluded.lat,
  lng        = excluded.lng,
  cover_photo= excluded.cover_photo,
  size       = excluded.size,
  color      = excluded.color,
  first_seen = excluded.first_seen,
  last_seen  = excluded.last_seen;

-- ────────────────────────────────────────────────────────────────
-- The same twenty, as sightings.
--
-- The map reads `dogs`; the sightings feed reads `sightings`. Seeding only
-- the first put twenty animals on the map that the feed had never heard of,
-- and left each profile claiming sightings_count = 1 with no row behind it.
--
-- Derived from the rows above rather than typed out again, so the place, the
-- photograph and the time cannot drift apart from the animal they belong to.
-- The id is the dog's with one digit changed, which keeps it deterministic
-- and re-runnable without a second lookup table.
--
-- reporter_name stays NULL. These photographs have no reporter to name, and
-- the feed says "Reported anonymously" rather than inventing somebody — an
-- account is not needed to report, so that is an ordinary and true state.
-- likes stays 0 and mood_tags empty for the same reason: engagement that
-- did not happen is not seeded.
insert into sightings (
  id, dog_id, reporter_name, photo_url, lat, lng, zone,
  nickname, notes, trust_score, likes, status, created_at
)
select
  overlay(d.id::text placing '1' from 8 for 1)::uuid,
  d.id,
  null,
  d.cover_photo,
  d.lat,
  d.lng,
  d.zone,
  null,
  null,
  50,
  0,
  'live',
  d.created_at
from dogs d
where d.id::text like 'd0910000-0000-4000-8000-%'
on conflict (id) do update set
  dog_id     = excluded.dog_id,
  photo_url  = excluded.photo_url,
  lat        = excluded.lat,
  lng        = excluded.lng,
  zone       = excluded.zone,
  status     = excluded.status,
  created_at = excluded.created_at;

-- sightings_count is a stored count, so it is set from what is actually in
-- the table rather than left at the 1 the insert above assumed.
update dogs d
   set sightings_count = (select count(*) from sightings s where s.dog_id = d.id)
 where d.id::text like 'd0910000-0000-4000-8000-%';

-- What went in, and where it landed once boundaries are loaded.
--
-- The join is LEFT and the district is aggregated rather than picked, so
-- two failure modes show up here instead of hiding: a point that falls in
-- NO district (a gap between polygons, which happened once) prints
-- "outside every district", and a point sitting exactly on a shared
-- boundary matches TWO and prints both. Either means the coordinate is
-- wrong, or at least not where you think it is.
select d.zone,
       d.color,
       to_char(d.last_seen at time zone 'Asia/Kolkata', 'DD Mon HH24:MI') as seen,
       coalesce(string_agg(w.ward_name, ' + ' order by w.ward_name),
                'outside every district')                                as district
  from dogs d
  left join wards w
    on w.level = 'district'
   and st_contains(w.geom, st_setsrid(st_point(d.lng, d.lat), 4326))
 where d.id::text like 'd0910000-0000-4000-8000-%'
 group by d.id, d.zone, d.color, d.last_seen
 order by d.last_seen;
