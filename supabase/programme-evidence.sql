-- Public programme evidence: keep aggregate register totals separate from
-- individually linked animal records. Safe to rerun.

create or replace view public_programme_cards as
select
  c.id,
  c.name,
  c.kind,
  c.starts_on,
  c.ends_on,
  c.zone,
  c.public_summary,
  n.name as ngo_name,
  n.slug as ngo_slug,
  n.city,
  n.state,
  c.source_rows_count,
  count(d.id)::integer as traceable_animals_recorded,
  coalesce(nullif(count(d.id), 0), c.source_rows_count)::integer as animals_recorded,
  coalesce(
    nullif(count(d.id) filter (where d.sterilisation_status = 'sterilised'), 0),
    case when c.kind = 'sterilisation' then c.source_rows_count else 0 end
  )::integer as sterilised_recorded,
  coalesce(
    nullif(count(d.id) filter (where d.vaccination_status = 'vaccinated'), 0),
    case when c.kind = 'vaccination' then c.source_rows_count else 0 end
  )::integer as vaccinated_recorded
from campaigns c
join ngos n on n.id = c.ngo_id
left join dogs d on d.campaign_id = c.id
where c.public_visibility in ('summary', 'public')
  and c.archived_at is not null
group by c.id, n.id;

grant select on public_programme_cards to anon, authenticated;
