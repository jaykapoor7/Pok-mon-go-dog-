-- ════════════════════════════════════════════════════════════════
-- Why does the site say 66 animals on record?
--
-- SHORT ANSWER: not because of the SQL you have not run yet. The landing
-- count is `select count(*) from dogs` with no filter at all
-- (src/lib/data.ts:162). Nothing in feedback.sql, demo-mode.sql,
-- ward-density.sql or the district files touches that number, and
-- add-two-more-delhi-dogs.sql would RAISE it by two, not lower it.
--
-- The number is high because two of the older seed files are NOT
-- idempotent and there is stock photography in the table:
--
--   supabase/seed.sql            DELETED from the repo now, but it may
--                                already have run against your database.
--                                It inserted 12 invented animals — Bruno,
--                                Laali, Sheru, Moti, Goldie, Kaalu, Rani,
--                                Tiger, Coco, Raja, Snowy, Bablu — with
--                                UNSPLASH STOCK PHOTO urls, no fixed ids
--                                and no on-conflict, so every run added
--                                twelve more. It also backfilled a
--                                "StrayPaw Team" sighting onto EVERY dog
--                                in the table, including the real ones,
--                                which is why some animals may show two
--                                sightings for one photograph.
--   supabase/seed-delhi-dogs.sql 9 animals from /seed-dogs/*.jpg. SAFE —
--                                it opens with a guard that returns early
--                                if any /seed-dogs/ row already exists,
--                                and the same 9 are embedded in
--                                RUN-ALL-MIGRATIONS.sql. I said earlier
--                                that this one duplicated. It does not.
--                                Only seed.sql does.
--   supabase/seed-delhi-photographs.sql + add-two-more-delhi-dogs.sql
--                                22 real photographs, fixed ids, safe to
--                                re-run. These are the ones to keep.
--
-- So the stock-photo animals are the problem, not the count. A register
-- whose whole claim is "this is a real animal somebody saw" cannot carry
-- twelve Unsplash pictures of dogs in other countries.
--
-- SECTIONS 1-3 ONLY READ. Section 4 deletes, and is commented out. Read
-- what comes back before you uncomment anything.
-- ════════════════════════════════════════════════════════════════


-- ── 1. The census: where did each row come from? ────────────────

select case
         when cover_photo like '/dogs/delhi/%'        then '1. real Delhi photographs (keep)'
         when cover_photo like '/seed-dogs/%'         then '2. old /seed-dogs loop (not idempotent)'
         when cover_photo like '%unsplash.com%'       then '3. UNSPLASH STOCK PHOTOS (fake)'
         when coalesce(cover_photo, '') = ''          then '4. no photograph'
         else                                              '5. everything else (real reports?)'
       end                                    as origin,
       count(*)                               as animals,
       min(created_at)                        as first_created,
       max(created_at)                        as last_created
  from dogs
 group by 1
 order by 1;


-- ── 2. Duplicates from the non-idempotent files ─────────────────
-- Same photograph on more than one row means that file was run more than
-- once. The count here is how many extra rows each repeat left behind.

select cover_photo,
       count(*)        as rows_with_this_photo,
       count(*) - 1    as duplicates,
       array_agg(id order by created_at) as ids
  from dogs
 where coalesce(cover_photo, '') <> ''
 group by cover_photo
having count(*) > 1
 order by count(*) desc, cover_photo;


-- ── 3. The stock-photo animals, by name ─────────────────────────
-- These are the twelve from seed.sql. Check the list before deleting:
-- if somebody has since filed a real sighting against one of these ids,
-- deleting the animal takes the sighting with it.

select d.id, d.name, d.zone, d.cover_photo,
       count(s.id)                                          as sightings,
       count(s.id) filter (where s.photo_url not like '%unsplash%') as non_stock_sightings
  from dogs d
  left join sightings s on s.dog_id = d.id
 where d.cover_photo like '%unsplash.com%'
 group by d.id
 order by d.name;


-- ── 4. Removing them ────────────────────────────────────────────
-- Uncomment ONE block at a time and re-run section 1 in between.
--
-- 4a. The stock photography. Sightings go first because sightings.dog_id
--     is `on delete set null` — deleting the animal would orphan the
--     sighting into the feed rather than remove it.

-- delete from sightings
--  where dog_id in (select id from dogs where cover_photo like '%unsplash.com%');
-- delete from dogs
--  where cover_photo like '%unsplash.com%';

-- 4b. Duplicate rows left by re-running the loop seeds. Keeps the OLDEST
--     row for each photograph — the one anything else is most likely to
--     already point at — and removes the copies.

-- with ranked as (
--   select id,
--          row_number() over (partition by cover_photo order by created_at, id) as n
--     from dogs
--    where coalesce(cover_photo, '') <> ''
-- )
-- delete from sightings where dog_id in (select id from ranked where n > 1);
-- with ranked as (
--   select id,
--          row_number() over (partition by cover_photo order by created_at, id) as n
--     from dogs
--    where coalesce(cover_photo, '') <> ''
-- )
-- delete from dogs where id in (select id from ranked where n > 1);


-- ── 5. What the landing page will say afterwards ────────────────

select (select count(*) from dogs)                                     as animals_on_record,
       (select count(*) from dogs
         where sterilisation_status is null
            or sterilisation_status = 'unknown')                        as never_checked,
       (select count(*) from dogs where cover_photo like '%unsplash%')  as stock_photos_left,
       (select count(*) from sightings)                                 as sightings_in_feed;


-- ── 6. The duplicate "StrayPaw Team" sightings ──────────────────
-- seed.sql backfilled one sighting onto every dog in the table, so a
-- photographed animal that already had its own sighting ended up with
-- two for the same photograph. This finds them.

select d.id, d.zone, d.cover_photo, count(s.id) as sightings,
       string_agg(s.reporter_name, ' / ' order by s.created_at) as reporters
  from dogs d
  join sightings s on s.dog_id = d.id
 where d.id::text like 'd0910000-0000-4000-8000-%'
 group by d.id
having count(s.id) > 1
 order by d.zone;

-- And removes only the backfilled one, keeping the deterministic
-- sighting that the-22-dogs.sql creates and maintains.

-- delete from sightings
--  where reporter_name = 'StrayPaw Team'
--    and dog_id in (select id from dogs
--                    where id::text like 'd0910000-0000-4000-8000-%');
-- update dogs d
--    set sightings_count = (select count(*) from sightings s where s.dog_id = d.id)
--  where d.id::text like 'd0910000-0000-4000-8000-%';
