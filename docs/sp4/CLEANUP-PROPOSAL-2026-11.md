# Production data cleanup — proposal (NOT executed)

**Status:** proposal only. Nothing below has been run in production. It needs the
owner's separate approval. Staging has run the same steps, reversed them exactly and
re-applied them (DATA-PROVENANCE.md §8).

**Files:** `supabase/proposed/2026-11-01-data-cleanup.sql` (apply) and
`supabase/proposed/2026-11-01-data-cleanup.rollback.sql` (guarded reverse).

**2 November safety review:** the apply file now deliberately aborts before any
changes. Its old “all sources except one” predicate is not an approved inventory;
it could include newly added operational sources. The November 1 counts below
are historical, not a current execution manifest. Before requesting approval,
freeze explicit source/case IDs and expected old values, refresh aggregate counts,
save backup checksums and produce complete apply/rollback diffs for every public
view and cache. The current Supabase connector returned authentication retry
responses, so a fresh inventory was not obtained in this pass. No cleanup ran.

Rollback now checks that every corrected row still exists and still has the
recorded new value, then restores the recorded old value (including source scope).
It aborts instead of overwriting intervening changes. This revised SQL has not
been installed or rehearsed on production; the earlier staging exercise is not
proof for these revisions. Keep the ledger and review any conflict separately.

## Why

* About 92% of the animals in production (27,857 of 30,288) come from research and public
  datasets (HSI Jamshedpur 2013–16, Mission Rabies Ranchi, IISER Kolkata, iNaturalist,
  Wikimedia). This is not operational work on StrayPaw, yet they feed the public map cache and
  public totals.
* 2,280 imported cases read `verified`. An import is not a verification.
* 2 cases opened by organisation members are labelled `community_report`. New cases no longer
  get this label: the trigger in the 2026-10-31 release, live since 2026-11-01, fixes it going forward.

## Counts (read-only, production, 2026-11-01)

| Measure | Before | After (expected) |
|---|---:|---:|
| Animals (rows) | 30,288 | 30,288 (none deleted) |
| Animals in operational figures | 30,288 | 2,431 |
| Cities with animals (operational) | 30 | 12 |
| Cases (rows) | 23,200 | 23,200 (none deleted) |
| Cases linked to research datasets | 20,915 | 20,915 (kept, outside operations) |
| Imported cases marked `verified` | 2,280 | 0 (`source_record`) |
| Organisation cases labelled `community_report` | 2 | 0 (`operator_created`) |
| Data sources scoped `research_archive` | 0 | 14 |
| `public_spatial_animals_cache` rows | 30,288 | 2,431 (after step 4) |

## Steps

1. **Backup first.** `pg_dump --data-only -t dogs -t cases -t data_sources -t import_batches`
   to storage the owner controls, plus a Supabase dashboard backup or restore point (Pro plan,
   daily backups). Record the checksums.
2. **Apply** `2026-11-01-data-cleanup.sql` in one transaction. It refuses to run twice, saves every
   old value in `provenance_corrections`, changes only labels and scope, and aborts if any count
   differs from the table above.
3. **Public views.** Add the research-archive predicate to each public view listed in
   DATA-PROVENANCE.md §7.3, one at a time, from `pg_get_viewdef`, with a saved diff. Then refresh
   the cache.
4. **Verify.** Re-run the counts above, open `/explore`, `/city` and a programme page, and confirm
   that only 2,431 animals and 12 cities appear.

## Rollback

`2026-11-01-data-cleanup.rollback.sql` proposes restoring changed values from `provenance_corrections`, after its conflict checks.
Then restore the separately reviewed view definitions and refresh the cache.
No deletion is proposed. A current backup and a successful isolated rehearsal are
still required; do not describe this proposal as a verified production rollback.
