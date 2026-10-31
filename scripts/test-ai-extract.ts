/* StrayPaw AI: field-message extraction never invents values and finds what is there. */
import assert from "node:assert/strict";
import { extractFieldMessage } from "../src/sp3/ai/extract";

const today = new Date("2026-10-31T09:00:00Z");
const cases: [string, Partial<ReturnType<typeof extractFieldMessage>>][] = [
  ["Released after ABC near the temple, Saibaba Colony, Coimbatore. Female, ear notched. Photo attached.", { category: "sterilisation", sex: "female", earNotch: true, place: "Saibaba Colony", city: "Coimbatore", hasPhoto: true }],
  ["Injured dog hit by a bike outside Gandhipuram bus stand in Coimbatore, bleeding from leg", { category: "injury", severity: "critical", city: "Coimbatore" }],
  ["ARV given yesterday to brown male near R.S. Puram", { category: "vaccination", sex: "male", date: "2026-10-30" }],
  ["Three pups stuck in a drain", { category: "rescue", age: "puppy", city: null, place: null }],
  ["Sterilised on 12/10/2026, Lucknow", { category: "sterilisation", date: "2026-10-12", city: "Lucknow" }],
];
let n = 0;
for (const [text, want] of cases) {
  const got = extractFieldMessage(text, today);
  for (const [k, v] of Object.entries(want)) assert.deepEqual((got as Record<string, unknown>)[k], v, `${k} for: ${text}\n got ${JSON.stringify(got)}`);
  n++;
}
// Nothing is invented: an empty message yields nothing but "missing".
const empty = extractFieldMessage("dog", today);
assert.equal(empty.place, null); assert.equal(empty.city, null); assert.equal(empty.date, null);
assert.ok(extractFieldMessage("ABC done, female", today).missing.includes("surgery date"));
console.log(`ai-extract: ${n + 2} checks passed`);
