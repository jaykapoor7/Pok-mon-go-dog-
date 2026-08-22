-- ════════════════════════════════════════════════════════════════
-- Seed: real Delhi street-dog photos, distributed across the city.
-- Photos live in public/seed-dogs/dogN.jpg (served at /seed-dogs/dogN.jpg).
-- Run ONCE. Safe to re-run — it no-ops if the seed already exists.
-- ════════════════════════════════════════════════════════════════
do $$
declare r record; v_id uuid;
begin
  if exists (select 1 from dogs where cover_photo like '/seed-dogs/%') then
    raise notice 'Delhi dog seed already present — skipping.';
    return;
  end if;

  for r in select * from (values
    ('Hauz Khas',       28.5494, 77.2001, 'injured',    true,  'dog1'),
    ('Saket',           28.5245, 77.2066, 'seen',       false, 'dog2'),
    ('Rohini',          28.7412, 77.0669, 'hungry',     false, 'dog3'),
    ('Vasant Kunj',     28.5200, 77.1591, 'injured',    true,  'dog4'),
    ('Dwarka',          28.5921, 77.0460, 'sterilised', false, 'dog5'),
    ('Karol Bagh',      28.6512, 77.1906, 'vaccinated', false, 'dog6'),
    ('Lajpat Nagar',    28.5677, 77.2433, 'hungry',     false, 'dog7'),
    ('Connaught Place', 28.6315, 77.2167, 'seen',       false, 'dog8'),
    ('Nehru Place',     28.5494, 77.2510, 'injured',    true,  'dog9')
  ) as t(zone, lat, lng, status, needs_help, f)
  loop
    insert into dogs (zone, lat, lng, status, cover_photo, needs_help, species, first_seen, last_seen)
    values (r.zone, r.lat, r.lng, r.status::dog_status, '/seed-dogs/'||r.f||'.jpg', r.needs_help, 'dog', now(), now())
    returning id into v_id;

    insert into sightings (dog_id, photo_url, lat, lng, zone, status, reporter_name)
    values (v_id, '/seed-dogs/'||r.f||'.jpg', r.lat, r.lng, r.zone, 'live', 'Jay');
  end loop;

  raise notice 'Seeded 9 Delhi street dogs.';
end $$;
