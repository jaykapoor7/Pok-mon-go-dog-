/* What a person reads of a stored note: the audit details (capture time, device request, form template, Kaju request
   id) are left out; what was written, and who confirmed what Kaju prepared, stay. Run: npm run test:care-note */
import assert from "node:assert/strict";
import { careNote } from "../src/lib/care-note";

let n = 0;
const ok = (name: string) => console.log(`ok ${++n} - ${name}`);

assert.equal(careNote("Ate well today.\n\nField capture: 2026-11-20 14:19:24.576+00. Device request 272b1a58-1c2d-4e5f-9a8b-0c1d2e3f4a5b."), "Ate well today.");
ok("a field note without its capture time and device request");
assert.equal(careNote("Field-reported ARV vaccination; not a clinical attestation or municipal acceptance.\nTemplate: arv-field-v1\nVaccine: Rabivax batch R12"),
  "Field-reported ARV vaccination; not a clinical attestation or municipal acceptance.\nVaccine: Rabivax batch R12");
ok("a field vaccination without its form template, and with what it is not");
assert.equal(careNote("Dewormed at the shelter. Prepared with StrayPaw AI, confirmed by Farah Sheikh. Kaju request um6z8t2z."), "Dewormed at the shelter. Prepared with StrayPaw AI, confirmed by Farah Sheikh.");
ok("a Kaju note keeps who confirmed it and drops the request id");
assert.equal(careNote("Field-reported procedure; separate veterinary authorisation required. {\"notes\":\"Healed\",\"facility\":\"ABC centre\"} Device request: 272b1a58-1c2d-4e5f-9a8b-0c1d2e3f4a5b"), "Healed · ABC centre");
ok("a field procedure reads as its note and facility, as before");
assert.equal(careNote("Template for the walk: left at the gate"), "Template for the walk: left at the gate");
assert.equal(careNote(null), "");
ok("ordinary words are left alone, and nothing reads as nothing");
console.log(`\n${n} care-note checks passed`);
