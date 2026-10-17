# Signed-in QA harness (local only)

Drives StrayPaw 2.0 NGO screens as a **synthetic** organisation member without
touching any real database. `harness.mjs` fakes the session and answers every
Supabase call with records coded `TEST-…`; writes are captured, and any write
it does not answer is blocked (403). Import and export routes are answered
locally too.

    node e2e/harness/page.mjs <outdir> <name> <route>        # screenshot + overflow + captured writes
    CLICK='<selector>' FULL=1 W=390 BASE=http://localhost:3001 node e2e/harness/page.mjs out casefile /ngo/animals/00000000-0000-4000-9000-000000002001
    node e2e/harness/offline.mjs <outdir>                    # field-mode offline draft round trip

Never point `BASE` at production.
