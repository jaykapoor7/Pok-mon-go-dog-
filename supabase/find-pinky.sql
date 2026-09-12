-- ════════════════════════════════════════════════════════════════
-- Which record is Pinky?
--
-- The landing hero leads with the animal named "Pinky" when she is on the
-- record, and falls back to the newest photographed animal when she is not
-- (src/components/site/Hero.tsx:33). So the hero shows the wrong dog for
-- exactly two reasons: either no row is named Pinky, or the row that IS
-- named Pinky is not her.
--
-- Pinky is white, with a pink collar. She is not in any seed file in this
-- folder — the twenty photographed Delhi animals all have name = null — so
-- she is a live record somebody created through the site, and the fix has
-- to happen in the database rather than in a seed.
--
-- READ-ONLY UNTIL THE LAST SECTION. Run sections 1-3, look at what comes
-- back, then uncomment the one UPDATE in section 4 with the right id in it.
-- Nothing here changes anything on its own.
-- ════════════════════════════════════════════════════════════════


-- ── 1. Is anything named Pinky, however it was typed? ───────────
-- Matches 'Pinky', 'pinky', ' Pinky ', 'PINKY'. If this returns more than
-- one row, that is the bug: the hero takes the first match it finds.

select id, name, color, zone, cover_photo, sightings_count,
       created_at, last_seen
  from dogs
 where lower(btrim(coalesce(name, ''))) = 'pinky'
 order by created_at;


-- ── 2. Anything close to it? ────────────────────────────────────
-- A trailing space or a typo ('Pinki', 'Pinkey') would not match section 1
-- but is still meant to be her.

select id, name, color, zone, cover_photo, created_at
  from dogs
 where name is not null
   and name ilike '%pink%'
 order by created_at;


-- ── 3. The candidates, by what we know about her ────────────────
-- White animal, and/or a sighting reported under Aishwarya's name. Open
-- each cover_photo and look for the pink collar; the photograph decides
-- this, not the row.

select d.id,
       d.name,
       d.color,
       d.zone,
       d.cover_photo,
       d.created_at,
       string_agg(distinct s.reporter_name, ', ') as reported_by,
       count(s.id)                                as sightings
  from dogs d
  left join sightings s on s.dog_id = d.id
 where coalesce(d.cover_photo, '') <> ''
   and (
         d.color ilike '%white%'
      or d.color ilike '%cream%'
      or s.reporter_name ilike 'aishwarya%'
   )
 group by d.id
 order by d.created_at desc;


-- ── 4. Set it ───────────────────────────────────────────────────
-- Paste the id you picked from section 3 into BOTH statements below and
-- uncomment them. The first clears the name off any impostor so there is
-- exactly one Pinky; the second names the right animal and records the
-- coat. Her collar is not a schema field — colour is the coat — so the
-- collar belongs in a sighting note rather than here.

-- update dogs
--    set name = null
--  where lower(btrim(coalesce(name, ''))) = 'pinky'
--    and id <> 'PASTE-THE-RIGHT-ID-HERE';

-- update dogs
--    set name  = 'Pinky',
--        color = 'White'
--  where id = 'PASTE-THE-RIGHT-ID-HERE';


-- ── 5. Check ────────────────────────────────────────────────────
-- Exactly one row, white, with a photograph. That is what the hero reads.

select id, name, color, zone, cover_photo
  from dogs
 where lower(btrim(coalesce(name, ''))) = 'pinky';
