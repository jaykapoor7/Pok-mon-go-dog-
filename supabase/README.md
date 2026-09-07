# Running the database migrations

## The short version

```bash
DATABASE_URL='postgresql://...' npm run db:migrate -- pilot
```

The connection string is Supabase → Project Settings → Database → Connection
string → **URI**. Use the direct connection or the session pooler; the
transaction pooler on port 6543 cannot run DDL reliably. Put it in
`.env.local` as `DATABASE_URL=...` and you can drop the prefix.

Three sets:

| Set | What it runs | When |
| --- | --- | --- |
| `all` | base schema, pilot schema, all boundaries | a brand new Supabase project |
| `pilot` | pilot schema and all boundaries | the base schema is already there |
| `wards` | rebuilds the density map and reloads its boundaries | only the map is wrong |

Every set is safe to run again, from any state, however badly a previous
attempt went. That is verified against a database seeded with each earlier
broken shape, not only against an empty one.

## By hand, in the SQL editor

Same files, same order, one paste each. This works too — it is just seven
pastes instead of one command, and nothing checks that you ran them in
order.

1. `RUN-ALL-MIGRATIONS.sql` — only on a brand new project
2. `RUN-PILOT-MIGRATIONS.sql`
3. `districts-india-1of5.sql` … `districts-india-5of5.sql`
4. `wards-chennai.sql`

Step 2 ends by printing how many boundaries are loaded, which will be zero
until you have done steps 3 and 4.

## Why the boundary files are separate, and five of them

`wards` is the only table here that holds no original data. Every row is
imported from a published boundary dataset (Census 2011 districts via
DataMeet, CC BY 2.5 IN; Chennai wards via DataMeet, CC BY 4.0), and both are
checked into this directory as SQL.

Because of that, `ward-density.sql` **drops and rebuilds** the table and its
functions on every run instead of migrating them forward. Four separate
migration failures came from trying to carry that table forward:

- `create table if not exists` does nothing to a table that already exists,
  so a new column never appeared
- `create or replace function` cannot change a function's return type
- adding an argument to a function creates an *overload*, so the old
  one-argument version survived and calls became ambiguous
- a run that failed halfway left a shape no alter script had predicted

Rebuilding has exactly one code path and cannot half-apply. The cost is
that the boundary loaders have to run again afterwards, which is why they
come last in every set above.

The districts are split across five files because Supabase's SQL editor
refuses a batch of 1.5 MB. They are simplified to a 0.01° tolerance with
`ST_SimplifyPreserveTopology`, which keeps all 641 districts — `ogr2ogr
-simplify` silently destroyed two or three of them at every tolerance
tried. Total area comes to 3,270,689 km² against India's official
3,287,263 km², and Chennai's 200 wards to 428.9 km² against the
corporation's ~426 km².

## Checking what is actually there

```sql
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'ward\_%') as ward_functions,
  (select count(*) from wards where level = 'district')      as districts,
  (select count(*) from wards where level = 'ward')          as city_wards;
```

Expect `6, 641, 200`. More than six functions means an old overload
survived; run the `wards` set again.
