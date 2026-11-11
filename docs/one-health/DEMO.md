# The Bengaluru One Health demonstration

**Everything in it is illustrative.** The programme row is flagged
`illustrative = true`, every screen shows an amber "Illustrative demonstration"
strip, facilities have invented addresses and the word "Illustrative" instead of a
phone number, and nothing claims a live integration. Institutions are named by their
*role* in the BeST proposal, never by a partner's real name:

| In the demo | Role in the BeST proposal |
|---|---|
| Programme Coordination Cell | BeST Cluster (IISc): coordination, data integration, M&E |
| Reference Rabies Diagnostic Laboratory | WoAH Reference Laboratory (KVAFSU) |
| Municipal Animal Husbandry & Health Division | GBA Animal Husbandry & Health |
| Teaching Hospital Anti-Rabies Clinic | KIMS: human health surveillance, PEP |
| Urban Primary Health Centres (HSR Layout, Malleshwaram) | BBMP Health facilities |
| Sample · Bengaluru Animal Care Trust, Sample · Mass Vaccination Partner | NGO partners (Mission Rabies, CARE) |
| Programme Epidemiology Unit | Research / evaluation (aggregate data only) |

## The story it tells (about ten minutes)

1. **Hospital clinician** (Dr. Arjun Rao, two places on one Today). Open the Teaching
   Hospital: 11 doses due or overdue, two notices from the public. Record a bite in
   HSR Layout from a street dog, category III. Prescribe: write the regimen, set the
   dates. The software never suggests one. Record dose 1.
2. **NGO field worker** (Ravi Kumar). The new follow-up is at the top: the dog's
   description and place, no patient details. Record what you found; the dog died, so
   send a sample from the follow-up.
3. **Laboratory scientist** (Dr. Suma Hegde). Receive, start the test, report positive
   with the method.
4. **Programme lead** (Dr. Meera Iyer). "Needs a decision" now shows the confirmed case;
   the follow-ups list has the laboratory's alert. Vaccination by ward shows registered
   share and, only where an estimate exists, coverage against the 70% target. Print the
   report.
5. **Hospital nurse** sees the call list and records doses but cannot assess or prescribe.
6. **The public** (signed out, `/bite-help`): centres with what each confirmed and when;
   Malleshwaram's anti-rabies vaccine shows "not verified" because its confirmation
   expired. Leave a notice; it appears on the clinic's Today.

## Where it runs

**Locally, today**: see `README.md` §5. The seed is `supabase/seed/one_health_bengaluru_demo.sql`.

**On the demo site, after owner approval.** The `demo` branch builds against staging.

1. Apply `supabase/migrations/20261112090000_one_health.sql` to staging.
2. Create nine staging auth accounts with these ids and emails (the Supabase admin API
   accepts an explicit id), all with one password:

   | id | email | person |
   |---|---|---|
   | `e0000000-0000-4000-8000-000000000001` | `demo-oh-programme@straypaw.invalid` | Programme lead |
   | `…0002` | `demo-oh-municipal@straypaw.invalid` | Municipal officer |
   | `…0003` | `demo-oh-clinician@straypaw.invalid` | Hospital clinician |
   | `…0004` | `demo-oh-nurse@straypaw.invalid` | Hospital nurse |
   | `…0005` | `demo-oh-phc@straypaw.invalid` | Health-centre doctor |
   | `…0006` | `demo-oh-lab@straypaw.invalid` | Laboratory scientist |
   | `…0007` | `demo-oh-field@straypaw.invalid` | NGO field worker |
   | `…0008` | `demo-oh-ngo@straypaw.invalid` | NGO coordinator |
   | `…0009` | `demo-oh-analyst@straypaw.invalid` | Epidemiologist |

   Add `…0007` as `member` and `…0008` as `coordinator` of the staging sample NGO
   `d0000000-0000-4000-8000-0000000000a0`, and create the second sample NGO
   `d0000000-0000-4000-8000-0000000000a1` ("Sample · Mass Vaccination Partner",
   `demo_mode = true`).
3. Run the seed against staging. It refuses to run if a non-illustrative programme
   already uses the slug, and removes only its own programme.
4. On the Vercel **preview** environment for the demo: `DEMO_ONEHEALTH_PASSWORD`,
   `NEXT_PUBLIC_OH_DEMO=1`, `NEXT_PUBLIC_OH_PUBLIC_PROGRAMME=bengaluru-demo`, and
   `citizen_bite_assist` in `SP_FLAGS` and `NEXT_PUBLIC_SP_FLAGS` (demo only; it stays
   off in production until clinical review).

Then `demo.straypaw.org/today` offers the eight people above.

## What is real and what is not

| Implemented and tested software | Waiting on people outside the code |
|---|---|
| Programme, institutions, roles, private health schema and audit | Applying it to staging and production |
| Bite register, clinician assessment and prescription, dose record, call list | Clinical review; the facility's approved regimen list |
| Animal follow-ups between facilities and NGOs, without patient data | The real ward split between NGO partners |
| Sample chain of custody, results, positive alerts | Laboratory's confirmed result vocabulary |
| Verified services finder and public notices | The verified centre list; clinical sign-off of the wording |
| Suppressed programme aggregates and printable report | Ethics and data-protection sign-off |
| Phone-call reminders, logged | SMS / WhatsApp (not connected) |
| Ward tables | Ward boundary polygons for a map |
