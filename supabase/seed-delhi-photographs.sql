-- ════════════════════════════════════════════════════════════════
-- StrayPaw, ten photographed Delhi street dogs.
--
-- WHAT IS REAL HERE AND WHAT IS NOT. READ THIS BEFORE RUNNING IT.
--
-- REAL: the ten photographs. Each is a photograph of an actual street dog
-- in Delhi, and the coat, build, collar and setting described below are
-- what is visible in the frame.
--
-- ASSIGNED: the coordinates and the timestamps. One locality per district,
-- deliberately, so the ten sit across nine different districts rather than
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
-- Sterilisation and vaccination are 'unknown' for all ten, which is not a
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
 1, '2026-09-06 18:20:00+05:30', '2026-09-06 18:20:00+05:30', '2026-09-06 18:33:00+05:30')

on conflict (id) do update set
  zone       = excluded.zone,
  lat        = excluded.lat,
  lng        = excluded.lng,
  cover_photo= excluded.cover_photo,
  size       = excluded.size,
  color      = excluded.color,
  first_seen = excluded.first_seen,
  last_seen  = excluded.last_seen;

-- What went in, and where it landed once boundaries are loaded.
select d.zone,
       d.color,
       to_char(d.last_seen at time zone 'Asia/Kolkata', 'DD Mon HH24:MI') as seen,
       coalesce(w.ward_name, w.city, 'no district loaded')                as district
  from dogs d
  left join wards w
    on w.level = 'district'
   and st_contains(w.geom, st_setsrid(st_point(d.lng, d.lat), 4326))
 where d.id::text like 'd0910000-0000-4000-8000-%'
 order by d.last_seen;
