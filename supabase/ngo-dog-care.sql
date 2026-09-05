-- ════════════════════════════════════════════════════════════════
-- StrayPaw, NGO bulk dog-care updates (dashboard HelpQueue).
--
-- Run ONCE in the Supabase SQL editor (idempotent). Lets a VERIFIED NGO member
-- update a dog's care flags from the operator dashboard (mark vaccinated /
-- sterilised, clear the needs-help flag), the "Dogs needing help" bulk actions.
-- Gated on is_ngo_member(); returns false for everyone else.
-- ════════════════════════════════════════════════════════════════

create or replace function ngo_set_dog_care(
  p_dog_id     uuid,
  p_vaccinated boolean default null,
  p_sterilised boolean default null,
  p_needs_help boolean default null
)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not is_ngo_member() then return false; end if;
  update dogs set
    vaccinated = coalesce(p_vaccinated, vaccinated),
    sterilised = coalesce(p_sterilised, sterilised),
    needs_help = coalesce(p_needs_help, needs_help),
    status     = case when p_needs_help = false and status in ('injured','hungry')
                      then 'seen' else status end
  where id = p_dog_id;
  return found;
end;
$$;

grant execute on function ngo_set_dog_care(uuid,boolean,boolean,boolean) to authenticated;
