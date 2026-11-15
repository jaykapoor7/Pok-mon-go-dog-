/* Sample records for the NGO record pages when nobody is signed in. Every name, place and number is invented and is
   shown with the "Sample data" chip. Built on src/nx/fixtures.ts, which stays as it is. */

import { CASES, REPORTS, type Trust } from "../fixtures";

export type CaseRow = {
  id: string; code: string; title: string; kind: string; severity: string; crit: boolean; place: string; who: string; assigneeId: string | null;
  open: boolean; statusClass: string; status: string; tone: "plain" | "accent" | "ok" | "warn" | "bad"; next: string; due: string | null; dueSoon: boolean; overdue: boolean;
  updated: string; updatedAt: number; occurredAt: number; historical: boolean; stale: boolean; reasonless: boolean; trust: Trust; animal: string | null; dogId: string | null; href: string; detail?: string | null;
};

const fromFixture = CASES.map((c): CaseRow => ({
  id: c.id, code: c.code, title: c.title, kind: c.kind, severity: c.severity, crit: c.severity === "Critical" || c.severity === "High", place: c.place, who: c.who, assigneeId: null,
  open: !c.resolved, statusClass: c.resolved ? "closed" : c.stage === "Triage" ? "open" : "in_progress", status: c.resolved ? "Resolved" : c.stage, tone: c.resolved ? "ok" : c.severity === "Critical" ? "bad" : c.severity === "High" ? "warn" : "plain",
  next: c.next, due: c.due, dueSoon: c.due === "Today", overdue: false, updated: c.updated, updatedAt: 0, occurredAt: 0, historical: false, stale: false, reasonless: false, trust: c.trust,
  animal: c.id === "c2" ? "AN-0987" : c.id === "c3" ? "AN-0951" : c.id === "c5" ? "AN-1107" : null, dogId: null, href: `/next/ngo/cases/${c.id}`, detail: null,
}));
/* Two more, so the views for work that waits on a decision have something to show. Neither is in today's work. */
export const SAMPLE_CASES: CaseRow[] = [
  ...fromFixture,
  { id: "c8", code: "CASE-0102", title: "Skin infection near the Ward 05 market", kind: "Injury", severity: "Normal", crit: false, place: "Ward 05", who: "Field team B", assigneeId: null, open: true, statusClass: "open", status: "Open 140 days, quiet 61", tone: "warn", next: "Is anyone still working it?", due: null, dueSoon: false, overdue: false, updated: "16 Sep", updatedAt: 0, occurredAt: 0, historical: false, stale: true, reasonless: false, trust: "Recorded", animal: null, dogId: null, href: "/next/ngo/cases/c8" },
  { id: "c9", code: "IMP-2291", title: "Road accident, 2024 register", kind: "Rescue", severity: "High", crit: false, place: "Ward 03", who: "Unassigned", assigneeId: null, open: true, statusClass: "open", status: "Imported, never confirmed", tone: "plain", next: "Confirm or close with a reason", due: null, dueSoon: false, overdue: false, updated: "Mar 2024", updatedAt: 0, occurredAt: 0, historical: true, stale: false, reasonless: false, trust: "Imported", animal: null, dogId: null, href: "/next/ngo/cases/c9" },
];

export type SampleHistory = { id: string; when: string; title: string; who: string; kind: "note" | "status" | "care" | "followup" };
export type SampleFollowup = { id: string; due_at: string; status: string; kind: string | null; note: string | null; completed_at: string | null };
const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
export const SAMPLE_HISTORY: Record<string, SampleHistory[]> = {
  c1: [{ id: "h1", when: "10 min ago", title: "Reported by a resident: hit by a two-wheeler, cannot stand", who: "Citizen report", kind: "note" }],
  c2: [
    { id: "h2", when: "2 h ago", title: "Recovery observed: eating, wound clean", who: "Dr. Arun K.", kind: "note" },
    { id: "h3", when: "12 Nov", title: "Sterilisation", who: "Dr. Arun K., veterinarian", kind: "care" },
    { id: "h4", when: "11 Nov", title: "Status → in progress", who: "Nisha R.", kind: "status" },
  ],
};
export const sampleHistory = (id: string): SampleHistory[] => SAMPLE_HISTORY[id] ?? [{ id: `${id}-h`, when: "Earlier", title: "Case opened", who: "Kind Hour team", kind: "status" }];
export const sampleFollowups = (id: string): SampleFollowup[] => (id === "c2" ? [{ id: "f1", due_at: iso(0), status: "upcoming", kind: "recovery_check", note: "Recovery check at the centre", completed_at: null }, { id: "f2", due_at: iso(-5), status: "done", kind: "wound_check", note: "Wound check", completed_at: iso(-5) }]
  : id === "c5" ? [{ id: "f3", due_at: iso(2), status: "upcoming", kind: "observation", note: "Day 7 observation after the bite report", completed_at: null }] : []);

export const SAMPLE_WA = [
  { id: "w1", thread: "t1", who: "Field team A", at: iso(-0.02), text: "Brown female, limping on the left hind leg, near the 14th Main bus stop. Wound looks fresh.", urgency: "urgent" as const, status: "new" },
  { id: "w2", thread: "t2", who: "Resident (Ward 05)", at: iso(-0.3), text: "Puppies under the lorry again this morning. Mother is with them.", urgency: "routine" as const, status: "new" },
];
export const SAMPLE_REPORT_MATCH = REPORTS.filter((r) => r.match).length;

export type SampleCare = { id: string; animal: string; code: string; zone: string; kind: string; date: string; notes: string; by: string };
export const SAMPLE_CARE: SampleCare[] = [
  { id: "m1", animal: "Black and white puppy", code: "AN-0987", zone: "Indiranagar", kind: "Sterilisation", date: "12 Nov 2026", notes: "Recovered well; released at the same lane", by: "Dr. Arun K." },
  { id: "m2", animal: "Brown street dog", code: "AN-1042", zone: "Ward 12", kind: "Vaccination", date: "12 Nov 2026", notes: "Anti-rabies, first dose", by: "Field team A" },
  { id: "m3", animal: "Grey dog, limping", code: "AN-0951", zone: "Ward 12", kind: "Wound care", date: "10 Nov 2026", notes: "Cleaned and dressed", by: "Nisha R." },
  { id: "m4", animal: "Brindle male, market lane", code: "AN-0877", zone: "Ward 08", kind: "Deworming", date: "6 Nov 2026", notes: "", by: "Field team B" },
];

export const SAMPLE_LANES = {
  rescue: [
    { title: "New", says: "Read, then accept or pass on", cards: [{ key: "r1", title: "Dog hit by a two-wheeler, cannot stand", meta: "Ward 12 · Today", tag: "To triage", hot: true }, { key: "r3", title: "Puppies under a parked lorry", meta: "Ward 05 · Today", tag: "To triage" }] },
    { title: "In care", says: "Most urgent first", cards: [{ key: "c1", title: "Injured street dog near the flower market", meta: "CASE-0278 · Ward 12", tag: "Critical", hot: true }, { key: "c3", title: "Limping grey dog, old injury", meta: "CASE-0236 · with Field team A", tag: "In progress" }] },
  ],
  abc: [
    { title: "Vet sign-off", says: "Needs a veterinarian's signature", cards: [{ key: "a1", title: "Sterilisation · AN-0987", meta: "Indiranagar · 3 days", tag: "Sign-off" }] },
    { title: "Evidence", says: "Release photo or place", cards: [{ key: "a2", title: "Sterilisation · AN-0877", meta: "Missing release photo", tag: "4 of 5" }] },
    { title: "Ready to send", says: "Goes into this month's report", cards: [{ key: "a3", title: "Sterilisation · AN-1042", meta: "Signed by Dr. Arun K.", tag: "Review" }] },
  ],
};
