# Local staging kit — UNFINISHED

A throwaway local PostgreSQL 16 database built from the repo's SQL, for testing
row-level security and the RPCs the 2.0 UI calls. It only talks to a cluster it
creates on 127.0.0.1 and never reads `.env` files or any Supabase/Vercel credential.

Status: stopped partway. The Supabase shim (`shim.sql`), migration applier
(`apply.mjs`) and drift notes (`drift.sql`) exist; synthetic seed data
(`seed.sql`) and the permission test runner are not written, so no RLS or RPC
result has been produced. Nothing here is evidence that permissions were tested.
See `docs/straypaw-2-acceptance.md` for what remains unverified.
