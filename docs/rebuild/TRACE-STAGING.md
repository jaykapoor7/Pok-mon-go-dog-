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
with `docs/rebuild/sql/STAGING_cleanup_offline_checks.sql`. It was run on 2026-11-15, and no test animal or event is left.

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

## 6. A new NGO, from registration to its first post (scenario 1)

`docs/rebuild/sql/STAGING_trace_scenario1_new_ngo.sql`, run on 2026-11-16 and rolled back. Registration and the
redeeming of a code at sign-in run as the service role, as `/api/register/org` and `/api/join` do. Every other step runs
as the named person through row-level security. The two people are throwaway sign-ins created inside the transaction.

```
1 registration: organisation created, unverified; lead code issued: true
2 lead signs in: member as admin
3 lead invites a colleague: code issued: true
4 colleague signs in: member as member
5 colleague invites a member: refused (Only a team lead can give someone dashboard access)
  opens a case: in the new organisation: true
6 lead creates #general; sees the colleague's case: true
  colleague posts; the lead reads 1 message
7 another NGO: sees the case false, the channel false, the message false; posts: refused (new row violates row-level security policy for table "nx_messages")
```

Not covered: the code emails themselves (no email is sent from a trace), and the browser steps.

## 7. A field vaccination reaching the municipal reviewer (scenario 2)

`docs/rebuild/sql/STAGING_trace_scenario2_vaccination_to_reviewer.sql`, run on 2026-11-16 and rolled back, with the
sample Bengaluru operator NGO, its field worker, veterinarian and coordinator, and the sample municipal ABC cell's
reviewer. Two stand-ins, both inside the transaction: the photo's storage object is inserted directly (the app uploads
it first), and the reviewer creates an illustrative vaccination rate, because the sample contract prices sterilisation
only.

```
1 field worker: dog and case recorded (identity provisional); vaccination recorded: true, with its medical record: true
  the field worker confirming the identity: refused (Coordinator access required for identity review)
2 evidence added; the field worker signing off as a vet: refused (Only a veterinarian in this organisation can authorise a procedure)
3 vet signed off; coordinator confirmed the identity (confirmed) and reviewed: vet_authorised, evidence_reviewed
4 coordinator: package of 1 record submitted (submitted)
  the operator accepting its own claim: refused (Only an independent reviewer at the receiving office can decide submitted items)
5 reviewer: in the queue: true; claim decided and review closed (accepted)
6 coordinator sees: accepted; events: created → submitted → accepted
```

What the earlier attempts showed, each a rule working as intended:
- The field intake needs a location fix and a time (the phone always sends them).
- A photo must be stored under the path named after its own send, so a retried send cannot attach someone else's file.
- Submission was refused while the record still lacked the contract's required operation and a person's identity
  decision. A new animal is never treated as distinct, or merged, until a coordinator decides.
- Once the vet has signed off, the record is locked: the identity decision has to come first.

One finding, since fixed: field mode has two ways to record a vaccination. The lifecycle form
(`operations_record_event`, kind `vaccination`) recorded both the operation and the medical record; the quick ARV form
(`field_confirm_vaccination`) recorded only the medical record. Under a contract that requires the vaccination
operation, a dog vaccinated with the quick form showed "Operation: vaccination" as missing and could not be submitted.
`20261117130000_rebuild_quick_arv_operation.sql` makes the quick form record the operation too, linked to its one medical
record, while the lifecycle form still records one of each. The trace now uses the quick form (re-run on 2026-11-16,
rolled back):

```
1 field worker, quick ARV form: dog and case recorded (identity provisional); vaccination operations: 1, medical records: 1, linked: true
  lifecycle form, second dog: vaccination operations 1, medical records 1
  ...
4 coordinator: package of 1 record submitted (submitted)
5 reviewer: in the queue: true; claim decided and review closed (accepted)
```

## 8. A programme, a partner and an invitation (scenario 6)

`docs/rebuild/sql/STAGING_trace_scenario6_programme.sql`, run on 2026-11-16 and rolled back, as the sample programme lead,
with a throwaway doctor and a throwaway second person.

```
1 coordinator: programme created (planning), 2 wards; their own organisation, as lead
2 coordinator: partner added (hospital, in the programme: true); invitation code issued
  a laboratory role at a hospital: refused (Laboratory roles belong to laboratories)
3 outsider adds a partner: refused (Only a programme lead can add partners)
4 another email uses the code: refused (This code was sent to a different email address)
5 doctor: joined as clinician; sees their hospital: true
  the same code again: refused (This code is not valid or has expired)
6 coordinator: 1 invitation listed for the partner; recorded as accepted by the doctor: true
```

Found while preparing it: the invitation link the coordinator copies pointed at `/next/start`, which has not existed since
the app moved to its own addresses, so it opened "not found". It now opens `/start?invite=…`, and `test:routes` fails on
any app link under `/next/`. Production had sent no invitations, so no broken link went out.

After the three runs, staging holds none of their organisations, programmes, contracts, sign-ins or animals.

## 9. Code review of the day's changes (2026-11-16)

A review of the changes in #120, #123 and the quick ARV fix reported eight findings. Fixed:
- **A follow-up's acknowledgement was dropped by the next run** that still found something, so it showed as not picked
  up and was raised with the leads again. `20261117140000` (production changes, seventh set).
- **A member could briefly see the sample workspace after signing in.** The layout's inline script marks a browser that
  holds a session only on a full page load; signing in moves into the app without one. `LiveProvider` now marks it
  before the first paint as well. Checked in a browser: signing in through `/sign-in?next=/ngo/cases`, no sample chip was
  ever visible.
- **A failed workspace read showed members the sample workspace.** Any error reading `nx_my_workspaces` was taken for a
  database without the rebuild's tables. Now only that case keeps the sample. Other errors are retried twice, then the frame
  says the workspace could not be read and offers "Try again", which hides the page again while it reads. Checked in a
  browser with the read failing: the error, never the sample; after "Try again", the organisation's own cases.
- **Older open follow-ups disappeared from "Waiting for someone"**, which was built from the 30 latest runs. It now has its
  own query for every open follow-up.
- **The PEP sender swapped `process.env.MSG91_TEMPLATE_ID`** around each send, which any other SMS sent from the same
  server at that moment would pick up. `sendSms` now takes the template as an argument.

Not changed:
- **A quick ARV vaccination on an already signed-off case is still accepted** (it now also records the operation). The
  lifecycle form refuses changes to an attested record. Whether a field worker should be stopped from recording a
  vaccination on a signed-off case is a decision for the programme owner.
- **Escalation hours can only be set when a rule is turned on.**
- **The "sample until ready" rule is repeated on each page.**
