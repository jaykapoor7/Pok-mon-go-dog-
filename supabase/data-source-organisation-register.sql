-- An organisation's own register as an atlas data source.
--
-- data_sources named five kinds of external source: research, municipal,
-- government, public API and media repository. An animal-welfare
-- organisation's own rescue ledger, shared with StrayPaw and imported as
-- historical records, is none of those. It gets its own kind so that the
-- source registry says what it is, and so a published figure can always be
-- traced to "this organisation's register", not a study or a census.

alter table public.data_sources drop constraint if exists data_sources_source_type_check;
alter table public.data_sources add constraint data_sources_source_type_check
  check (source_type in ('research_dataset', 'municipal_dataset', 'public_api', 'media_repository', 'government_dataset', 'organisation_register'));
