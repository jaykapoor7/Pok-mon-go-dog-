# Activation checklist

Staging (branch `animalid`):
1. Apply `supabase/migrations/20261110100000_animalid.sql` to staging. Confirm `vector` is available.
2. Run the worker against staging with the staging service key on a host you control:
   `SUPABASE_URL=https://ucxfxiddufwqithtdtix.supabase.co SUPABASE_SERVICE_ROLE_KEY=… python -m animalid.worker`.
3. Add `animal_id` to `SP_FLAGS` and `NEXT_PUBLIC_SP_FLAGS` for the staging preview only.
4. As a sample coordinator: Identity review → Index profile photos, then Find by photo. Check: job queues; quality
   rejection on a blurred photo; candidates only from the sample organisation; decide, reverse; audit rows written;
   a municipal reviewer and another organisation cannot read the jobs, candidates or photos.
5. Run `pytest` in `services/animalid` and `research/animalid`.

Production (owner approval required for each step):
6. Decide where the worker runs (CPU is enough for a pilot; GPU only for re-indexing large registers) and the budget.
7. Apply the migration to production.
8. Deploy the worker with the production service key stored on that host only.
9. Turn on `animal_id` for named organisations, after an evaluation on their labelled photos has set thresholds
   (`calibrated = true`), or with the uncalibrated label shown and the organisation informed.
10. Record organisations' training consent before any training run.
