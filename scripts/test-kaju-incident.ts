/* Kaju's incident briefing (src/sp3/ai/incident.ts), by fixed rules with no model: the hospital's request, the dog
   on the register, what is missing, who does what, and prepared next steps a person confirms. Animal side only:
   it never reads a request's free text or outcome, nor any patient, clinical or dose record. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { withTools } from "../src/sp3/ai/engine";
import { incidentPlace } from "../src/sp3/ai/incident";

let n = 0;
const ok = (m: string) => { n++; console.log(`ok ${n} - ${m}`); };
const today = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const plus = (d: string, k: number) => new Date(Date.parse(`${d}T00:00:00Z`) + k * 86_400_000).toISOString().slice(0, 10);
const mon = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });

type Row = Record<string, unknown>;
const reads: { table: string; cols: string }[] = [];
function db(tables: Record<string, Row[]>, places: Row[]) {
  return {
    from: (table: string) => {
      const filters: ((r: Row) => boolean)[] = [];
      let cap = 1000;
      const q: Record<string, unknown> = {};
      const rows = () => (tables[table] ?? []).filter((r) => filters.every((f) => f(r))).slice(0, cap);
      Object.assign(q, {
        select: (cols: string) => { reads.push({ table, cols }); return q; },
        eq: (k: string, v: unknown) => { filters.push((r) => r[k] === v); return q; },
        in: (k: string, v: unknown[]) => { filters.push((r) => v.includes(r[k])); return q; },
        ilike: (k: string, v: string) => { const re = new RegExp(v.replace(/%/g, ".*"), "i"); filters.push((r) => re.test(String(r[k] ?? ""))); return q; },
        order: () => q,
        limit: (k: number) => { cap = k; return q; },
        maybeSingle: () => Promise.resolve({ data: rows()[0] ?? null, error: null }),
        then: (res: (r: unknown) => unknown) => Promise.resolve({ data: rows(), error: null }).then(res),
      });
      return q;
    },
    rpc: async (name: string) => (name === "oh_my_today" ? { data: places, error: null } : { data: null, error: { message: `rpc ${name} not allowed in this test` } }),
  } as unknown as SupabaseClient;
}

const place = { organisation_id: "ohngo", name: "Sample · Bengaluru Animal Care Trust", short_name: "Animal Care Trust", handoffs_open: 1, handoffs_overdue: 0, doses_due: 97, notices_new: 43 };
const request = { id: "h1", programme_id: "p1", from_org: "th", to_org: "ohngo", kind: "animal_followup", title: `Find and observe the dog involved in a bite on ${mon(today)}`, place: null, area_id: "a-ind", animal_id: null as string | null, status: "open", due_on: plus(today, 3), created_at: `${today}T03:30:00Z`, detail: "SECRET free text", outcome: "SECRET outcome" };
const tables = (linked: boolean): Record<string, Row[]> => ({
  oh_handoffs: [{ ...request, animal_id: linked ? "simba" : null, status: linked ? "accepted" : "open" }, { ...request, id: "h0", area_id: "a-jay", title: "Find and observe the dog in a category III bite" }],
  oh_areas: [{ id: "a-ind", name: "Indiranagar" }, { id: "a-jay", name: "Jayanagar" }],
  oh_organisations: [{ id: "th", name: "Teaching Hospital Anti-Rabies Clinic", short_name: "Teaching hospital" }],
  oh_programmes: [{ id: "p1", slug: "bengaluru-demo", config: { dog_revaccination_days: 365 } }],
  ngos: [{ id: "ngo", city: "Bengaluru" }],
  dogs: [{ id: "simba", ngo_id: "ngo", name: "Simba", code: "IND-112", straypaw_id: "SPA-DOG-C1C5", zone: "Indiranagar", color: "Brown", sterilisation_status: "sterilised", vaccination_status: "vaccinated", cover_photo: "x.jpg", last_seen: "2026-11-07" },
    { id: "tiger", ngo_id: "ngo", name: "Tiger", code: "IND-132", straypaw_id: null, zone: "Indiranagar", color: "Brown", sterilisation_status: "unknown", vaccination_status: "unknown", cover_photo: null, last_seen: "2026-11-07" }],
  medical_events: [{ dog_id: "simba", kind: "sterilisation", event_date: plus(today, -12) }, { dog_id: "simba", kind: "vaccination", event_date: plus(today, -391) }],
  animal_followups: [],
  org_case_facts: [{ id: "c1", ngo_id: "ngo", dog_id: "simba", case_code: "SPC-F5367A809C", title: "ABC · Simba, Indiranagar", status_class: "in_progress", next_due: null }],
});
const Q = "What's happening with the Indiranagar bite incident? What's missing, and what do the teams need to do next?";

async function main() {
  assert.equal(incidentPlace(Q), "Indiranagar");
  assert.equal(incidentPlace("Any update on the bite in Jayanagar?"), "Jayanagar");
  assert.equal(incidentPlace("What's happening with the bite?"), null);
  ok("the place is read from the question");

  /* Before anyone has acted: not accepted, no dog linked, candidates listed and none chosen. */
  const before = await withTools(Q, { db: db(tables(false), [place]), orgId: "ngo", userName: "Farah", userId: "u", actorRole: "coordinator" });
  assert.ok(before.tools.some((t) => t.name === "incident_briefing"), JSON.stringify(before.tools));
  assert.match(before.text, /Indiranagar bite on/);
  assert.match(before.text, /Teaching Hospital Anti-Rabies Clinic asked Animal Care Trust/);
  assert.match(before.text, /waiting to be accepted/);
  assert.match(before.text, /Nobody at Animal Care Trust has accepted/);
  assert.match(before.text, /No animal is linked/);
  assert.match(before.text, /Simba \(IND-112\)/);
  assert.match(before.text, /I have not chosen one/);
  assert.match(before.text, /does not read patient or dose records/);
  assert.doesNotMatch(before.text, /Jayanagar/, "the other area's request is not this incident");
  ok("before the team acts: what is waiting, who must accept, which dogs could be it; Kaju chooses none");

  /* After the team linked Simba: observation not planned, revaccination overdue, both prepared, nothing saved. */
  reads.length = 0;
  const after = await withTools(Q, { db: db(tables(true), [place]), orgId: "ngo", userName: "Farah", userId: "u", actorRole: "coordinator" });
  assert.match(after.text, /\*\*The dog:\*\* Simba \(IND-112\), brown, linked to the request/);
  assert.match(after.text, /in progress/);
  assert.match(after.text, /ten-day observation of Simba is not planned/);
  assert.match(after.text, /391 days ago, past the programme's 365-day interval/);
  assert.match(after.text, /Observe Simba on days 3 \(/);
  assert.match(after.text, /revaccinate against rabies/);
  assert.match(after.text, /I prepared 2 things below\. Nothing is saved until you confirm\./);
  const kinds = after.proposals.map((p) => p.kind).sort();
  assert.deepEqual(kinds, ["open_case", "schedule_followup"]);
  const obs = after.proposals.find((p) => p.kind === "open_case");
  assert.ok(obs && obs.kind === "open_case" && /\(request h1\)$/.test(obs.title) && obs.dogId === "simba" && obs.zone === "Indiranagar" && /days 3 .*7 .*10/.test(obs.description) && /No patient details/.test(obs.description));
  assert.ok(after.citations.some((c) => c.href === "/gov/programmes/bengaluru-demo?tab=Work"));
  assert.ok(after.citations.some((c) => c.href === "/ngo/animals/simba"));
  assert.ok(after.citations.some((c) => c.href === "/ngo/cases/c1"));
  ok("after the dog is linked: observation and revaccination are flagged, prepared for confirmation, and every fact links to its record");

  /* A second run on the same request: the observation case (by its request reference) and the revaccination exist. */
  const t2 = tables(true);
  t2.org_case_facts.push({ id: "c2", ngo_id: "ngo", dog_id: "simba", case_code: "SPC-OBS", title: "Observe Simba after the Indiranagar bite on 16 Nov (request h1)", status_class: "open", next_due: null });
  t2.animal_followups = [{ id: "f1", case_id: "c1", status: "upcoming", note: "Revaccinate Simba against rabies" }];
  const again = await withTools(Q, { db: db(t2, [place]), orgId: "ngo", userName: "Farah", userId: "u", actorRole: "coordinator" });
  assert.equal(again.proposals.length, 0, JSON.stringify(again.proposals));
  assert.match(again.text, /Observation:\*\* planned on a case/);
  assert.match(again.text, /Revaccination is scheduled but not done yet/);
  assert.match(again.text, /Nothing needs preparing right now/);
  /* A new request (a new rehearsal or a new bite) is a new observation. */
  const t3 = tables(true); t3.oh_handoffs[0] = { ...t3.oh_handoffs[0], id: "h9" }; t3.org_case_facts.push(t2.org_case_facts[1]);
  const fresh = await withTools(Q, { db: db(t3, [place]), orgId: "ngo", userName: "Farah", userId: "u", actorRole: "coordinator" });
  assert.ok(fresh.proposals.some((p) => p.kind === "open_case" && /\(request h9\)/.test(p.title)));
  ok("nothing is prepared twice: an observation case per request, one revaccination follow-up");

  /* Privacy: only the request's own fields, the register and its care; never free text, outcome or anything clinical. */
  const tablesRead = [...new Set(reads.map((r) => r.table))].sort();
  assert.deepEqual(tablesRead, ["animal_followups", "dogs", "medical_events", "ngos", "oh_areas", "oh_handoffs", "oh_organisations", "oh_programmes", "org_case_facts"]);
  const hand = reads.filter((r) => r.table === "oh_handoffs").map((r) => r.cols).join(",");
  assert.doesNotMatch(hand, /detail|outcome|patient|phone/);
  assert.doesNotMatch(JSON.stringify(after), /SECRET|97|43|doses_due|notices_new/);
  const src = readFileSync(new URL("../src/sp3/ai/incident.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\//g, ""), /oh_clinic|oh_record|health\.|exposures|pep_|citizen_notices|detail,|,detail|outcome,|,outcome/);
  ok("privacy: the request's own fields only, never its free text, outcome or any patient, clinical or dose record");

  const outside = await withTools(Q, { db: db(tables(true), []), orgId: "ngo", userName: "Farah", userId: "u", actorRole: "coordinator" });
  assert.match(outside.text, /not part of a programme/);
  const none = await withTools("What's happening with the Yelahanka bite?", { db: db(tables(true), [place]), orgId: "ngo", userName: "Farah", userId: "u", actorRole: "coordinator" });
  assert.match(none.text, /no bite follow-up about yelahanka/i);
  const signedOut = await withTools(Q, { db: db(tables(true), [place]), orgId: null, userName: null, userId: undefined, actorRole: null });
  assert.match(signedOut.text, /organisation workspace/);
  ok("outside a programme, an unknown place and a signed-out visitor are each told plainly; nothing is guessed");

  console.log(`\n${n} incident briefing checks passed`);
}
main().catch((e) => { console.error(e); process.exit(1); });
