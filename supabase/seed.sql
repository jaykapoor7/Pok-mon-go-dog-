-- ════════════════════════════════════════════════════════════════
-- StrayPaw Delhi — OPTIONAL starter data
--
-- Run AFTER schema.sql if you'd like the map to launch with a handful of
-- real dog records around Delhi instead of an empty map. Every row here is a
-- genuine database record, so the live stats stay honest — they simply start
-- from these and grow as people contribute.
--
-- Safe to skip entirely. Safe to delete these rows later
-- (they all use names prefixed so you can find them):  where name like '%'.
-- ════════════════════════════════════════════════════════════════

-- Partner NGOs (shown on the dashboard).
insert into ngos (name, area, verified, dogs_helped) values
  ('Friendicoes SECA',            'Defence Colony', true, 3890),
  ('Sanjay Gandhi Animal Care',   'Raja Garden',    true, 2100),
  ('Delhi Paws Trust',            'South Delhi',    true, 1240),
  ('Street Dogs of Rohini',       'Rohini',         false, 760)
on conflict do nothing;

-- A few real seed dogs across the city.
insert into dogs (name, zone, lat, lng, status, cover_photo, size, color,
                  is_friendly, needs_help, sterilised, vaccinated, trust_score,
                  sightings_count, feed_count, first_seen, last_seen)
values
  ('Bruno',  'Connaught Place', 28.6315, 77.2167, 'vaccinated',
   'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&q=80&auto=format&fit=crop',
   'medium','Golden', true,false,true,true,  88, 6, 9, now() - interval '120 days', now() - interval '2 days'),
  ('Laali',  'Hauz Khas',       28.5494, 77.2001, 'sterilised',
   'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=800&q=80&auto=format&fit=crop',
   'small','Brown', true,false,true,false,   81, 4, 5, now() - interval '90 days',  now() - interval '5 days'),
  ('Sheru',  'Lajpat Nagar',    28.5677, 77.2430, 'hungry',
   'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&q=80&auto=format&fit=crop',
   'large','Black & Tan', true,true,false,true, 72, 3, 1, now() - interval '40 days', now() - interval '1 days'),
  ('Moti',   'Karol Bagh',      28.6519, 77.1909, 'injured',
   'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&q=80&auto=format&fit=crop',
   'medium','White', false,true,false,false,  66, 2, 0, now() - interval '15 days', now() - interval '6 hours'),
  ('Goldie', 'Saket',           28.5245, 77.2110, 'vaccinated',
   'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=800&q=80&auto=format&fit=crop',
   'medium','Golden', true,false,true,true,   90, 7, 12, now() - interval '160 days', now() - interval '3 days'),
  ('Kaalu',  'Chandni Chowk',   28.6506, 77.2303, 'seen',
   'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=800&q=80&auto=format&fit=crop',
   'medium','Black', true,false,false,false,  58, 2, 2, now() - interval '25 days', now() - interval '4 days'),
  ('Rani',   'Dwarka',          28.5921, 77.0460, 'sterilised',
   'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&q=80&auto=format&fit=crop',
   'small','Brindle', true,false,true,true,   85, 5, 6, now() - interval '75 days', now() - interval '8 days'),
  ('Tiger',  'Rohini',          28.7361, 77.0667, 'hungry',
   'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80&auto=format&fit=crop',
   'large','Brown', true,true,false,true,     69, 3, 1, now() - interval '30 days', now() - interval '12 hours'),
  ('Coco',   'Greater Kailash', 28.5494, 77.2424, 'vaccinated',
   'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=800&q=80&auto=format&fit=crop',
   'small','White', true,false,true,true,     87, 6, 8, now() - interval '110 days', now() - interval '1 days'),
  ('Raja',   'Mayur Vihar',     28.6092, 77.2925, 'seen',
   'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&q=80&auto=format&fit=crop',
   'medium','Black & Tan', true,false,false,true, 63, 2, 3, now() - interval '20 days', now() - interval '2 days'),
  ('Snowy',  'Vasant Kunj',     28.5200, 77.1580, 'sterilised',
   'https://images.unsplash.com/photo-1444212477490-ca407925329e?w=800&q=80&auto=format&fit=crop',
   'small','White', true,false,true,false,    79, 4, 4, now() - interval '65 days', now() - interval '7 days'),
  ('Bablu',  'Pitampura',       28.6986, 77.1325, 'hungry',
   'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=800&q=80&auto=format&fit=crop',
   'medium','Brown', true,true,false,false,   61, 3, 1, now() - interval '18 days', now() - interval '1 days');

-- A sighting per seed dog so profiles + the feed aren't empty.
insert into sightings (dog_id, reporter_name, photo_url, lat, lng, zone, nickname, mood_tags, notes, trust_score)
select d.id, 'StrayPaw Team', d.cover_photo, d.lat, d.lng, d.zone, d.name,
       case when d.needs_help then array['hungry'] else array['friendly'] end,
       'Seed sighting — verified by the StrayPaw team.', d.trust_score
from dogs d;

-- Vaccination / sterilisation records that back the dog flags.
insert into vaccinations (dog_id, vaccine, administered_by, date)
select id, 'Anti-Rabies (ARV)', 'Friendicoes SECA', current_date - 30
from dogs where vaccinated;

insert into sterilisations (dog_id, status, performed_by, date)
select id, 'completed', 'Delhi Paws Trust', current_date - 45
from dogs where sterilised;
