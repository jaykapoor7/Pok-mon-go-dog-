-- ════════════════════════════════════════════════════════════════════
-- Make the sighting photo optional.
--
-- A photo was required to file a sighting, which meant anybody who could
-- not or would not take one could not report at all. That is the highest
-- friction point in the core workflow: the animal is in front of the
-- person, and the product refuses the report. A located, described
-- sighting without a photo is still evidence, and a field team can add
-- the photograph later.
--
-- Only the NOT NULL constraint changes. report_sighting and
-- report_sighting_for_org already take p_photo_url as plain text, so they
-- accept null once the column allows it, and dogs.cover_photo was already
-- nullable and is set with coalesce.
--
-- Idempotent and non-destructive: existing rows and photos are untouched.
-- ════════════════════════════════════════════════════════════════════

alter table sightings alter column photo_url drop not null;
