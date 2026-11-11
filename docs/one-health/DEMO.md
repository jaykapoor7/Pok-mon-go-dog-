# The illustrative demonstration

**Everything in it is invented.** Programmes, organisations and areas are flagged
`illustrative`, every screen that reads them shows an "Illustrative demonstration"
strip, institutions are named by their role (never a partner's real name), facility
addresses say "Illustrative", coordinates are approximate locality centres, and phone
numbers are all zeros. Nothing claims a live integration.

## One product, three configurations

| Programme | Shows |
|---|---|
| Karnataka One Health · Illustrative (state) | A state cell overseeing city programmes; sees each city's shared counts |
| Bengaluru Rabies Elimination · Illustrative (city, inside Karnataka) | The full BeST model: hospitals, health centres, a wound-washing unit, a reference laboratory, the municipal division, an NGO, coordination and epidemiology |
| Coimbatore ABC & Anti-Rabies · Illustrative (independent) | A smaller municipal programme with fewer modules; cannot see Bengaluru |

| In the demo | Role in the BeST proposal |
|---|---|
| Programme Coordination Cell | BeST Cluster (IISc) |
| Reference Rabies Diagnostic Laboratory | WoAH Reference Laboratory (KVAFSU) |
| Municipal Animal Husbandry & Health Division | GBA Animal Husbandry & Health |
| Teaching Hospital Anti-Rabies Clinic | KIMS |
| Urban Primary Health Centres; Wound-Washing Unit | BBMP Health facilities |
| Sample · Bengaluru Animal Care Trust | NGO partners (Mission Rabies, CARE) |
| Programme Epidemiology Unit | Research and evaluation |

## The ten-minute story

1. **Programme lead**: Overview opens on "Needs a decision": vaccine unavailable at one
   health centre (with its referral), a laboratory-confirmed case, overdue doses grouped
   across facilities, coverage below target. Care network shows the map and pathways.
2. **Hospital clinician** (works at two places): Today lists both. Record a category III
   bite; the area's NGO is asked to follow up automatically, without patient details.
3. **NGO field worker**: the NGO's own Today says a partner is waiting. Partner requests
   shows the animal's description; record what you found and send a sample.
4. **Laboratory scientist**: receive, start the test, report positive with the method.
5. **Programme lead** again: the confirmed case is at the top.
6. **Nurse**: doses due, completion calls, no assessment or prescription.
7. **Another city's lead**: cannot open Bengaluru.
8. **The public** (`/bite-help`): nearest first, "I need wound washing now", what each
   centre confirmed and where it refers.

## Set-up on staging (done 11 Nov 2026)

* Migrations v2.1–v2.5 applied to staging.
* Accounts `demo-oh-{programme,municipal,clinician,nurse,phc,lab,field,ngo,analyst,state,coimbatore}@straypaw.invalid`
  created with `staging/one-health-accounts.sql` (password supplied at run time, never stored).
* Data from `supabase/seed/one_health_demo.sql` (re-runnable; removes only its own rows).

To open it on the demo site, set on that deployment: `DEMO_ONEHEALTH_PASSWORD`,
`NEXT_PUBLIC_OH_DEMO=1`, `NEXT_PUBLIC_OH_PUBLIC_PROGRAMME=bengaluru-demo`, and
`citizen_bite_assist` in `SP_FLAGS` and `NEXT_PUBLIC_SP_FLAGS` (demo only).
