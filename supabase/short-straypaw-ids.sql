-- Short, human-facing StrayPaw IDs.
-- UUID remains the database identity. Existing links continue to use UUIDs.
-- `code` remains the NGO/source identifier.
--
-- Examples: SP-D-7K4M2Q, SP-C-19AF3X, SP-CT-82P1KD.
-- Six characters gives >2.1 billion suffix combinations in base36 while
-- keeping the ID readable. Collisions are retried against the unique index.

create or replace function straypaw_species_code(value text)
returns text language sql immutable as $$
  select case lower(coalesce(value, 'animal'))
    when 'dog' then 'D'
    when 'cat' then 'C'
    when 'cattle' then 'CT'
    when 'cow' then 'CT'
    when 'bull' then 'CT'
    when 'horse' then 'H'
    when 'donkey' then 'DN'
    when 'equine' then 'E'
    else 'A'
  end
$$;

create or replace function short_straypaw_suffix()
returns text language plpgsql volatile as $$
declare
  alphabet constant text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  output text := '';
  i integer;
begin
  for i in 1..6 loop
    output := output || substr(alphabet, 1 + floor(random() * 36)::integer, 1);
  end loop;
  return output;
end $$;

-- Existing long IDs are display identifiers only, so they can safely be
-- replaced. UUID foreign keys and /dog/<uuid> links are untouched.
do $$
declare
  animal record;
  candidate text;
begin
  for animal in
    select id, species from dogs
    where straypaw_id is null
       or btrim(straypaw_id) = ''
       or straypaw_id ~ '^SPA-[A-Z]{3}-[0-9A-F]{32}$'
  loop
    loop
      candidate := 'SP-' || straypaw_species_code(animal.species) || '-' || short_straypaw_suffix();
      exit when not exists (select 1 from dogs where straypaw_id = candidate);
    end loop;
    update dogs set straypaw_id = candidate where id = animal.id;
  end loop;
end $$;

create unique index if not exists dogs_straypaw_id_idx
  on dogs (straypaw_id) where straypaw_id is not null;

create or replace function assign_straypaw_id()
returns trigger language plpgsql as $$
declare
  candidate text;
begin
  if new.straypaw_id is null or btrim(new.straypaw_id) = '' then
    loop
      candidate := 'SP-' || straypaw_species_code(new.species) || '-' || short_straypaw_suffix();
      exit when not exists (select 1 from dogs where straypaw_id = candidate);
    end loop;
    new.straypaw_id := candidate;
  end if;
  return new;
end $$;

drop trigger if exists dogs_assign_straypaw_id on dogs;
create trigger dogs_assign_straypaw_id before insert on dogs
for each row execute function assign_straypaw_id();
