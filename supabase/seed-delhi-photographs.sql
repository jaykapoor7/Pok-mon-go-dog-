-- ════════════════════════════════════════════════════════════════
-- StrayPaw, five photographed Delhi street dogs.
--
-- WHAT IS REAL HERE AND WHAT IS NOT. READ THIS BEFORE RUNNING IT.
--
-- REAL: the five photographs. Each is a photograph of an actual street dog
-- in Delhi, and the coat, build, collar and setting described below are
-- what is visible in the frame.
--
-- ASSIGNED: the coordinates and the timestamps. One locality per district,
-- deliberately, so the five sit in five different Delhi districts rather
-- than piling into South — but that spread is a presentation choice, not a
-- finding. The photographs did not
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
-- Sterilisation and vaccination are 'unknown' for all five, which is not a
-- placeholder, it is the finding: nobody has examined these animals. Two of
-- them wear a collar, which in Delhi can mean an owned dog, a community-fed
-- dog, or an ABC programme's marker. It is not evidence of sterilisation
-- and is not recorded as any.
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
 1, '2026-09-05 17:45:00+05:30', '2026-09-05 17:45:00+05:30', '2026-09-05 17:58:00+05:30')

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
