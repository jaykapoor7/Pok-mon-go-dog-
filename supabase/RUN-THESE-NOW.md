# What to run, in what order

Run each in the Supabase SQL editor, top to bottom. Every file here is
idempotent unless it says otherwise, so a re-run is safe.

## First, the answer to "why does it say 66?"

Running these files is **not** what makes the number 66, and running them
will not bring it down — `add-two-more-delhi-dogs.sql` will put it *up*
by two. The landing count is `select count(*) from dogs` with no filter
(`src/lib/data.ts:162`), so 66 is simply how many rows are in the table.

Only 22 of those come from the photographed Delhi seeds. The rest come
from two older seed files that are **not idempotent**:

| file | what it adds | re-runs safely? |
| --- | --- | --- |
| `seed.sql` | 12 invented animals — Bruno, Laali, Sheru, Moti, Goldie, Kaalu, Rani, Tiger, Coco, Raja, Snowy, Bablu — with **Unsplash stock photo URLs** | **No.** No fixed ids, no on-conflict: every run adds twelve more |
| `seed-delhi-dogs.sql` | 9 animals from `/seed-dogs/*.jpg` | **No.** A loop with `returning id`: every run adds nine more |
| `seed-delhi-photographs.sql` | 20 real photographs | Yes — fixed ids |
| `add-two-more-delhi-dogs.sql` | 2 real photographs | Yes — fixed ids |

The stock photography is the part worth acting on. Twelve Unsplash
pictures of dogs in other countries are sitting in a register whose
entire claim is that each row is a real animal somebody actually saw.

**Run `what-are-these-dogs.sql` first.** It only reads. It tells you
exactly how many rows came from each source and which are duplicates,
and it carries the clean-up statements commented out underneath so you
can decide rather than be surprised.

## Then, in this order

1. **`feedback.sql`** — the feedback table and `submit_feedback()`.
   Nothing else depends on it. Safe to re-run.
2. **`demo-mode.sql`** — the `ngo_id` error is fixed; it now reads the
   schema in front of it instead of assuming one. Safe to re-run.
3. **`fix-sightings-feed.sql`** — run this *before* step 4 if you have
   not already; step 4 says it depends on it.
4. **`add-two-more-delhi-dogs.sql`** — the two extra photographed
   animals, with their sightings. Puts the count up by two.
5. **`ward-density.sql`** — the tables and functions the ward pages read.
   Run before the district files, which load into them.
6. **`districts-india-1of5.sql`** … **`5of5.sql`** — in order. These are
   ~300 KB each; paste one file per editor run, not all five at once.
7. **`wards-chennai.sql`** — the Chennai ward polygons for the pilot.

## Separately

- **`find-pinky.sql`** — read-only. Finds which record is named Pinky and
  lists the white animals and Aishwarya's sightings so you can confirm
  which one she is. The UPDATE at the bottom is commented out; paste the
  id you picked into it. She is not in any seed file, so this has to be
  done against the live database.
