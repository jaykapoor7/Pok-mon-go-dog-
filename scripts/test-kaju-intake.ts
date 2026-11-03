/* Kaju intake desk: WhatsApp exports split cleanly, identity links only on an
   exact tag, duplicates are offered not assumed, and request IDs are stable. */
import assert from "node:assert/strict";
import { extractFieldMessage } from "../src/sp3/ai/extract";
import { planIntake, splitMessages } from "../src/sp3/ai/intake";
import { toJobs } from "../src/lib/careos/webhook";
import { SIMULATED_INBOUND, fromJob, groupByThread } from "../src/lib/careos/intake";

async function main() {
const now = new Date("2026-11-03T06:00:00Z");
let n = 0;
const ok = (m: string) => { n++; console.log(`ok ${n} - ${m}`); };

const exported = `[03/11/26, 7:42 am] Ravi: Injured dog near Gandhipuram bus stand, Coimbatore. Bleeding from leg. Photo attached
[03/11/26, 7:43 am] Ravi: <Media omitted>
[03/11/26, 7:44 am] Priya: ok
03/11/2026, 08:10 - Meena: Released after ABC near the temple, Saibaba Colony, Coimbatore. Female, ear notched.
second line of the same message`;
const msgs = splitMessages(exported);
assert.equal(msgs.length, 2, JSON.stringify(msgs));
assert.ok(!msgs.join(" ").includes("Ravi") && !msgs.join(" ").includes("Meena"), "sender names are not kept");
assert.ok(msgs[1].includes("second line"));
assert.deepEqual(splitMessages("Pup stuck in drain at RS Puram\n\nAnother dog limping near Podanur"), ["Pup stuck in drain at RS Puram", "Another dog limping near Podanur"]);
ok("WhatsApp exports and blank-line pastes split into messages without sender names");

const animals = [
  { id: "d1", label: "Bholu", tag: "SP-CBE-7K2Q", zone: "Saibaba Colony", sex: "Female" },
  { id: "d2", label: "Dog · Podanur", tag: null, zone: "Podanur", sex: "Male" },
];
const openCases = [{ id: "c1", label: "SPC-11", dogId: "d1", zone: "Saibaba Colony", occurredAt: "2026-10-01T00:00:00Z" }];
const ctx = { orgId: "org", defaultCity: "Coimbatore", animals, openCases, now };

const t1 = "Bholu SP-CBE-7K2Q limping again near Saibaba Colony, photo attached";
const p1 = planIntake(t1, extractFieldMessage(t1, now), ctx);
assert.equal(p1.animal?.id, "d1");
assert.equal(p1.duplicate?.id, "c1");
assert.equal(p1.options.find((o) => o.recommended)?.proposal.kind, "add_note");
assert.ok(p1.clear);
ok("an exact tag links the animal and its open case becomes the recommended home for the report");

const t2 = "Male dog limping near Podanur, Coimbatore";
const p2 = planIntake(t2, extractFieldMessage(t2, now), ctx);
assert.equal(p2.animal, null);
assert.equal(p2.similarAnimals[0]?.id, "d2");
assert.equal(p2.clear, false, "similar animals need a person");
assert.equal(p2.options.find((o) => o.recommended)?.proposal.kind, "open_case");
assert.equal((p2.options.find((o) => o.recommended)?.proposal as { dogId: string | null }).dogId, null, "never auto-links on locality");
assert.equal(p2.cityFrom, "message");
const t4 = "Male dog limping near Podanur, ear notched";
const p4 = planIntake(t4, extractFieldMessage(t4, now), ctx);
assert.equal(p4.extracted.category, "injury", "an ear notch is a sign of past sterilisation, not the report");
assert.equal(p4.cityFrom, "organisation");
assert.ok(!p4.missing.includes("city"));
ok("a locality match is offered for comparison, never linked automatically; the organisation city fills a gap and says so");

const t3 = "Pups abandoned in a box";
const p3 = planIntake(t3, extractFieldMessage(t3, now), { ...ctx, defaultCity: null });
assert.deepEqual(p3.blockers, ["Add the city"]);
assert.equal(p3.options.length, 0);
assert.equal(p3.clear, false);
ok("a report without a city is blocked instead of guessed");

const again = planIntake(t2, extractFieldMessage(t2, now), ctx);
assert.deepEqual(again.options.map((o) => o.proposal.id), p2.options.map((o) => o.proposal.id));
assert.notEqual(p2.options[0].proposal.id, planIntake(t2, extractFieldMessage(t2, now), { ...ctx, orgId: "other" }).options[0].proposal.id);
for (const o of p2.options) assert.match(o.proposal.id, /^[a-zA-Z0-9_-]{6,80}$/);
ok("preparing the same message twice yields the same request IDs, scoped to the organisation");

const masked = splitMessages("Call 98765 43210 or +91-9876543210, mail ravi@example.org: dog hit near Podanur");
assert.ok(!/\d{5}/.test(masked[0]) && !masked[0].includes("@"), masked[0]);
ok("phone numbers and email addresses inside a report are masked before preparing");

const fixture = { object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: {
  metadata: { phone_number_id: "PN1" }, contacts: [{ wa_id: "919876543210", profile: { name: "Reporter" } }],
  messages: [
    { id: "wamid.1", from: "919876543210", timestamp: "1793680000", type: "image", image: { id: "media1", mime_type: "image/jpeg" } },
    { id: "wamid.2", from: "919876543210", timestamp: "1793680060", type: "text", text: { body: "Dog bleeding near Gandhipuram bus stand, Coimbatore. Call me 9876543210" } },
    { id: "wamid.3", from: "919876543210", timestamp: "1793680090", type: "location", location: { latitude: 11.0168, longitude: 76.9558, name: "Gandhipuram" } },
  ],
  statuses: [{ id: "wamid.0", status: "delivered", timestamp: "1793680000", recipient_id: "919876543210" }],
} }] }] };
const jobs = toJobs(fixture);
const sources = jobs.map((j) => ({ j, s: fromJob(j) })).filter((x) => x.s).map((x) => ({ thread: String(x.j.payload.from), at: Number(x.j.payload.timestamp) * 1000, source: x.s! }));
const grouped = groupByThread(sources);
assert.equal(grouped.length, 1, "photo, words and pin from one reporter are one report");
assert.ok(grouped[0].hasPhoto && grouped[0].location?.label === "Gandhipuram");
assert.ok(!grouped[0].text.includes("9876543210"));
const wp = planIntake(grouped[0].text, extractFieldMessage(grouped[0].text, now), ctx);
assert.equal(wp.extracted.category, "injury"); assert.ok(wp.extracted.hasPhoto && wp.extracted.hasLocation); assert.ok(wp.options.length > 0);
ok("a WhatsApp webhook fixture becomes one masked, prepared report through the same planner");

const sim = groupByThread(toJobs(SIMULATED_INBOUND).map((j) => ({ j, s: fromJob(j) })).filter((x) => x.s).map((x) => ({ thread: String(x.j.payload.from), at: Number(x.j.payload.timestamp) * 1000, source: x.s! })));
assert.equal(sim.length, 2); assert.ok(sim[0].text.includes("(11.01681, 76.95583)") && sim[0].hasPhoto, "photo, caption and GPS pin become one report with coordinates kept");
assert.equal(extractFieldMessage(sim[1].text, now).severity, "critical");
ok("simulated inbound WhatsApp traffic runs through the real parser: two reports, GPS kept, urgency found");

const { confirmMany } = await import("../src/sp3/ai/execute");
const prop = (id: string) => ({ id, kind: "add_note" as const, why: "t", caseId: "c", caseLabel: "c", note: "n" });
const seenIds: string[] = [];
const res = await confirmMany([prop("a1aaaa"), prop("b2bbbb"), prop("c3cccc")], { id: "u", name: "U" }, (p) => seenIds.push(p.id),
  async (p) => p.id.startsWith("b") ? { ok: false, error: "Actions are temporarily limited. Try again shortly." } : { ok: true, at: "", what: "", verified: true });
assert.deepEqual(seenIds, ["a1aaaa", "b2bbbb"]); assert.equal(res.done, 1); assert.ok(res.stopped);
ok("a batch stops at a rate limit and leaves the rest prepared");

console.log(`\n${n} passed`);
}
main().catch((e) => { console.error(e); process.exit(1); });
