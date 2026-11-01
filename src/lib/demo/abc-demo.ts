/* ════════════════════════════════════════════════════════════════════
   Recording-only ABC workflow. Active solely in a local build with
   NEXT_PUBLIC_DEMO_RECORDING=true (see ../recording-demo.ts); production
   never loads it. It answers the same calls as the database functions in
   ../abc.ts, from illustrative records kept in this browser tab, so the
   real screens run end to end for the product walkthrough.
   ════════════════════════════════════════════════════════════════════ */

import type { AbcContext, Attestation, Evidence, EvidenceKind, HistoryRow, Office, Package, PackageCase, PackageEvent, QueueRow } from "../abc";
import { recordingDemoOrg } from "../recording-demo";

const KEY = "sp.demo.abc.v1";
export const DEMO_OFFICE: Office = { id: "demo-office-adyar", name: "Zone 13 Veterinary Public Health Office", city: "Chennai" };
export const DEMO_RATE = 1650; // ₹ per completed ABC procedure, as agreed in the illustrative contract
export const DEMO_PEOPLE = {
  operator: { id: "recording-demo-operator", name: "Anjali Rao", email: "anjali@coastalpaws-demo.invalid", role: "Programme coordinator" },
  reviewer: { id: "recording-demo-reviewer", name: "Dr. Kavitha Iyer", email: "kavitha.iyer@zone13-demo.invalid", role: "Veterinary officer" },
  vet: "Dr. R. Menon",
  field: "Ravi Kumar",
};

type DemoCase = {
  id: string; code: string; title: string; zone: string; created_at: string; photo: string;
  missing: EvidenceKind[]; vet: boolean; reviewed: boolean; duplicateOf?: string; source?: "whatsapp";
};
type Sanction = { amount: number; records: number; by: string; at: string; ref: string };
type State = { cases: DemoCase[]; packages: (Package & { sanction?: Sanction })[]; events: (PackageEvent & { package_id: string })[] };

const STREETS = ["4th Main Road", "Gandhi Nagar", "Kasturba Nagar", "LB Road", "Indira Nagar", "Besant Avenue", "Canal Bank Road", "Kotturpuram Market", "Shastri Nagar", "Elliot's Beach Road", "Tiger Varadachari Road", "Sardar Patel Road"];
const ZONES = ["Adyar", "Besant Nagar", "Thiruvanmiyur", "Kotturpuram", "Indira Nagar"];
const PHOTOS = ["/seed-dogs/dog1.jpg", "/seed-dogs/dog3.jpg", "/seed-dogs/dog4.jpg", "/seed-dogs/dog5.jpg", "/seed-dogs/dog7.jpg", "/seed-dogs/dog9.jpg", "/seed-dogs/dog6.jpg", "/seed-dogs/dog8.jpg"];

function seed(): State {
  const cases: DemoCase[] = [];
  for (let i = 0; i < 146; i++) {
    const day = 1 + Math.floor((i * 30) / 146);
    const sex = i % 3 === 0 ? "Male" : "Female";
    cases.push({
      id: `demo-abc-${1001 + i}`, code: `ADY-ABC-${1001 + i}`,
      title: `${sex}, ${STREETS[i % STREETS.length]}`, zone: ZONES[i % ZONES.length],
      created_at: new Date(Date.UTC(2026, 9, day, 3 + (i % 9), (i * 7) % 60)).toISOString(),
      photo: PHOTOS[i % PHOTOS.length], missing: [], vet: true, reviewed: true,
    });
  }
  /* The four that hold the month up. */
  const hold = (n: number, c: Partial<DemoCase>) => Object.assign(cases[n], c);
  hold(37, { missing: ["release_photo"], reviewed: false, title: "Female, Canal Bank Road" });
  hold(88, { missing: ["release_photo"], reviewed: false, title: "Female, Kotturpuram Market" });
  hold(121, { vet: false, reviewed: false, title: "Male, Shastri Nagar" });
  hold(140, { reviewed: false, duplicateOf: "ADY-ABC-1093", title: "Female, Besant Avenue" });
  return { cases, packages: [], events: [] };
}

let mem: State | null = null;
function state(): State {
  if (mem) return mem;
  try { const s = sessionStorage.getItem(KEY); if (s) return (mem = JSON.parse(s)); } catch { /* storage blocked */ }
  return (mem = seed());
}
function save() { try { sessionStorage.setItem(KEY, JSON.stringify(state())); } catch { /* fine */ } }
const nowIso = () => new Date().toISOString();
const wait = (ms = 260) => new Promise((r) => setTimeout(r, ms));

/** Who is at the keyboard: the operator by default, the reviewer under /city. */
export function demoPersona(): "operator" | "reviewer" {
  if (typeof window === "undefined") return "operator";
  return window.location.pathname.startsWith("/city") ? "reviewer" : "operator";
}
export const demoUser = () => DEMO_PEOPLE[demoPersona()];

function evidenceOf(c: DemoCase): { kind: EvidenceKind; url: string | null; location: string | null; at: string }[] {
  const all: EvidenceKind[] = ["capture_photo", "surgery_record", "ear_notch_photo", "release_photo", "release_location"];
  return all.filter((k) => !c.missing.includes(k)).map((k) => ({
    kind: k,
    url: k === "release_location" ? null : k === "surgery_record" ? null : c.photo,
    location: k === "release_location" ? `${c.title.split(", ")[1]}, ${c.zone}` : null,
    at: c.created_at,
  }));
}
function row(c: DemoCase, s: State): QueueRow {
  const pk = s.packages.find((p) => p.case_ids.includes(c.id));
  return {
    case_id: c.id, case_code: c.code, title: c.title, city: `${c.zone}, Chennai`, created_at: c.created_at, provenance: c.source === "whatsapp" ? "whatsapp" : "field_app",
    evidence_count: 5 - c.missing.length, missing: c.missing, vet_authorised: c.vet, evidence_reviewed: c.reviewed,
    government_accepted: pk?.status === "accepted", vet_name: c.vet ? DEMO_PEOPLE.vet : null, reviewer_name: c.reviewed ? DEMO_PEOPLE.operator.name : null,
    returned_note: null, returned_by: null, in_package: pk ? pk.status : null,
  };
}

/** Add the case Kaju prepared from a WhatsApp message (on the coordinator's Confirm). */
export function demoAddIntakeCase(title: string, zone: string): string {
  const s = state();
  const n = 1001 + s.cases.length;
  const id = `demo-abc-${n}`;
  s.cases.push({ id, code: `ADY-ABC-${n}`, title, zone, created_at: nowIso(), photo: "/seed-dogs/dog5.jpg", missing: ["surgery_record", "ear_notch_photo", "release_photo", "release_location"], vet: false, reviewed: false, source: "whatsapp" });
  save();
  return id;
}
/** Kaju's confirmed fixes on the blocked records. */
export function demoResolve(code: string, what: "duplicate" | "vet"): void {
  const s = state(); const c = s.cases.find((x) => x.code === code); if (!c) return;
  if (what === "duplicate") { s.cases = s.cases.filter((x) => x !== c); }
  if (what === "vet") { c.vet = true; }
  save();
}
export const demoCaseByCode = (code: string) => state().cases.find((c) => c.code === code)?.id ?? null;

export function demoSanction(id: string): Sanction | null { return state().packages.find((p) => p.id === id)?.sanction ?? null; }
export async function demoSanctionPayment(id: string): Promise<Sanction> {
  await wait(700);
  const s = state(); const p = s.packages.find((x) => x.id === id);
  if (!p || p.status !== "accepted") throw new Error("Accept the package first.");
  const records = p.case_ids.length;
  p.sanction = { amount: records * DEMO_RATE, records, by: DEMO_PEOPLE.reviewer.name, at: nowIso(), ref: `Z13/VPH/ABC/2026-10/${String(records).padStart(4, "0")}` };
  s.events.push({ id: `ev-${Date.now()}`, package_id: id, actor_name: DEMO_PEOPLE.reviewer.name, side: "reviewer", kind: "sanctioned", body: `₹${p.sanction.amount.toLocaleString("en-IN")} sanctioned for payment against ${records} verified procedures at ₹${DEMO_RATE.toLocaleString("en-IN")} each.`, created_at: p.sanction.at });
  save();
  return p.sanction;
}

/* ── the database functions ─────────────────────────────────────────── */
export async function demoRpc<T>(fn: string, a: Record<string, unknown> = {}): Promise<T> {
  await wait();
  const s = state();
  const find = (id: unknown) => s.cases.find((c) => c.id === id);
  switch (fn) {
    case "abc_my_context": {
      const reviewer = demoPersona() === "reviewer";
      return { ngo_id: reviewer ? null : recordingDemoOrg.id, role: reviewer ? null : "coordinator", name: demoUser().name, offices: reviewer ? [DEMO_OFFICE] : [] } satisfies AbcContext as T;
    }
    case "abc_verification_queue": return [...s.cases].sort((x, y) => (x.reviewed === y.reviewed ? y.created_at.localeCompare(x.created_at) : x.reviewed ? 1 : -1)).map((c) => row(c, s)) as T;
    case "abc_case_checklist": {
      const c = find(a.p_case_id); if (!c) throw new Error("Not found");
      const all: EvidenceKind[] = ["capture_photo", "surgery_record", "ear_notch_photo", "release_photo", "release_location"];
      return { items: Object.fromEntries(all.map((k) => [k, !c.missing.includes(k)])), missing: c.missing, vet_authorised: c.vet, evidence_reviewed: c.reviewed, government_accepted: row(c, s).government_accepted } as T;
    }
    case "abc_case_history": {
      const c = find(a.p_case_id); if (!c) return [] as T;
      const h: HistoryRow[] = [{ at: c.created_at, kind: "evidence", actor: c.source === "whatsapp" ? "Kaju, from WhatsApp" : DEMO_PEOPLE.field, detail: "Capture photo" }];
      if (c.vet) h.push({ at: c.created_at, kind: "vet_authorised", actor: DEMO_PEOPLE.vet, detail: "Procedure authorised" });
      if (c.reviewed) h.push({ at: c.created_at, kind: "evidence_reviewed", actor: DEMO_PEOPLE.operator.name, detail: "All five items present" });
      return h as T;
    }
    case "abc_add_evidence": { const c = find(a.p_case_id); if (c) { c.missing = c.missing.filter((k) => k !== a.p_kind); save(); } return "ok" as T; }
    case "abc_vet_authorise": { const c = find(a.p_case_id); if (c) { c.vet = true; save(); } return "ok" as T; }
    case "abc_review_evidence": { const c = find(a.p_case_id); if (c) { if (c.missing.length || !c.vet) throw new Error("Evidence is incomplete"); c.reviewed = true; save(); } return "ok" as T; }
    case "abc_return_evidence": case "abc_revoke_attestation": return "ok" as T;
    case "abc_package_cases": {
      const p = s.packages.find((x) => x.id === a.p_package); if (!p) return [] as T;
      return p.case_ids.map((id) => find(id)).filter(Boolean).map((c) => ({ case_id: c!.id, case_code: c!.code, title: c!.title, city: `${c!.zone}, Chennai`, created_at: c!.created_at, evidence: evidenceOf(c!), vet_name: DEMO_PEOPLE.vet, reviewer_name: DEMO_PEOPLE.operator.name })) satisfies PackageCase[] as T;
    }
    case "abc_create_package": {
      const start = String(a.p_start), end = String(a.p_end) + "T23:59:59Z";
      const ids = s.cases.filter((c) => c.reviewed && !c.missing.length && c.vet && c.created_at >= start && c.created_at <= end && !s.packages.some((p) => p.case_ids.includes(c.id))).map((c) => c.id);
      if (!ids.length) throw new Error("No approved records in that period.");
      const id = `demo-pkg-${s.packages.length + 1}`;
      s.packages.unshift({ id, ngo_id: recordingDemoOrg.id, office_id: String(a.p_office), title: String(a.p_title) || "ABC package", period_start: String(a.p_start), period_end: String(a.p_end), case_ids: ids, summary: { records: ids.length, vet_authorised: ids.length, evidence_items: ids.length * 5, generated_at: nowIso() }, status: "draft", created_at: nowIso(), submitted_at: null, decided_by_name: null, decided_at: null });
      s.events.push({ id: `ev-${Date.now()}`, package_id: id, actor_name: DEMO_PEOPLE.operator.name, side: "operator", kind: "created", body: `${ids.length} approved records, each with five evidence items and a veterinary sign-off. 4 records not ready are held for next month.`, created_at: nowIso() });
      save();
      return id as T;
    }
    case "abc_package_act": {
      const p = s.packages.find((x) => x.id === a.p_package); if (!p) throw new Error("Not found");
      const kind = String(a.p_kind); const reviewer = demoPersona() === "reviewer";
      if (kind === "submitted") { p.status = "submitted"; p.submitted_at = nowIso(); }
      if (kind === "accepted") { p.status = "accepted"; p.decided_by_name = DEMO_PEOPLE.reviewer.name; p.decided_at = nowIso(); }
      if (kind === "returned") p.status = "returned";
      if (kind === "query") p.status = "queried";
      if (kind === "answer") p.status = "submitted";
      s.events.push({ id: `ev-${Date.now()}`, package_id: p.id, actor_name: reviewer ? DEMO_PEOPLE.reviewer.name : DEMO_PEOPLE.operator.name, side: reviewer ? "reviewer" : "operator", kind, body: (a.p_body as string) || (kind === "accepted" ? "Records, evidence and sign-offs checked. Accepted for Zone 13." : kind === "submitted" ? `Submitted to ${DEMO_OFFICE.name}.` : null), created_at: nowIso() });
      save();
      return "ok" as T;
    }
  }
  throw new Error(`${fn} is not part of the walkthrough`);
}

export const demoTables = {
  offices: async (): Promise<Office[]> => (await wait(), [DEMO_OFFICE]),
  packages: async (): Promise<Package[]> => (await wait(), state().packages),
  packageById: async (id: string): Promise<Package | null> => (await wait(), state().packages.find((p) => p.id === id) ?? null),
  packageEvents: async (id: string): Promise<PackageEvent[]> => (await wait(), state().events.filter((e) => e.package_id === id)),
  orgNames: async (ids: string[]): Promise<Record<string, string>> => Object.fromEntries(ids.map((i) => [i, recordingDemoOrg.name])),
  attestations: async (id: string): Promise<Attestation[]> => {
    const c = state().cases.find((x) => x.id === id); if (!c) return [];
    const out: Attestation[] = [];
    if (c.vet) out.push({ id: `${id}-v`, kind: "vet_authorised", actor_id: "vet", actor_name: DEMO_PEOPLE.vet, actor_role: "veterinarian", note: "Spay completed, recovery normal.", created_at: c.created_at, revoked_at: null });
    if (c.reviewed) out.push({ id: `${id}-r`, kind: "evidence_reviewed", actor_id: "op", actor_name: DEMO_PEOPLE.operator.name, actor_role: "coordinator", note: null, created_at: c.created_at, revoked_at: null });
    return out;
  },
  evidence: async (id: string): Promise<Evidence[]> => {
    const c = state().cases.find((x) => x.id === id); if (!c) return [];
    return evidenceOf(c).map((e, i) => ({ id: `${id}-e${i}`, kind: e.kind, url: e.url, title: null, location_text: e.location, captured_at: e.at, created_at: e.at }));
  },
  head: async (id: string) => {
    const c = state().cases.find((x) => x.id === id); if (!c) return null;
    return { id: c.id, case_code: c.code, title: c.title, city: "Chennai", zone: c.zone, created_at: c.created_at, provenance: c.source === "whatsapp" ? "whatsapp" : "field_app", status: "in_progress" };
  },
};
