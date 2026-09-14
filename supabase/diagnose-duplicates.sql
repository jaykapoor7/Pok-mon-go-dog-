-- ════════════════════════════════════════════════════════════════════
-- "Records says 87, the feed says 100+, and some posts are doubled."
--
-- READ-ONLY. Every statement here is a select; nothing is changed. Paste
-- the whole file into the Supabase SQL editor and read the results in
-- order. Section 5 is the only one that answers the duplicate question;
-- 1 to 4 explain the 87-versus-100 arithmetic, which is probably not a
-- bug at all.
-- ════════════════════════════════════════════════════════════════════


-- ── 1. The two numbers, side by side ────────────────────────────────
-- The feed counts live sightings. The console counts animals it can place
-- on a map. These are different questions, so they are allowed to differ.

select
  (select count(*) from sightings where status = 'live')                       as live_sightings,
  (select count(*) from sightings where status = 'pending')                    as pending_sightings,
  (select count(*) from dogs)                                                  as animals_total,
  (select count(*) from dogs
    where lat is not null and lng is not null and not (lat = 0 and lng = 0))   as animals_with_a_location,
  (select count(*) from dogs where lat = 0 and lng = 0)                        as animals_at_zero_zero,
  (select count(*) from dogs where ngo_id is not null)                         as animals_registered_by_an_org;

-- Expect: live_sightings >= animals_total. Every approved sighting that
-- nobody matched becomes its own animal, so the gap is the number of
-- observations somebody linked to an animal already on file — repeat
-- sightings, which is the product working.
--
-- animals_at_zero_zero is the one to watch. register_org_animal() writes
-- 0,0 when an organisation registers an animal without coordinates, and
-- every map and every located list drops those rows. They are on file and
-- invisible.


-- ── 2. Where the gap actually is ────────────────────────────────────
select identity_method, count(*) as sightings
  from sightings
 where status = 'live'
 group by identity_method
 order by count(*) desc;

-- 'unlinked' (or null) each made their own animal.
-- 'reporter_selected' / 'reviewer_confirmed' attached to an existing one:
-- these are exactly the rows that make the feed longer than the register.


-- ── 3. Animals carrying more than one sighting ──────────────────────
select count(*) as animals_seen_more_than_once
  from (select dog_id from sightings
         where status = 'live' and dog_id is not null
         group by dog_id having count(*) > 1) t;


-- ── 4. Sightings that never became an animal ────────────────────────
select status, count(*) from sightings where dog_id is null group by status;


-- ── 5. THE DUPLICATES ───────────────────────────────────────────────
-- A photo path is a uuid generated per upload, so the same photo_url on
-- two rows means one submission was written twice. This is the test.

select photo_url,
       count(*)              as copies,
       min(created_at)       as first_written,
       max(created_at)       as last_written,
       max(created_at) - min(created_at) as apart,
       array_agg(id order by created_at) as sighting_ids
  from sightings
 where photo_url is not null and photo_url <> ''
 group by photo_url
having count(*) > 1
 order by count(*) desc, max(created_at) desc;

-- How to read "apart":
--   a few seconds   -> a double submission (two POSTs from one form)
--   identical       -> the same statement ran twice, i.e. a re-run
--   days apart      -> somebody genuinely reused a photo; not a duplicate


-- ── 6. The same animal, twice, next to each other ───────────────────
-- Catches duplicates that came in with different photographs: same place,
-- same minute.

select a.id, b.id, a.zone, a.created_at, b.created_at,
       round((a.lat - b.lat)::numeric, 6) as dlat,
       round((a.lng - b.lng)::numeric, 6) as dlng
  from sightings a
  join sightings b
    on b.created_at > a.created_at
   and b.created_at < a.created_at + interval '2 minutes'
   and abs(a.lat - b.lat) < 0.00005
   and abs(a.lng - b.lng) < 0.00005
 where a.status = 'live' and b.status = 'live'
 order by a.created_at desc;


-- ── 7. Did a seed run twice? ────────────────────────────────────────
-- The Delhi seed guards itself, so this should be 9 and 9. Anything
-- higher means it was inserted by hand or a guard was edited out.

select count(*) as seeded_dogs from dogs where cover_photo like '/seed-dogs/%';
select count(*) as seeded_sightings from sightings where photo_url like '/seed-dogs/%';
