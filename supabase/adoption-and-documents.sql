-- ════════════════════════════════════════════════════════════════
-- StrayPaw, two additions.
--
-- 1. ADOPTION LISTINGS
--    An adoption is an episode with its own life, opened by an
--    organisation, then placed or withdrawn. Keeping it off the animal
--    record means a dog that was listed once and stayed on the street
--    does not carry a stale "adoptable" flag forever, and the listing
--    can be closed without touching the animal's history.
--
-- 2. DOCUMENTS
--    Almost no organisation starts digital: the real record is a ward
--    register page, an ABC ledger, a WhatsApp thread. Import already
--    accepts photographs of those, but they were only ever filed as a
--    sighting photo, so the original became unfindable the moment it
--    scrolled off. A document row keeps the scan addressable, optionally
--    attached to the animal it describes, so a transcribed entry can be
--    checked against the page it came from.
--
-- Idempotent. Safe to run more than once.
-- Depends on: schema.sql, partner-onboarding.sql (my_ngo, is_ngo_member).
-- ════════════════════════════════════════════════════════════════

-- ── 1. Adoption listings ────────────────────────────────────────────

create table if not exists adoption_listings (
  id            uuid primary key default uuid_generate_v4(),
  dog_id        uuid not null references dogs(id) on delete cascade,
  ngo_id        uuid not null,
  status        text not null default 'open'
                check (status in ('open', 'placed', 'withdrawn')),
  summary       text,
  -- Free text rather than an enum: what an adopter needs to know varies,
  -- and a fixed vocabulary here would push people into the wrong box.
  good_with     text,
  needs         text,
  contact_name  text,
  contact_phone text,
  contact_email text,
  created_by    uuid,
  created_at    timestamptz not null default now(),
  closed_at     timestamptz
);

create index if not exists adoption_open_idx
  on adoption_listings (created_at desc) where status = 'open';
create index if not exists adoption_dog_idx on adoption_listings (dog_id);
create index if not exists adoption_ngo_idx on adoption_listings (ngo_id);

-- One open listing per animal. Two organisations listing the same dog, or
-- the same organisation listing it twice, is a data-quality problem that is
-- much easier to prevent than to reconcile later.
create unique index if not exists adoption_one_open_per_dog
  on adoption_listings (dog_id) where status = 'open';

alter table adoption_listings enable row level security;

-- Open listings are public: that is the point of a listing. Closed ones stay
-- visible only to the organisation that opened them, since a placed animal's
-- contact details have no reason to remain on a public page.
drop policy if exists adoption_public_read on adoption_listings;
create policy adoption_public_read on adoption_listings
  for select using (status = 'open');

drop policy if exists adoption_org_read on adoption_listings;
create policy adoption_org_read on adoption_listings
  for select to authenticated using (ngo_id = my_ngo());

drop policy if exists adoption_service_all on adoption_listings;
create policy adoption_service_all on adoption_listings
  for all to service_role using (true) with check (true);

create or replace function list_animal_for_adoption(
  p_dog_id        uuid,
  p_summary       text default null,
  p_good_with     text default null,
  p_needs         text default null,
  p_contact_name  text default null,
  p_contact_phone text default null,
  p_contact_email text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_ngo uuid; v_id uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then
    raise exception 'Only a verified organisation can list an animal';
  end if;

  -- Reopening rather than duplicating, so the animal keeps one listing row
  -- and the partial unique index above is never fought with.
  update adoption_listings
     set status = 'open', closed_at = null,
         summary = coalesce(p_summary, summary),
         good_with = coalesce(p_good_with, good_with),
         needs = coalesce(p_needs, needs),
         contact_name = coalesce(p_contact_name, contact_name),
         contact_phone = coalesce(p_contact_phone, contact_phone),
         contact_email = coalesce(p_contact_email, contact_email)
   where dog_id = p_dog_id and ngo_id = v_ngo and status <> 'open'
   returning id into v_id;
  if v_id is not null then return v_id; end if;

  insert into adoption_listings (dog_id, ngo_id, summary, good_with, needs,
                                 contact_name, contact_phone, contact_email,
                                 created_by)
  values (p_dog_id, v_ngo, p_summary, p_good_with, p_needs,
          p_contact_name, p_contact_phone, p_contact_email, auth.uid())
  on conflict do nothing
  returning id into v_id;

  return v_id;
end $$;

create or replace function close_adoption_listing(
  p_id     uuid,
  p_status text default 'placed'
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_ngo uuid;
begin
  if p_status not in ('placed', 'withdrawn') then
    raise exception 'status must be placed or withdrawn';
  end if;
  select my_ngo() into v_ngo;
  update adoption_listings
     set status = p_status, closed_at = now()
   where id = p_id and ngo_id = v_ngo;
  return found;
end $$;

grant execute on function list_animal_for_adoption(uuid,text,text,text,text,text,text)
  to authenticated, service_role;
grant execute on function close_adoption_listing(uuid, text)
  to authenticated, service_role;

-- The public list. A view keeps the join in one place and means the page
-- cannot accidentally select a closed listing's contact details.
create or replace view adoptable_animals as
  select a.id            as listing_id,
         a.dog_id,
         a.summary,
         a.good_with,
         a.needs,
         a.contact_name,
         a.contact_phone,
         a.contact_email,
         a.created_at,
         d.name,
         d.zone,
         d.cover_photo,
         d.sterilised,
         d.vaccinated,
         d.is_friendly,
         n.name          as org_name,
         n.slug          as org_slug
    from adoption_listings a
    join dogs d on d.id = a.dog_id
    left join ngos n on n.id = a.ngo_id
   where a.status = 'open';

grant select on adoptable_animals to anon, authenticated, service_role;

-- ── 2. Documents ────────────────────────────────────────────────────

create table if not exists documents (
  id          uuid primary key default uuid_generate_v4(),
  ngo_id      uuid not null,
  -- Both null while a scan has been filed but not yet matched to anything.
  -- That is the ordinary state on the day of a bulk import: the page arrives
  -- first and the matching happens afterwards.
  dog_id      uuid references dogs(id) on delete set null,
  case_id     uuid references cases(id) on delete set null,
  url         text not null,
  kind        text not null default 'register_page'
              check (kind in ('register_page', 'whatsapp', 'medical_note',
                              'consent_form', 'other')),
  title       text,
  notes       text,
  recorded_on date,
  uploaded_by uuid,
  created_at  timestamptz not null default now()
);

create index if not exists documents_ngo_idx on documents (ngo_id, created_at desc);
create index if not exists documents_dog_idx on documents (dog_id) where dog_id is not null;
create index if not exists documents_case_idx on documents (case_id) where case_id is not null;
create index if not exists documents_unfiled_idx on documents (ngo_id, created_at desc)
  where dog_id is null and case_id is null;

alter table documents enable row level security;

-- Not public. A ward register page carries other people's handwriting,
-- phone numbers and addresses; it is working material for the organisation
-- that holds it, not something to publish alongside an animal.
drop policy if exists documents_org_read on documents;
create policy documents_org_read on documents
  for select to authenticated using (ngo_id = my_ngo());

drop policy if exists documents_service_all on documents;
create policy documents_service_all on documents
  for all to service_role using (true) with check (true);

create or replace function add_document(
  p_url         text,
  p_kind        text default 'register_page',
  p_title       text default null,
  p_notes       text default null,
  p_dog_id      uuid default null,
  p_recorded_on date default null,
  p_case_id     uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_ngo uuid; v_id uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then
    raise exception 'Only a verified organisation can file a document';
  end if;
  if coalesce(btrim(p_url), '') = '' then
    raise exception 'A document needs a file';
  end if;

  insert into documents (ngo_id, dog_id, case_id, url, kind, title, notes,
                         recorded_on, uploaded_by)
  values (v_ngo, p_dog_id, p_case_id, p_url, coalesce(p_kind, 'register_page'),
          p_title, p_notes, p_recorded_on, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- Attaching a scan after the fact is the common case: the import happens in
-- a batch, the matching happens later. A page can name an animal, belong to
-- a case, or both, so this sets whichever is passed and clears nothing by
-- accident: pass p_clear to detach instead.
create or replace function link_document(
  p_document_id uuid,
  p_dog_id      uuid default null,
  p_case_id     uuid default null,
  p_clear       boolean default false
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_ngo uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then return false; end if;

  if p_clear then
    update documents set dog_id = null, case_id = null
     where id = p_document_id and ngo_id = v_ngo;
    return found;
  end if;

  update documents
     set dog_id  = coalesce(p_dog_id, dog_id),
         case_id = coalesce(p_case_id, case_id)
   where id = p_document_id and ngo_id = v_ngo;
  return found;
end $$;

-- The written context that goes with a scan. A photograph of a ledger is not
-- self-explanatory: what it is, whose handwriting, which drive it belongs to,
-- is the part that makes it usable by someone who was not there.
create or replace function update_document(
  p_document_id uuid,
  p_title       text default null,
  p_notes       text default null,
  p_kind        text default null,
  p_recorded_on date default null
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_ngo uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then return false; end if;

  update documents set
    -- Empty string clears a field; null leaves it alone.
    title       = case when p_title is null then title
                       else nullif(btrim(p_title), '') end,
    notes       = case when p_notes is null then notes
                       else nullif(btrim(p_notes), '') end,
    kind        = coalesce(p_kind, kind),
    recorded_on = coalesce(p_recorded_on, recorded_on)
  where id = p_document_id and ngo_id = v_ngo;
  return found;
end $$;

grant execute on function add_document(text,text,text,text,uuid,date,uuid)
  to authenticated, service_role;
grant execute on function link_document(uuid, uuid, uuid, boolean)
  to authenticated, service_role;
grant execute on function update_document(uuid, text, text, text, date)
  to authenticated, service_role;

-- Documents for one animal, for the organisation that holds them.
create or replace function animal_documents(p_dog_id uuid)
returns setof documents language sql stable security definer
set search_path = public as $$
  select * from documents
   where dog_id = p_dog_id and ngo_id = my_ngo()
   order by coalesce(recorded_on, created_at::date) desc, created_at desc;
$$;

grant execute on function animal_documents(uuid) to authenticated, service_role;

create or replace function case_documents(p_case_id uuid)
returns setof documents language sql stable security definer
set search_path = public as $$
  select * from documents
   where case_id = p_case_id and ngo_id = my_ngo()
   order by coalesce(recorded_on, created_at::date) desc, created_at desc;
$$;

grant execute on function case_documents(uuid) to authenticated, service_role;
