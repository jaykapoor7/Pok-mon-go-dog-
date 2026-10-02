-- Community actions must acknowledge a real dog write, including rejected limits.
-- Keep the public quick-action contract and existing data unchanged.
create or replace function public.log_seen(p_dog_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists (select 1 from public.dogs d where d.id=p_dog_id and d.species='dog' and (not coalesce(d.is_demo,false) or d.ngo_id=public.my_ngo())) then
    raise exception 'This dog record is unavailable.';
  end if;
  if not public.check_rate_limit(p_dog_id::text,'log_seen',20,600) then
    raise exception 'Too many sightings on this dog just now. Please try again shortly.';
  end if;
  update public.dogs set last_seen=now(), sightings_count=coalesce(sightings_count,0)+1 where id=p_dog_id;
end $$;

create or replace function public.log_feed(p_dog_id uuid,p_reporter_name text default null,p_food_type text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists (select 1 from public.dogs d where d.id=p_dog_id and d.species='dog' and (not coalesce(d.is_demo,false) or d.ngo_id=public.my_ngo())) then
    raise exception 'This dog record is unavailable.';
  end if;
  if not public.check_rate_limit(p_dog_id::text,'log_feed',10,600) then
    raise exception 'Too many meals on this dog just now. Please try again shortly.';
  end if;
  insert into public.feed_events(dog_id,reporter_name,food_type) values(p_dog_id,p_reporter_name,p_food_type);
  update public.dogs set feed_count=coalesce(feed_count,0)+1,last_fed_at=now(),last_seen=now() where id=p_dog_id;
end $$;

create or replace function public.add_comment(p_dog_id uuid,p_body text,p_reporter_name text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists (select 1 from public.dogs d where d.id=p_dog_id and d.species='dog' and (not coalesce(d.is_demo,false) or d.ngo_id=public.my_ngo())) then
    raise exception 'This dog record is unavailable.';
  end if;
  if p_body is null or btrim(p_body)='' then raise exception 'A comment needs some text.'; end if;
  if not public.check_rate_limit(p_dog_id::text,'add_comment',10,600) then
    raise exception 'Too many comments on this dog just now. Please try again shortly.';
  end if;
  insert into public.comments(dog_id,reporter_name,body) values(p_dog_id,p_reporter_name,p_body);
end $$;
-- CREATE OR REPLACE preserves the existing execute grants.

