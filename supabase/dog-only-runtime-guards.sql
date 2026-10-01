-- Dog-only runtime guards.
-- NOT VALID preserves earlier imported history while enforcing the policy for
-- every new insert or update, including direct RPC calls that bypass the UI.

alter table public.dogs
  add constraint dogs_species_dog_only
  check (species is not distinct from 'dog') not valid;

alter table public.cases
  add constraint cases_species_dog_only
  check (species is not distinct from 'dog') not valid;

alter table public.surveys
  add constraint surveys_species_dog_only
  check (species is not distinct from 'dog') not valid;

alter table public.survey_responses
  add constraint survey_responses_species_dog_only
  check (species is not distinct from 'dog') not valid;

alter table public.dogs validate constraint dogs_species_dog_only;
alter table public.cases validate constraint cases_species_dog_only;
alter table public.surveys validate constraint surveys_species_dog_only;
alter table public.survey_responses validate constraint survey_responses_species_dog_only;
