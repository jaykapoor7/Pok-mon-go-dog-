/* Illustrative records for the signed-out view of the Government and Healthcare record pages. Every name, code and
   figure is invented and is shown with the "Sample data" chip. There is no real patient, animal or payment here. */

import type { Alert, Exposure, Handoff, Network, Overview, Sample, SampleEvent } from "@/oh/data";
import type { Attestation, Checklist, Evidence, HistoryRow, Package, PackageCase, PackageEvent } from "@/lib/abc";
import type { ClaimItem, Contract, ContractRate, Reconciliation } from "@/lib/reconciliation";
import { BITES, LAB_DETAIL, LAB_SAMPLES, REVIEWS, VET_PROCS } from "../fixtures";

const iso = (daysAgo: number, h = 10) => { const d = new Date(Date.now() - daysAgo * 864e5); d.setHours(h, 0, 0, 0); return d.toISOString(); };
const date = (daysAgo: number) => iso(daysAgo).slice(0, 10);

/* ── A package sent to the reviewing office ─────────────────────── */
export function samplePackage(id: string): { pkg: Package; operator: string; cases: PackageCase[]; events: PackageEvent[]; rec: Reconciliation } {
  const r = REVIEWS.find((x) => x.id === id) ?? REVIEWS[1];
  const status = r.state === "Submitted" ? "submitted" : r.state === "Query open" ? "queried" : r.state === "Accepted" ? "accepted" : r.state === "Returned" ? "returned" : "partially_accepted";
  const animals = [
    { code: "SP-1071", title: "Brown street dog, female", place: "Ward 08", vet: "Dr. Arun K.", rev: "Nisha R.", missing: [] as string[], kinds: ["capture_photo", "surgery_record", "ear_notch_photo", "release_photo", "release_location"] },
    { code: "SP-1067", title: "Bhura, male", place: "Ward 08", vet: "Dr. Arun K.", rev: "Nisha R.", missing: [], kinds: ["capture_photo", "surgery_record", "ear_notch_photo", "release_photo", "release_location"] },
    { code: "SP-1059", title: "Pale female near the market", place: "Ward 05", vet: null, rev: "Nisha R.", missing: [], kinds: ["capture_photo", "surgery_record", "ear_notch_photo", "release_photo", "release_location"] },
    { code: "SP-1042", title: "Black and tan male", place: "Ward 05", vet: "Dr. Arun K.", rev: null, missing: ["release_photo"], kinds: ["capture_photo", "surgery_record", "ear_notch_photo", "release_location"] },
    { code: "SP-1038", title: "Raja, male", place: "Ward 12", vet: "Dr. Arun K.", rev: "Nisha R.", missing: [], kinds: ["capture_photo", "surgery_record", "ear_notch_photo", "release_photo", "release_location"] },
  ];
  const cases: PackageCase[] = animals.map((a, i) => ({ case_id: `case-${i + 1}`, case_code: a.code, title: a.title, city: a.place, created_at: iso(12 - i), evidence: a.kinds.map((k) => ({ kind: k, url: null, location: k === "release_location" ? `${a.place}, near the water tank` : null, at: iso(11 - i) })), vet_name: a.vet, reviewer_name: a.rev }));
  const items: ClaimItem[] = animals.map((a, i) => ({
    key: `case-${i + 1}:steril`, case_id: `case-${i + 1}`, claim_id: `claim-${i + 1}`, case_code: a.code, animal_id: i === 4 ? "animal-1" : `animal-${i + 1}`, title: a.title, procedure: "sterilisation", procedure_label: "Sterilisation",
    claimed_units: 1, unit_rate: "1450.00", claimed_amount: "1450.00", decision: i === 0 && status !== "submitted" ? "accepted" : "pending", accepted_units: null, note: null, reviewer: null, decided_at: null, missing: a.missing.map((m) => m.replace(/_/g, " ")),
    evidence_snapshot: a.kinds.map((k) => ({ kind: k, url: null, location: k === "release_location" ? `${a.place}, near the water tank` : null })), signoffs_snapshot: [...(a.vet ? [{ id: `att-v${i}`, kind: "vet_authorised", actor: a.vet }] : []), ...(a.rev ? [{ id: `att-r${i}`, kind: "evidence_reviewed", actor: a.rev }] : [])], snapshot_at: iso(6), source_hash: null, decision_id: null, snapshot_id: `snap-${i}`,
  }));
  const contract: Contract = { id: "ct-1", ngo_id: "ngo-1", office_id: "office-1", name: "East Zone ABC services", version: 2, reference: "Work order EZ/ABC/2026-27 (illustrative)", starts_on: date(220), ends_on: date(-140), currency: "INR", illustrative: true };
  const rec: Reconciliation = { package_id: id, status, item_review_enabled: true, contract, items, currency: "INR", claimed_amount: "7250.00", reviewed_amount: items[0].decision === "accepted" ? "1450.00" : "0.00", accepted_amount: items[0].decision === "accepted" ? "1450.00" : "0.00", paid_amount: "0.00", payment_exceeds_accepted: false, generated_at: iso(0), payment_processing: false };
  const pkg: Package = { id, ngo_id: "ngo-1", office_id: "office-1", title: r.title, period_start: date(45), period_end: date(15), case_ids: cases.map((c) => c.case_id), summary: { records: r.records, vet_authorised: r.vet, evidence_items: r.evidence }, status, item_review_enabled: true, created_at: iso(10), submitted_at: iso(r.days || 1), decided_by_name: status === "accepted" || status === "returned" ? "A. Reviewer" : null, decided_at: status === "accepted" || status === "returned" ? iso(1) : null };
  const events: PackageEvent[] = [
    { id: "e1", actor_name: "Nisha R.", side: "operator", kind: "created", body: null, created_at: iso(10) },
    { id: "e2", actor_name: "Nisha R.", side: "operator", kind: "submitted", body: "October sterilisation records, with evidence and the veterinarian's sign-offs.", created_at: iso(r.days || 1) },
    ...(status === "queried" ? [{ id: "e3", actor_name: "A. Reviewer", side: "reviewer" as const, kind: "query", body: "Two release dates are before the surgery dates. Please check SP-1042 and SP-1038.", created_at: iso(2) }] : []),
  ];
  return { pkg, operator: r.operator, cases: cases.slice(0, 5), events, rec };
}

/* ── Contracts ──────────────────────────────────────────────────── */
export const SAMPLE_CONTRACTS: { contracts: (Contract & { operator: string; office: string })[]; rates: ContractRate[] } = {
  contracts: [
    { id: "ct-2", ngo_id: "ngo-1", office_id: "office-1", name: "East Zone ABC services", version: 2, reference: "Work order EZ/ABC/2026-27 (illustrative)", starts_on: date(220), ends_on: date(-140), currency: "INR", illustrative: true, operator: "Street Care Trust", office: "East Zone office" },
    { id: "ct-1", ngo_id: "ngo-1", office_id: "office-1", name: "East Zone ABC services", version: 1, reference: "Work order EZ/ABC/2025-26 (illustrative)", starts_on: date(580), ends_on: date(221), currency: "INR", illustrative: true, operator: "Street Care Trust", office: "East Zone office" },
    { id: "ct-3", ngo_id: "ngo-2", office_id: "office-1", name: "Ward 01 and 02 vaccination", version: 1, reference: "Letter of award 14/2026 (illustrative)", starts_on: date(120), ends_on: date(-245), currency: "INR", illustrative: true, operator: "Kind Hour", office: "East Zone office" },
  ],
  rates: [
    { id: "r1", contract_id: "ct-2", code: "sterilisation", label: "Sterilisation per animal", unit_rate: "1450.00", required_evidence: ["capture_photo", "surgery_record", "ear_notch_photo", "release_photo", "release_location"], required_events: [], vet_required: true },
    { id: "r2", contract_id: "ct-2", code: "vaccination", label: "ARV vaccination per animal", unit_rate: "120.00", required_evidence: [], required_events: ["vaccination"], vet_required: true },
    { id: "r3", contract_id: "ct-1", code: "sterilisation", label: "Sterilisation per animal", unit_rate: "1300.00", required_evidence: ["capture_photo", "surgery_record", "ear_notch_photo", "release_photo"], required_events: [], vet_required: true },
    { id: "r4", contract_id: "ct-3", code: "vaccination", label: "ARV vaccination per animal", unit_rate: "110.00", required_evidence: [], required_events: ["vaccination"], vet_required: false },
  ],
};

/* ── A programme ────────────────────────────────────────────────── */
export const SAMPLE_PROGRAMME = { id: "prog-1", slug: "sample", name: "East Zone rabies programme", parent_id: null, summary: "A city pilot linking bite care, laboratory testing and dog vaccination across the East Zone wards. Illustrative.", status: "pilot", vaccination_target: 0.7, config: { modules: ["bite_care", "laboratory", "followups", "vaccination", "services", "training"], followup_due_days: 3, dog_revaccination_days: 365 }, plan: "pilot", illustrative: true, time_zone: "Asia/Kolkata" };
export const SAMPLE_OVERVIEW: Overview = {
  programme: { id: "prog-1", slug: "sample", name: "East Zone rabies programme", status: "pilot", illustrative: true, target: 0.7, summary: SAMPLE_PROGRAMME.summary, modules: SAMPLE_PROGRAMME.config.modules, suppress_below: 5, parent: { slug: "state", name: "State One Health programme" } },
  since: date(90), today: date(0), can_oversee: true, can_manage: true, children: [],
  partners: [
    { id: "o1", name: "Kind Hour", short_name: "Kind Hour", kind: "ngo", responsibilities: "Sterilisation and vaccination in Wards 01 and 02", members: 9, open: 2, overdue: 0 },
    { id: "o2", name: "Street Care Trust", short_name: "SCT", kind: "ngo", responsibilities: "Sterilisation in Wards 05 and 08; bite follow-ups", members: 7, open: 3, overdue: 2 },
    { id: "o3", name: "Health centre · Ward 08", short_name: "HC 08", kind: "clinic", responsibilities: "Bite care and vaccine doses", members: 4, open: 1, overdue: 1 },
    { id: "o4", name: "District hospital", short_name: "District hospital", kind: "hospital", responsibilities: "Referrals for severe exposures", members: 6, open: 0, overdue: 0 },
    { id: "o5", name: "Veterinary laboratory", short_name: "Vet lab", kind: "laboratory", responsibilities: "Rabies testing of submitted samples", members: 3, open: 2, overdue: 0 },
  ],
  exposures: { total: 70, category_iii: 21, washed: 38, washed_known: 52, by_week: [], by_area: [] },
  pep: { courses: 49, completed: 31, lost: 6, active: 12, completion_rate: 0.84, doses_overdue: 4 },
  samples: { total: 6, waiting: 2, positive: 1, negative: 3, median_days_to_result: 4, positive_areas: ["Ward 08"] },
  handoffs: { open: 6, overdue: 2, done: 14, median_days_to_close: 3.5, service_gaps: 1 },
  services: { facilities: 4, confirmed: 3, stale: 1, arv_unavailable: 1, arv_limited: 0, never_confirmed: 0 },
  vaccination: [
    { area: "Ward 01", area_id: "a1", registered: 412, vaccinated: 318, estimate: { dogs: 430, method: "Street survey, mark and resight", source: "Kind Hour field survey", on: date(70) } },
    { area: "Ward 05", area_id: "a5", registered: 280, vaccinated: 151, estimate: { dogs: 360, method: "Street survey", source: "Street Care Trust", on: date(95) } },
    { area: "Ward 08", area_id: "a8", registered: 301, vaccinated: 172, estimate: { dogs: 282, method: "Street survey", source: "Street Care Trust", on: date(40) } },
    { area: "Ward 12", area_id: "a12", registered: 96, vaccinated: 41, estimate: null },
  ],
  training: { sessions: 4, participants: 86, by_audience: { healthcare: 38, animal_handlers: 30, laboratory: 6, community: 12 } },
};
export const SAMPLE_ALERTS: Alert[] = [
  { key: "a1", kind: "positive_result", severity: "urgent", title: "Positive rabies result, Ward 08", detail: "Resulted by the veterinary laboratory. Animal follow-up requested from Street Care Trust.", area: "Ward 08", organisation_id: null, ref: {}, at: iso(0), ack: null },
  { key: "a2", kind: "pep_readiness", severity: "urgent", title: "Health centre · Ward 08: anti-rabies vaccine not available", detail: "Confirmed by the duty medical officer. Referral pathway for this: District hospital.", area: "Ward 08", organisation_id: "o3", ref: {}, at: iso(0), ack: null },
  { key: "a3", kind: "doses_overdue", severity: "attention", title: "4 vaccine doses overdue", detail: "Across two health centres. Patient details stay with the facilities.", area: null, organisation_id: null, ref: {}, at: iso(1), ack: null },
  { key: "a4", kind: "coverage_below_target", severity: "attention", title: "Ward 05 below the 70% target", detail: "42% of the dated survey estimate.", area: "Ward 05", organisation_id: null, ref: {}, at: iso(1), ack: { by: "Programme lead", at: iso(1), note: "Drive planned for next week" } },
];
export const SAMPLE_NETWORK: Network = {
  facilities: [
    { id: "o4", name: "District hospital", short_name: "District hospital", kind: "hospital", area: "Ward 01", area_id: "a1", address: null, phone: null, hours: "Every day, 8 am to 8 pm", lat: null, lng: null, listed_publicly: true, illustrative: true, services: [{ service: "arv", status: "available", note: null, verified_at: iso(1), valid_until: iso(-5) }, { service: "rig", status: "available", note: null, verified_at: iso(1), valid_until: iso(-5) }], active_courses: 12, samples_waiting: null },
    { id: "o3", name: "Health centre · Ward 08", short_name: "HC 08", kind: "clinic", area: "Ward 08", area_id: "a8", address: null, phone: null, hours: "Mon to Sat, 9 am to 4 pm", lat: null, lng: null, listed_publicly: true, illustrative: true, services: [{ service: "arv", status: "unavailable", note: "Supply expected Thursday", verified_at: iso(0), valid_until: iso(-2) }, { service: "wound_care", status: "available", note: null, verified_at: iso(0), valid_until: iso(-2) }], active_courses: "<5", samples_waiting: null },
    { id: "o5", name: "Veterinary laboratory", short_name: "Vet lab", kind: "laboratory", area: "Ward 02", area_id: "a2", address: null, phone: null, hours: "Mon to Fri, 9 am to 5 pm", lat: null, lng: null, listed_publicly: false, illustrative: true, services: [{ service: "rabies_testing", status: "available", note: null, verified_at: iso(4), valid_until: iso(-3) }], active_courses: null, samples_waiting: 2 },
  ],
  referrals: [{ from: "o3", to: "o4", service: "rig", note: "Category III exposures" }, { from: "o3", to: "o4", service: "arv", note: "When the centre has no vaccine" }],
  areas: [], can_configure: true,
};
export const SAMPLE_HANDOFFS: Handoff[] = [
  { id: "h1", programme_id: "prog-1", kind: "animal_followup", from_org: "o3", to_org: "o2", title: "Find and observe the dog involved in a bite on 13 Nov", detail: "Animal: brown, collar, near the bus stop.", area_id: "a8", place: "Bus stop, 4th cross", animal_id: null, sample_id: null, status: "accepted", due_on: date(1), outcome: null, created_at: iso(3), closed_at: null, closed_by_name: null },
  { id: "h2", programme_id: "prog-1", kind: "vaccination_request", from_org: "coord", to_org: "o1", title: "Vaccinate dogs around the market", detail: null, area_id: "a1", place: null, animal_id: null, sample_id: null, status: "open", due_on: date(-6), outcome: null, created_at: iso(1), closed_at: null, closed_by_name: null },
  { id: "h3", programme_id: "prog-1", kind: "service_gap", from_org: "coord", to_org: "o3", title: "Vaccine stock gap at the Ward 08 centre", detail: null, area_id: "a8", place: null, animal_id: null, sample_id: null, status: "done", due_on: date(4), outcome: "Referral pathway to the district hospital agreed until stock arrives", created_at: iso(8), closed_at: iso(5), closed_by_name: "Medical officer" },
];
export const SAMPLE_NAMES: Record<string, string> = { o1: "Kind Hour", o2: "Street Care Trust", o3: "Health centre · Ward 08", o4: "District hospital", o5: "Veterinary laboratory", coord: "Programme coordination", a1: "Ward 01", a2: "Ward 02", a5: "Ward 05", a8: "Ward 08", a12: "Ward 12" };

/* ── A bite presentation ─────────────────────────────────────────── */
export function sampleExposure(id: string): Exposure {
  const b = BITES.find((x) => x.id === id) ?? BITES[1];
  const waiting = b.course === "Waiting for a clinician";
  const n = b.course === "Completed" ? 4 : b.course === "Did not return" ? 2 : b.doses.startsWith("3") ? 3 : 2;
  return {
    id: b.id, code: b.code, facility_id: "fac-1", patient_ref: b.ref, age_band: b.age.replace("–", "-"), sex: "not_recorded", area: b.area, area_id: null, exposure_on: date(waiting ? 0 : 6), presented_on: date(waiting ? 0 : 6), exposure_kind: "bite",
    category: waiting ? "not_recorded" : b.category, category_by_name: waiting ? null : "Dr. Meera S.", wound_washed: waiting ? "not_recorded" : "at_facility", animal_species: b.species.toLowerCase(), animal_ownership: "community", animal_description: "Brown dog with a torn left ear", animal_place: "Near the bus stop",
    source: "walk_in", contact_phone: "98450 00000", reminder_consent: true, my_role: "clinician", today: date(0), can: { assess: true, prescribe: true, record_dose: true },
    course: waiting ? null : { id: `course-${b.id}`, regimen: "As written in the facility protocol (illustrative)", rig_given: b.category === "III", prescribed_by_name: "Dr. Meera S.", prescribed_at: iso(6), status: b.course === "Completed" ? "completed" : b.course === "Did not return" ? "lost_to_follow_up" : "active", status_note: b.course === "Did not return" ? "Two calls unanswered" : null },
    doses: waiting ? [] : Array.from({ length: 4 }, (_, i) => ({ id: `dose-${b.id}-${i + 1}`, dose_no: i + 1, due_on: date(6 - [0, 3, 7, 14][i]), given_on: i < n ? date(6 - [0, 3, 7, 14][i]) : null, given_by_name: i < n ? "Nurse Kavya" : null, batch: i < n ? "B-2611-07" : null, status: i < n ? "given" as const : b.course === "Did not return" ? "cancelled" as const : "due" as const })),
    handoff: { id: "h1", status: "accepted", to: "Street Care Trust", outcome: null }, history: [{ at: iso(6), action: "record_exposure" }, ...(waiting ? [] : [{ at: iso(6), action: "set_category" }, { at: iso(6), action: "prescribe" }, { at: iso(6), action: "record_dose_given" }])],
  };
}

/* ── A laboratory sample ─────────────────────────────────────────── */
export function sampleSample(id: string): { s: Sample; events: SampleEvent[]; from: string; lab: string } {
  const r = LAB_SAMPLES.find((x) => x.id === id) ?? LAB_SAMPLES[2];
  const d = LAB_DETAIL[r.id];
  const status = r.status.toLowerCase();
  const s: Sample = { id: r.id, code: r.code, submitted_by: "o2", laboratory_id: "o5", animal_id: null, species: r.species.toLowerCase(), sample_type: r.type.toLowerCase().replace(/ /g, "_"), reason: "Found dead near the market; bit a passer-by two days earlier", collected_on: date(r.days), collected_by_name: "Field team", area_id: null, place: r.area, status, result: r.result ? r.result.toLowerCase() : null, method: d.method, result_note: null, resulted_at: d.on ? iso(5) : null, resulted_by_name: d.by, created_at: iso(r.days) };
  const actions = ["collected", "dispatched", "received", "testing", "resulted"];
  const events: SampleEvent[] = d.custody.map((c, i) => ({ id: i, sample_id: r.id, at: iso(r.days - i), actor_name: c.who, organisation_id: null, action: actions.find((a) => c.what.toLowerCase().startsWith(a.slice(0, 5))) ?? "note", note: c.note ?? null }));
  return { s, events, from: r.from, lab: "Reference Rabies Diagnostic Laboratory" };
}

/* ── An ABC procedure and its evidence ───────────────────────────── */
export function sampleProcedure(id: string): { head: { id: string; case_code: string; title: string; city: string; zone: string; created_at: string; provenance: null; status: string }; chk: Checklist; ev: Evidence[]; att: Attestation[]; hist: HistoryRow[] } {
  const p = VET_PROCS.find((x) => x.id === id) ?? VET_PROCS[0];
  const all = ["capture_photo", "surgery_record", "ear_notch_photo", "release_photo", "release_location"] as const;
  const missing = p.stage === "Needs evidence" ? (["release_photo"] as const) : ([] as const);
  const have = all.filter((k) => !(missing as readonly string[]).includes(k));
  const signed = p.stage === "Signed";
  return {
    head: { id: p.id, case_code: p.code, title: `Sterilisation · ${p.animal}`, city: "Bengaluru", zone: "Ward 08", created_at: iso(2), provenance: null, status: "in_progress" },
    chk: { amendable: true, clinical_ready: true, items: Object.fromEntries(all.map((k) => [k, have.includes(k)])) as Checklist["items"], required: [...all], missing: [...missing], vet_authorised: signed, evidence_reviewed: false, government_accepted: false },
    ev: have.map((k, i) => ({ id: `ev-${i}`, kind: k, url: null, title: null, location_text: k === "release_location" ? "Ward 08, near the water tank" : null, captured_at: iso(2), created_at: iso(2 - i * 0.2) })),
    att: signed ? [{ id: "att-1", kind: "vet_authorised", actor_id: "vet-1", actor_name: "Dr. Arun K.", actor_role: "veterinarian", note: null, created_at: iso(1), revoked_at: null }] : [],
    hist: [{ at: iso(2), kind: "evidence", actor: "Field team A", detail: "Capture photo" }, { at: iso(2), kind: "evidence", actor: "Dr. Arun K.", detail: "Surgery record" }, ...(signed ? [{ at: iso(1), kind: "vet_authorised", actor: "Dr. Arun K.", detail: "" }] : [])],
  };
}
