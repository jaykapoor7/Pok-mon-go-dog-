#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   STAGING ONLY. Fills the sample demo workspace ("Sample · Bengaluru
   Animal Care Trust" and "Sample · Bengaluru municipal ABC cell") with
   illustrative records, through the same functions the app uses, signed
   in as each sample person. Nothing here is a real animal, procedure,
   contract or payment; every organisation name says "Sample".

     field member   registers animals and records capture, surgery, release
     coordinator    opens cases, adds evidence, reviews, prepares packages
     veterinarian   authorises procedures in their own name
     reviewer       sets illustrative contract rates and decides packages

   Usage (accounts are created on staging beforehand):
     DEMO_PASSWORD=<password> node scripts/staging/seed-demo-workspace.mjs
   Refuses to run against anything but the staging project, and refuses
   to run twice on a workspace that already has animals.
   ════════════════════════════════════════════════════════════════════ */
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { randomUUID } from "node:crypto";

const URL = "https://ucxfxiddufwqithtdtix.supabase.co";
const ANON = "sb_publishable_Kj-dG0m0d8dv3npkEr-Z_A_VECXE74T";
const PW = process.env.DEMO_PASSWORD;
if (!PW) { console.error("Set DEMO_PASSWORD."); process.exit(2); }

const NGO = "d0000000-0000-4000-8000-0000000000a0";
const OFFICE = "d0000000-0000-4000-8000-0000000000b0";
const PEOPLE = {
  lead: ["demo-lead@straypaw.invalid", "d0000000-0000-4000-8000-000000000001", "Priya Nair"],
  coord: ["demo-coordinator@straypaw.invalid", "d0000000-0000-4000-8000-000000000002", "Ravi Kumar"],
  vet: ["demo-vet@straypaw.invalid", "d0000000-0000-4000-8000-000000000003", "Dr. Anitha Rao"],
  field: ["demo-field@straypaw.invalid", "d0000000-0000-4000-8000-000000000004", "Manjunath K"],
  reviewer: ["demo-municipal@straypaw.invalid", "d0000000-0000-4000-8000-000000000005", "Lakshmi Srinivas"],
};

const sign = async (who) => {
  const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email: PEOPLE[who][0], password: PW });
  if (error) throw new Error(`${who}: ${error.message}`);
  return c;
};
const must = async (label, p) => { const { data, error } = await p; if (error) throw new Error(`${label}: ${error.message}`); return data; };
const soft = async (label, p) => { const { data, error } = await p; if (error) console.log(`  skipped ${label}: ${error.message}`); return error ? null : data; };

const c = Object.fromEntries(await Promise.all(Object.keys(PEOPLE).map(async (k) => [k, await sign(k)])));
{
  const { count } = await c.coord.from("dogs").select("id", { count: "exact", head: true }).eq("ngo_id", NGO);
  if (count) { console.error(`The sample workspace already has ${count} animals. Not seeding twice.`); process.exit(3); }
}

// ── Places ────────────────────────────────────────────────────────────
const PLACES = [
  ["Koramangala", 12.9352, 77.6245], ["Indiranagar", 12.9784, 77.6408], ["HSR Layout", 12.9116, 77.6474],
  ["Jayanagar", 12.9308, 77.5838], ["BTM Layout", 12.9166, 77.6101], ["Malleshwaram", 13.0031, 77.5643],
  ["Whitefield", 12.9698, 77.75], ["Yelahanka", 13.1007, 77.5963], ["Banashankari", 12.9255, 77.5468], ["Rajajinagar", 12.991, 77.555],
];
let seed = 7;
const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const jitter = (v) => v + (rnd() - 0.5) * 0.008;
const NAMES = ["Bruno", "Kalu", "Rani", "Tiger", "Moti", "Lucky", "Sheru", "Chotu", "Bhura", "Julie", "Snowy", "Simba", "Laila", "Raja", "Kencha", "Bindu", "Coco", "Ginger", "Max", "Pinky", null, null, null, null, null, null, null, null];
const day = (iso) => `${iso}T${String(8 + Math.floor(rnd() * 8)).padStart(2, "0")}:${String(Math.floor(rnd() * 60)).padStart(2, "0")}:00+05:30`;

// ── Evidence placeholder images, plainly labelled as samples ────────────
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
const IMG = {};
for (const [kind, label, tint] of [["capture_photo", "Capture photo", "#e8eef9"], ["ear_notch_photo", "Ear-notch photo", "#eef6ee"], ["release_photo", "Release photo", "#f7f1e6"], ["surgery_record", "Surgery record", "#f3eef8"]]) {
  await page.setContent(`<body style="margin:0;display:grid;place-items:center;height:480px;background:${tint};font-family:system-ui,sans-serif;color:#1d2b44"><div style="text-align:center"><div style="font-size:15px;letter-spacing:.12em;text-transform:uppercase;opacity:.6">Sample evidence</div><div style="font-size:40px;font-weight:600;margin-top:8px">${label}</div><div style="font-size:15px;margin-top:10px;opacity:.6">Illustrative · not a real animal</div></div></body>`);
  IMG[kind] = await page.screenshot({ type: "jpeg", quality: 80 });
}
await browser.close();

// ── Animals ───────────────────────────────────────────────────────────
const animals = [];
for (let i = 0; i < 32; i++) {
  const [zone, lat, lng] = PLACES[i % PLACES.length];
  const name = NAMES[i % NAMES.length];
  const code = `${zone.slice(0, 3).toUpperCase()}-${String(101 + i)}`;
  const id = await must(`animal ${i}`, c.field.rpc("create_animal_with_location", {
    p_city: "Bengaluru", p_name: name, p_species: "dog", p_code: code, p_zone: zone,
    p_lat: jitter(lat), p_lng: jitter(lng), p_cover_photo: null, p_intake_notes: "Sample record for demonstration.", p_h3_r8: null,
  }));
  animals.push({ id, zone, lat, lng, name: name ?? code });
}
console.log(`animals: ${animals.length}`);

// ── ABC procedures: capture → surgery → recovery → release ──────────────
const ABC = [
  // [animal index, surgery date, state]  state: accepted-october | reviewed | vet-only | waiting-vet | returned | needs-evidence
  [0, "2026-10-03", "oct"], [1, "2026-10-06", "oct"], [2, "2026-10-09", "oct"], [3, "2026-10-13", "oct"], [4, "2026-10-16", "oct"],
  [5, "2026-10-21", "oct"], [6, "2026-10-24", "oct"], [7, "2026-10-28", "oct"],
  [8, "2026-11-01", "reviewed"], [9, "2026-11-02", "reviewed"], [10, "2026-11-03", "reviewed"], [11, "2026-11-04", "reviewed"],
  [12, "2026-11-05", "vet-only"], [13, "2026-11-05", "waiting-vet"], [14, "2026-11-06", "waiting-vet"], [15, "2026-11-06", "returned"], [16, "2026-11-07", "needs-evidence"],
];
const coordName = PEOPLE.coord[2], coordId = PEOPLE.coord[1];
const abcCases = [];
for (const [ai, date, state] of ABC) {
  const a = animals[ai];
  const caseId = await must("abc case", c.coord.rpc("create_case_with_location", {
    p_city: "Bengaluru", p_title: `ABC · ${a.name}, ${a.zone}`, p_description: "Sample sterilisation under the ABC programme.",
    p_dog_id: a.id, p_zone: a.zone, p_lat: null, p_lng: null, p_severity: "normal", p_category: "sterilisation", p_tags: [],
    p_actor_id: coordId, p_actor_name: coordName, p_species: "dog", p_informer_contact: null, p_hospital: "Sample ABC centre, Bengaluru", p_cost_estimate: null, p_cost_spent: null, p_h3_r8: null,
  }));
  const ev = (kind, payload) => must(`${kind} event`, c.field.rpc("operations_record_event", { p_request: randomUUID(), p_case: caseId, p_kind: kind, p_payload: { template: "lifecycle-v1", ...payload }, p_policy: null }));
  const d = new Date(`${date}T00:00:00+05:30`);
  const before = new Date(d.getTime() - 86400000).toISOString().slice(0, 10);
  const after = new Date(d.getTime() + 2 * 86400000).toISOString().slice(0, 10);
  await ev("capture", { occurredAt: day(before), notes: "Caught by net near the feeding spot; calm.", location: `${a.zone}, near the market` });
  await ev("sterilisation", { occurredAt: day(date), notes: "Routine procedure; no complications recorded.", performedBy: PEOPLE.vet[2], facility: "Sample ABC centre, Bengaluru", procedure: "Ovariohysterectomy / orchidectomy as indicated; left ear notched" });
  if (state !== "needs-evidence") {
    await ev("recovery", { occurredAt: day(date), notes: "Recovered in kennel; eating by evening." });
    const released = day(after);
    if (Date.parse(released) < Date.now()) await ev("release", { occurredAt: released, notes: "Released where caught.", location: `${a.zone}, near the market` });
  }
  // evidence files, private to the organisation
  const kinds = state === "needs-evidence" ? ["capture_photo"] : state === "returned" ? ["capture_photo", "surgery_record", "ear_notch_photo", "release_photo"] : ["capture_photo", "surgery_record", "ear_notch_photo", "release_photo"];
  for (const kind of kinds) {
    const path = `${NGO}/${caseId}/${kind}-${randomUUID()}.jpg`;
    await must(`upload ${kind}`, c.coord.storage.from("abc-evidence").upload(path, IMG[kind], { contentType: "image/jpeg" }));
    await must(`add ${kind}`, c.coord.rpc("abc_add_evidence", { p_case_id: caseId, p_kind: kind, p_url: `storage://abc-evidence/${path}`, p_title: `Sample ${kind.replace(/_/g, " ")}` }));
  }
  if (!["returned", "needs-evidence"].includes(state)) await must("release location", c.coord.rpc("abc_add_evidence", { p_case_id: caseId, p_kind: "release_location", p_location: `${a.zone}, near the market` }));
  if (!["waiting-vet", "needs-evidence"].includes(state)) await must("vet sign-off", c.vet.rpc("abc_vet_authorise", { p_case_id: caseId, p_note: "Procedure and recovery normal." }));
  if (state === "returned") await must("return", c.coord.rpc("abc_return_evidence", { p_case_id: caseId, p_reason: "Release location not recorded; add it from the field." }));
  if (["oct", "reviewed"].includes(state)) await must("review", c.coord.rpc("abc_review_evidence", { p_case_id: caseId, p_note: "All five items present." }));
  abcCases.push({ caseId, state });
}
console.log(`ABC cases: ${abcCases.length}`);

// ── Rescue and treatment cases, with follow-ups ────────────────────────
const RESCUE = [
  [17, "Limping after a road accident", "injury", "high", "in_progress", "2026-11-09"],
  [18, "Skin infection, losing fur", "injury", "normal", "in_progress", "2026-11-08"],
  [19, "Puppy separated from mother", "rescue", "high", "assigned", "2026-11-07"],
  [20, "Deep wound on the neck", "injury", "critical", "in_progress", "2026-11-05"],
  [21, "Not eating for two days", "other", "normal", "open", null],
  [22, "Caught in a drain", "rescue", "high", "resolved", null],
  [23, "Eye infection", "injury", "normal", "resolved", null],
  [24, "Vaccination due", "vaccination", "low", "open", "2026-11-12"],
  [25, "Aggressive after a fight", "other", "normal", "assigned", "2026-11-10"],
  [26, "Mange treatment, week 2", "injury", "normal", "in_progress", "2026-11-04"],
];
for (const [ai, title, category, severity, status, follow] of RESCUE) {
  const a = animals[ai];
  const caseId = await must("case", c.coord.rpc("create_case_with_location", {
    p_city: "Bengaluru", p_title: `${title} · ${a.name}`, p_description: "Sample case reported by a resident.", p_dog_id: a.id, p_zone: a.zone,
    p_lat: null, p_lng: null, p_severity: severity, p_category: category, p_tags: [], p_actor_id: coordId, p_actor_name: coordName, p_species: "dog",
    p_informer_contact: null, p_hospital: null, p_cost_estimate: null, p_cost_spent: null, p_h3_r8: null,
  }));
  if (status !== "open") await soft("take", c.field.rpc("take_case", { p_case_id: caseId, p_actor_name: PEOPLE.field[2] }));
  if (status === "in_progress" || status === "resolved") await soft("progress", c.field.rpc("update_case_status", { p_case_id: caseId, p_to_status: "in_progress", p_actor_id: PEOPLE.field[1], p_actor_name: PEOPLE.field[2], p_note: "On site; first aid given." }));
  if (status === "resolved") await soft("resolve", c.coord.rpc("update_case_status", { p_case_id: caseId, p_to_status: "resolved", p_actor_id: coordId, p_actor_name: coordName, p_resolution: "treated", p_outcome_note: "Treated and returned to the area." }));
  if (follow) await soft("follow-up", c.coord.rpc("set_case_followup", { p_case_id: caseId, p_follow_up_at: follow }));
  await soft("note", c.field.rpc("add_case_note", { p_case_id: caseId, p_actor_id: PEOPLE.field[1], p_actor_name: PEOPLE.field[2], p_note: "Resident feeds this dog daily and can help catch it." }));
}
console.log(`rescue cases: ${RESCUE.length}`);

// ── Illustrative contract, set by the municipal office ─────────────────
const EVIDENCE = ["capture_photo", "surgery_record", "ear_notch_photo", "release_photo", "release_location"];
const contractReceipt = await must("contract", c.reviewer.rpc("operations_create_contract", { p_request: randomUUID(), p_payload: {
  name: "Sample ABC contract · Bengaluru", version: 1, reference: "Illustrative rates for demonstration; not a real agreement",
  office_id: OFFICE, ngo_id: NGO, starts_on: "2026-10-01", ends_on: "2027-03-31", illustrative: true,
  rates: [{ code: "sterilisation", label: "ABC sterilisation per animal (illustrative)", unit_rate: "1650", required_evidence: EVIDENCE, required_events: ["sterilisation", "recovery", "release"], vet_required: true }],
} }));
const { data: contracts } = await c.coord.from("operations_contracts").select("id").eq("ngo_id", NGO).eq("office_id", OFFICE);
const contract = contracts?.[0]?.id;
const { data: rates } = await c.coord.from("operations_contract_rates").select("id,code").eq("contract_id", contract);
const rate = rates?.find((r) => r.code === "sterilisation")?.id;
console.log(`contract ${contract && contractReceipt ? "set" : "missing"}`);

// ── Packages: October accepted, November waiting for a decision ────────
async function pack(title, start, end) {
  const id = await must(`package ${title}`, c.coord.rpc("abc_create_package", { p_title: title, p_start: start, p_end: end, p_office: OFFICE }));
  const { data: rows } = await c.coord.rpc("abc_package_cases", { p_package: id });
  if (contract && rate) await soft("claims", c.coord.rpc("operations_configure_package", { p_request: randomUUID(), p_package: id, p_contract: contract, p_claims: (rows ?? []).map((r) => ({ case_id: r.case_id, rate_id: rate, units: 1 })) }));
  await must("submit", c.coord.rpc("abc_package_act", { p_package: id, p_kind: "submitted" }));
  return id;
}
const oct = await pack("ABC claims · October 2026", "2026-10-01", "2026-10-31");
await soft("query", c.reviewer.rpc("abc_package_act", { p_package: oct, p_kind: "query", p_body: "Please confirm the release points for the Whitefield animals." }));
await soft("answer", c.coord.rpc("abc_package_act", { p_package: oct, p_kind: "answer", p_body: "Released where caught, near the market; locations are on each record." }));
await soft("accept", c.reviewer.rpc("abc_package_act", { p_package: oct, p_kind: "accepted" }));
const nov = await pack("ABC claims · 1–4 November 2026", "2026-11-01", "2026-11-04");
console.log(`packages: October ${oct}, November ${nov}`);
console.log("Done. Every record is labelled as a sample.");
