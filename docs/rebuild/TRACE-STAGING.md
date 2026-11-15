# Traces on staging

The delivery document asks for "a trace of at least one real cross-workspace flow and one Kaju action". These were run
on 2026-11-15 on the staging database (`ucxfxiddufwqithtdtix`), with its illustrative Bengaluru programme and sample
accounts. Every step runs as the named sample person, through row-level security, with the same database functions the
app calls. Nothing here touches production, and nothing is real patient or programme data.

## 1. Bite to laboratory result, across five workspaces

`docs/rebuild/sql/STAGING_trace_cross_workspace.sql`. It runs inside one transaction that ends by raising its trace as
an error, so every row it writes is rolled back. The output was:

```
1 citizen (anon): notice accepted, routed to Urban Primary Health Centre · HSR Layout
2 clinician (hospital): can read the notice routed elsewhere: permission denied
  patient presents at the hospital: bite BX-2611-7BA434 recorded (category III, washed at facility); animal follow-up request raised
3 NGO coordinator: sees the request: 1; patient record: permission denied; request names the patient: false
  accepted (request now accepted); sent sample S-2611-66C500 to the laboratory, linked to the request
  NGO tries to record the laboratory step: refused: Only the receiving laboratory can update this sample
4 laboratory scientist: received, testing, resulted (resulted / positive by Dr. Suma Hegde); patient record: permission denied
5 NGO coordinator: result notice received: 1
6 programme lead: coordinator notices: 1 ("Laboratory-confirmed rabies: HSR Layout"); patient record: permission denied
  programme overview read
```

What it shows:
- A citizen with no account can report, and the notice goes to the nearest listed facility.
- The clinician records the bite (clinician-entered category and wound washing). The animal follow-up goes to the NGO
  assigned to that area. The request carries no patient details.
- The NGO, the laboratory and the programme lead each cannot read the patient record.
- Only the receiving laboratory can move a sample, and its result is signed by a named scientist.
- The result reaches the NGO that sent the sample and the programme coordinators.
- No step was taken by Kaju. Kaju cannot validate a result or record a clinical decision: those are person-only steps
  in the tool registry, checked in `test:db`.

The first attempt failed at step 2, and the failure was correct. The notice had been routed to the primary health
centre, and the trace first had the hospital clinician record the bite at the facility that received the notice. The
database refused with "Only staff of this facility can record a bite". The trace was changed so that the patient
presents at the clinician's own hospital.

## 2. Offline field capture, saved once (scenario 13)

`e2e/field-offline-staging.spec.ts`, in a phone browser (Pixel 7) against a build pointed at staging, signed in as the
One Health field worker. It passed in 10 s:

1. The worker turns on offline work, sets a PIN and loses signal. They record an animal: photo, place and reason.
2. The draft is stored on the phone encrypted. The test reads IndexedDB and finds ciphertext, not the words typed.
3. Signal returns. The first send reaches the server and is saved there, but its answer is lost: the test replaces the
   response with a 503.
4. The record shows the failure and offers **Try again**. Nothing is removed from the phone.
5. On retry, the server answers from its first save: the same request id, the same record id and `replayed: true`.
   The photo is uploaded and confirmed once.

The database afterwards held one case, one intake event, one evidence item and one receipt for two sends.

The run found two faults, now fixed:
- **No volunteer row.** Field mode never created the person's volunteer row, and a new case is assigned to its
  creator. Someone whose first record came from field mode had their case refused with a foreign-key error. On
  production, 3 of 7 NGO members had no volunteer row (none of them joined in the last 30 days).
- **Hidden buttons.** On the demo build, the guided-demo pill covered the intake sheet's Next and Save on phones.

The app never deletes a field intake, because its operational event is an audit record. So the test rows are cleared
with `docs/rebuild/sql/STAGING_cleanup_offline_checks.sql`. That clean-up waits on the owner's confirmation in the
Supabase tool.

## 3. Signed in, against staging, from a local build

`e2e/rebuild-signed-in.spec.ts`, with `E2E_ROLES=oh-ngo,oh-clinician,oh-lab,oh-programme`: 4 passed. The classic
sample roles (municipal reviewer, veterinarian, field worker) sign in only where the demo deployment holds their
password, so they run in `signed-in-e2e.yml` on demo.straypaw.org. That workflow now waits on `/start`; it had been
waiting on `/next/start`, which no longer exists.

A local build signs in to staging only when the server's outbound requests go through this machine's proxy:
`NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt npx next start`. Without that, the sign-in route
answered 502, which is why these sessions were "not exercised locally" before.

## 4. A Kaju mission

Recorded on 2026-11-15 in `docs/rebuild/PRODUCTION-CHANGES.md` (staging checks). The mission found 27 cases, waited
for approval, then created 27 tasks. Planning the same request again with the same key returned the same mission, with
no second set of tasks.

## 5. Scheduled jobs

Read-only, on 2026-11-15:

| Job | Production | Staging |
| --- | --- | --- |
| `nx-mission-tick` (every minute) | 32 runs in 24 h, 0 failed | 326 runs, 0 failed |
| `nx-automations-tick` (hourly) | ran 15:07, succeeded | ran 15:07, succeeded |
| Kaju daily checks (Vercel cron 04:00 UTC) | ran 13, 14 and 15 Nov | — |

No organisation on production has turned an automation on yet, so the hourly tick has nothing to run. The
notification delivery cron has had nothing to deliver.
