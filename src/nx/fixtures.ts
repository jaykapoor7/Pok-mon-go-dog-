/* Synthetic records for the Stage 1 screens. Every name, place and number here is invented.
   Nothing in this file is read from, or written to, a database. */

export type Tone = "plain" | "accent" | "ok" | "warn" | "bad";
export type Trust = "Imported" | "Recorded" | "Reviewed" | "Verified";

export const ORG = { name: "Kind Hour", short: "KH", kind: "NGO workspace", city: "Bengaluru" };
export const ME = { name: "Priya", initials: "PM" };

export type Work = { id: string; title: string; ref: string; kind: string; who: string; place: string; state: string; tone: Tone; when: string; group: "Now" | "Today" | "This week"; animal?: string };
export const WORK: Work[] = [
  { id: "w1", title: "Injured street dog near the flower market", ref: "CASE-0278", kind: "Rescue", who: "Unassigned", place: "Ward 12", state: "Needs assignment", tone: "bad", when: "10 min", group: "Now", animal: "AN-1042" },
  { id: "w2", title: "Three location photos missing from the drive", ref: "CAM-0108", kind: "Evidence", who: "Nisha R.", place: "Ward 08", state: "Waiting on field", tone: "warn", when: "45 min", group: "Now" },
  { id: "w3", title: "Recovery check after sterilisation", ref: "CASE-0241", kind: "Follow-up", who: "Dr. Arun K.", place: "Indiranagar", state: "Due 4:30 pm", tone: "accent", when: "2 h", group: "Today", animal: "AN-0987" },
  { id: "w4", title: "Return visit: two dogs not found at the stop", ref: "VIS-0443", kind: "Vaccination", who: "Field team A", place: "Ward 12", state: "Scheduled", tone: "plain", when: "3 h", group: "Today" },
  { id: "w5", title: "October submission to the municipal office", ref: "SUB-0132", kind: "Submission", who: "You", place: "Zone East", state: "Ready to send", tone: "ok", when: "Yesterday", group: "This week" },
  { id: "w6", title: "Possible duplicate: tan female, notched ear", ref: "AN-1107", kind: "Identity", who: "You", place: "Ward 08", state: "Needs review", tone: "warn", when: "Yesterday", group: "This week", animal: "AN-1107" },
];

export const FIGS = [
  { n: "28", note: "6 new this week", label: "Open cases", href: "/next/ngo/animals" },
  { n: "7", note: "", label: "Due before Monday", href: "/next/ngo/animals" },
  { n: "93%", note: "214 of 230 events", label: "Evidence complete", href: "/next/ngo/animals" },
  { n: "3", note: "", label: "Waiting on partners", href: "/next/ngo/animals" },
];

export const VISITS = [
  { when: "Sun 8:30 am", what: "Ward 12 vaccination visit", who: "4 assigned" },
  { when: "Sun 11:00 am", what: "Transfer to the veterinary centre", who: "2 animals" },
  { when: "Mon 9:00 am", what: "Ward 08 evidence re-capture", who: "Nisha R." },
];

export const PREPARED = [
  { title: "Tomorrow's field briefing", body: "Assignments grouped by ward. Two addresses need confirming before it goes out.", act: "Review draft" },
  { title: "Reply to the municipal office", body: "Evidence packet attached. Nothing is sent until you approve.", act: "Review reply" },
];

export const TEAM = [
  { who: "Nisha R.", what: "added 4 vaccination events", when: "16 min" },
  { who: "Dr. Arun K.", what: "signed a clinical review", when: "31 min" },
  { who: "Field team A", what: "posted in #abc-ward-12", when: "55 min" },
];

export const CHANNELS = [
  { name: "general", unread: 0 }, { name: "field-operations", unread: 0 }, { name: "abc-ward-12", unread: 2 }, { name: "referrals", unread: 0 },
];
export const DMS = [{ name: "Nisha R.", here: true }, { name: "Field team A", here: true }, { name: "Dr. Arun K.", here: false }];

export type Animal = {
  id: string; name: string; species: string; sex: string; age: string; ward: string; abc: string; arv: string;
  identity: "Verified" | "Recorded" | "Needs review"; trust: Trust; last: string; next: string; cases: number; mark: string;
};
export const ANIMALS: Animal[] = [
  { id: "AN-1042", name: "Brown street dog", species: "Dog", sex: "Female", age: "3–5 years", ward: "Ward 12", abc: "Sterilised", arv: "Vaccinated", identity: "Verified", trust: "Verified", last: "14 Nov", next: "Recovery check, 16 Nov", cases: 2, mark: "Left ear notch, white chest patch" },
  { id: "AN-1107", name: "Tan female, notched ear", species: "Dog", sex: "Female", age: "2–3 years", ward: "Ward 08", abc: "Sterilised", arv: "Due", identity: "Needs review", trust: "Recorded", last: "13 Nov", next: "Identity review", cases: 1, mark: "Right ear notch" },
  { id: "AN-0987", name: "Black and white puppy", species: "Dog", sex: "Male", age: "Under 1 year", ward: "Indiranagar", abc: "Not yet", arv: "Vaccinated", identity: "Recorded", trust: "Reviewed", last: "13 Nov", next: "Sterilisation, 20 Nov", cases: 1, mark: "Black saddle, white socks" },
  { id: "AN-0951", name: "Grey dog, limping", species: "Dog", sex: "Male", age: "5–7 years", ward: "Ward 12", abc: "Sterilised", arv: "Vaccinated", identity: "Verified", trust: "Verified", last: "11 Nov", next: "—", cases: 3, mark: "Old injury, rear left" },
  { id: "AN-0933", name: "Pale dog near the bus stand", species: "Dog", sex: "Female", age: "1–2 years", ward: "Ward 05", abc: "Not recorded", arv: "Not recorded", identity: "Recorded", trust: "Imported", last: "9 Nov", next: "First encounter", cases: 0, mark: "—" },
  { id: "AN-0902", name: "Ginger cat, residential block", species: "Cat", sex: "Female", age: "2–3 years", ward: "Ward 14", abc: "Sterilised", arv: "Vaccinated", identity: "Verified", trust: "Reviewed", last: "8 Nov", next: "—", cases: 1, mark: "Tipped left ear" },
  { id: "AN-0877", name: "Brindle male, market lane", species: "Dog", sex: "Male", age: "3–5 years", ward: "Ward 08", abc: "Sterilised", arv: "Due", identity: "Verified", trust: "Verified", last: "6 Nov", next: "Booster, 22 Nov", cases: 2, mark: "Left ear notch" },
  { id: "AN-0850", name: "White dog, temple steps", species: "Dog", sex: "Female", age: "7+ years", ward: "Ward 02", abc: "Sterilised", arv: "Vaccinated", identity: "Verified", trust: "Verified", last: "2 Nov", next: "—", cases: 1, mark: "Cloudy right eye" },
  { id: "AN-0824", name: "Brown puppy, school gate", species: "Dog", sex: "Male", age: "Under 1 year", ward: "Ward 01", abc: "Not yet", arv: "Due", identity: "Recorded", trust: "Recorded", last: "30 Oct", next: "Vaccination, 18 Nov", cases: 1, mark: "—" },
];

export type Entry = { period: "Upcoming" | "This week" | "Earlier"; title: string; when: string; by: string; body: string; tone: Tone; chips: [string, Tone][] };
export const TIMELINE: Entry[] = [
  { period: "Upcoming", title: "Recovery check", when: "Mon 16 Nov", by: "Assigned to Dr. Arun K.", body: "Post-operative check at the veterinary centre.", tone: "plain", chips: [["Scheduled", "plain"]] },
  { period: "This week", title: "Follow-up observation added", when: "Today, 12:44 pm", by: "Field team A", body: "Seen at the assigned location, eating normally. Photo attached.", tone: "accent", chips: [["Recorded", "plain"], ["Needs veterinary review", "warn"]] },
  { period: "This week", title: "Anti-rabies vaccination given", when: "12 Nov", by: "Dr. Arun K., veterinarian", body: "Batch reference and administering clinician recorded.", tone: "ok", chips: [["Clinically signed", "ok"], ["Municipal review pending", "accent"]] },
  { period: "Earlier", title: "Recovery after sterilisation completed", when: "28 Oct", by: "Veterinary centre", body: "Recovery review and release note linked. Signed certificate attached.", tone: "ok", chips: [["Verified", "ok"]] },
  { period: "Earlier", title: "First capture documented", when: "24 Oct", by: "Field team A", body: "Identity, location photo and capture evidence linked to this record.", tone: "plain", chips: [["Recorded", "plain"]] },
];
export const RELATED = [
  { ref: "CASE-0278", what: "Injury report", state: "Open" }, { ref: "CAM-0108", what: "Ward 12 drive", state: "Active" }, { ref: "VIS-0443", what: "Return visit", state: "Scheduled" },
];
export const OPEN_WORK = [
  { title: "Municipal evidence review", note: "Assigned · Ward 12" }, { title: "Confirm the vaccination photo", note: "Due tomorrow" },
];
export const FILES = ["Vaccination certificate.pdf", "Field observation.jpg", "Recovery note.pdf"];
export const THREAD = [
  { who: "Nisha R.", when: "2 h", text: "Has the recovery note been shared with the municipal office?" },
  { who: "Kaju", when: "2 h", text: "The signed note is on this record. I can attach it to the October submission; that needs your approval." },
];

/* ── Government & Programmes ─────────────────────────────────────── */
export const GOV_ORG = { name: "East Zone office", short: "EZ", kind: "Government & Programmes", city: "Zone East" };
export type Ward = { ward: string; operator: string; submitted: number; verified: number; estimate: number | null; estimated: string; exceptions: number; state: string; tone: Tone; updated: string };
export const WARDS: Ward[] = [
  { ward: "Ward 01", operator: "Kind Hour", submitted: 212, verified: 198, estimate: 230, estimated: "Oct 2026 survey", exceptions: 2, state: "On track", tone: "ok", updated: "Today" },
  { ward: "Ward 02", operator: "Kind Hour", submitted: 188, verified: 154, estimate: 220, estimated: "Oct 2026 survey", exceptions: 6, state: "On track", tone: "ok", updated: "Today" },
  { ward: "Ward 05", operator: "Street Care Trust", submitted: 241, verified: 232, estimate: 255, estimated: "Oct 2026 survey", exceptions: 1, state: "On track", tone: "ok", updated: "Yesterday" },
  { ward: "Ward 08", operator: "Street Care Trust", submitted: 236, verified: 171, estimate: 280, estimated: "Oct 2026 survey", exceptions: 16, state: "Evidence missing", tone: "warn", updated: "Yesterday" },
  { ward: "Ward 12", operator: "Kind Hour", submitted: 204, verified: 150, estimate: 320, estimated: "Mar 2025 count", exceptions: 9, state: "Below target", tone: "bad", updated: "Today" },
  { ward: "Ward 14", operator: "Municipal field team", submitted: 203, verified: 212 - 0, estimate: null, estimated: "No estimate", exceptions: 15, state: "Needs an estimate", tone: "warn", updated: "2 days" },
];
/* Weekly counts, oldest first: [verified, submitted only]. */
export const SERIES: [number, number][] = [[62, 18], [71, 22], [80, 20], [77, 31], [95, 28], [104, 26], [98, 40], [121, 33], [133, 37], [128, 48], [150, 41], [158, 52]];
export const TARGET = 0.7;

/* ── Channel ─────────────────────────────────────────────────────── */
export type Msg = { id: string; who: string; when: string; text: string; record?: string; kaju?: { tasks: string[] }; replies?: number };
export const MESSAGES: Msg[] = [
  { id: "m1", who: "Priya M.", when: "9:14 am", text: "Today's vaccination records are in. Two dogs weren't at their stops, so we need a return visit." },
  { id: "m2", who: "Nisha R.", when: "9:27 am", text: "Two return visits, yes. I've attached 17 location photos to the drive.", record: "CAM-0108 · Ward 12 drive" },
  { id: "m3", who: "Dr. Arun K.", when: "10:07 am", text: "I can do the clinical follow-up if transport can reach the centre before noon." },
];
export const KAJU_TASKS = ["Return visit: AN-1042, Ward 12, tomorrow", "Return visit: AN-0877, Ward 12, tomorrow"];
export const CH_WORK = [{ title: "Evidence review, 3 records", note: "Due today · Nisha R." }];
export const CH_RECORDS = ["CAM-0108 · Ward 12 drive", "AN-1042 · Brown street dog", "Field assignment list"];
export const CH_PEOPLE = ["Priya M.", "Nisha R.", "Dr. Arun K.", "Field team A"];

/* ── Kaju ────────────────────────────────────────────────────────── */
export type Step = { text: string; state: "done" | "run" | "wait" | "todo" };
export type Mission = { id: string; title: string; meta: string; state: string; tone: Tone; steps: Step[]; act?: string; preview?: string[] };
export const MISSIONS: Mission[] = [
  { id: "ms1", title: "Prepare the weekly ABC submission", meta: "Started 2:12 pm · Kind Hour", state: "Waiting for your approval", tone: "warn", act: "Review and approve", steps: [
    { text: "Collected 48 linked procedure records", state: "done" }, { text: "Checked photos, dates and certificates", state: "done" }, { text: "Prepared 5 follow-ups for missing evidence", state: "done" }, { text: "Send the packet to the municipal office", state: "wait" }] },
  { id: "ms2", title: "Watch for field replies", meta: "Every day at 4:00 pm", state: "Running", tone: "ok", steps: [{ text: "Waiting on 3 replies. Next check in 45 minutes.", state: "run" }] },
];
export const DECISIONS = [{ title: "Submission ready", body: "48 records, 5 corrections asked for, 1 email waiting to go." }, { title: "Two possible identity matches", body: "Review before any records are linked." }];
export const CONNECTED: [string, string, Tone][] = [["StrayPaw records", "Allowed", "ok"], ["Channels", "Allowed", "ok"], ["Email", "Not connected", "plain"], ["WhatsApp Business", "Not set up", "plain"]];
/* What the composer can recognise while you type. kind → the choices a person can switch between. */
export const VOCAB: { kind: string; words: string[] }[] = [
  { kind: "Place", words: WARDS.map((w) => w.ward) },
  { kind: "Team", words: ["Field team A", "Field team B", "Nisha R.", "Dr. Arun K."] },
  { kind: "Channel", words: ["#field-operations", "#abc-ward-12", "#general", "#referrals"] },
  { kind: "When", words: ["next week", "tomorrow", "today", "this week"] },
];

/* ── Cases (sample) ──────────────────────────────────────────────── */
export type SampleCase = { id: string; code: string; title: string; kind: string; severity: "Critical" | "High" | "Normal" | "Low"; place: string; who: string; stage: string; next: string; due: string | null; updated: string; resolved: boolean; trust: Trust };
export const CASES: SampleCase[] = [
  { id: "c1", code: "CASE-0278", title: "Injured street dog near the flower market", kind: "Rescue", severity: "Critical", place: "Ward 12", who: "Unassigned", stage: "Triage", next: "Assign a field team", due: "Today", updated: "10 min", resolved: false, trust: "Recorded" },
  { id: "c2", code: "CASE-0241", title: "Recovery after sterilisation", kind: "Sterilisation", severity: "Normal", place: "Indiranagar", who: "Dr. Arun K.", stage: "Clinical care", next: "Recovery check", due: "Today", updated: "2 h", resolved: false, trust: "Reviewed" },
  { id: "c3", code: "CASE-0236", title: "Limping grey dog, old injury", kind: "Injury", severity: "High", place: "Ward 12", who: "Field team A", stage: "Field response", next: "Transport to the centre", due: "16 Nov", updated: "Yesterday", resolved: false, trust: "Recorded" },
  { id: "c4", code: "CASE-0229", title: "Puppy at the school gate, unvaccinated", kind: "Vaccination", severity: "Low", place: "Ward 01", who: "Nisha R.", stage: "Scheduled", next: "Vaccinate on the Ward 01 visit", due: "18 Nov", updated: "2 days", resolved: false, trust: "Recorded" },
  { id: "c5", code: "CASE-0214", title: "Dog reported after a bite, observation", kind: "Investigation", severity: "High", place: "Ward 08", who: "Field team B", stage: "Follow-up", next: "Day 7 observation", due: "17 Nov", updated: "2 days", resolved: false, trust: "Reviewed" },
  { id: "c6", code: "CASE-0198", title: "Brindle male, sterilised and released", kind: "Sterilisation", severity: "Normal", place: "Ward 08", who: "Nisha R.", stage: "Closed", next: "—", due: null, updated: "6 Nov", resolved: true, trust: "Verified" },
  { id: "c7", code: "CASE-0187", title: "White dog, eye infection treated", kind: "Injury", severity: "Normal", place: "Ward 02", who: "Dr. Arun K.", stage: "Closed", next: "—", due: null, updated: "2 Nov", resolved: true, trust: "Verified" },
];

/* ── Inbox and submissions (sample) ──────────────────────────────── */
export type SampleReport = { id: string; what: string; note: string; place: string; from: string; source: "Citizen report" | "WhatsApp" | "Email" | "Partner referral"; state: string; tone: Tone; when: string; match?: string };
export const REPORTS: SampleReport[] = [
  { id: "r1", what: "Dog hit by a two-wheeler, cannot stand", note: "Near the flower market gate. Reporter is staying with the dog.", place: "Ward 12", from: "Resident", source: "Citizen report", state: "New", tone: "bad", when: "10 min" },
  { id: "r2", what: "Tan female with a notched ear, limping", note: "Seen three days running outside the bakery.", place: "Ward 08", from: "Feeder", source: "Citizen report", state: "New", tone: "accent", when: "1 h", match: "AN-1107 · Tan female, notched ear" },
  { id: "r3", what: "Puppies under a parked lorry", note: "Four or five, mother nearby. Lorry leaves on Monday.", place: "Ward 05", from: "Shopkeeper", source: "Citizen report", state: "New", tone: "accent", when: "3 h" },
  { id: "r4", what: "Referral: dog under observation after a bite", note: "Sent by the health centre. Animal facts only; no patient details are shared here.", place: "Ward 08", from: "Health centre", source: "Partner referral", state: "Assigned", tone: "warn", when: "Yesterday" },
  { id: "r5", what: "Same dog reported again at the bus stand", note: "Looks like the pale female already on the register.", place: "Ward 05", from: "Resident", source: "Citizen report", state: "Possible duplicate", tone: "warn", when: "Yesterday", match: "AN-0933 · Pale dog near the bus stand" },
  { id: "r6", what: "Cat stuck on a second-floor ledge", note: "Fire service already called by the reporter.", place: "Ward 14", from: "Resident", source: "Citizen report", state: "Closed", tone: "plain", when: "2 days" },
];
export type SampleSubmission = { id: string; title: string; office: string; period: string; records: number; ready: number; state: "Draft" | "Submitted" | "Query open" | "Accepted" | "Returned"; tone: Tone; when: string; note: string };
export const SUBMISSIONS: SampleSubmission[] = [
  { id: "s1", title: "November 2026 · sterilisation", office: "East Zone office", period: "1–30 Nov", records: 48, ready: 43, state: "Draft", tone: "plain", when: "Today", note: "5 records still need a location photo." },
  { id: "s2", title: "October 2026 · sterilisation", office: "East Zone office", period: "1–31 Oct", records: 61, ready: 61, state: "Query open", tone: "warn", when: "Yesterday", note: "The reviewer asked about two release dates." },
  { id: "s3", title: "October 2026 · vaccination", office: "East Zone office", period: "1–31 Oct", records: 204, ready: 204, state: "Submitted", tone: "accent", when: "4 Nov", note: "Waiting for the reviewing office." },
  { id: "s4", title: "September 2026 · sterilisation", office: "East Zone office", period: "1–30 Sep", records: 57, ready: 57, state: "Accepted", tone: "ok", when: "12 Oct", note: "Accepted by the reviewing office. Accepted is not paid." },
  { id: "s5", title: "August 2026 · sterilisation", office: "East Zone office", period: "1–31 Aug", records: 52, ready: 52, state: "Returned", tone: "bad", when: "9 Sep", note: "Returned: 3 records had no surgeon's authorisation." },
];

/* ── Verification (sample) ───────────────────────────────────────── */
export type SampleReview = { id: string; title: string; operator: string; period: string; records: number; vet: number; evidence: number; state: "Submitted" | "Query open" | "Accepted" | "Returned" | "Partially accepted"; waiting: string; days: number; flags: string[] };
export const REVIEWS: SampleReview[] = [
  { id: "v1", title: "November 2026 · sterilisation", operator: "Kind Hour", period: "1–14 Nov", records: 22, vet: 22, evidence: 106, state: "Submitted", waiting: "Today", days: 0, flags: [] },
  { id: "v2", title: "October 2026 · sterilisation", operator: "Street Care Trust", period: "1–31 Oct", records: 61, vet: 59, evidence: 290, state: "Submitted", waiting: "6 days", days: 6, flags: ["2 records without a surgeon's authorisation", "1 possible duplicate animal"] },
  { id: "v3", title: "October 2026 · vaccination", operator: "Kind Hour", period: "1–31 Oct", records: 204, vet: 204, evidence: 612, state: "Query open", waiting: "3 days", days: 3, flags: ["Reviewer asked about two release dates"] },
  { id: "v4", title: "September 2026 · sterilisation", operator: "Street Care Trust", period: "1–30 Sep", records: 57, vet: 57, evidence: 281, state: "Accepted", waiting: "—", days: 0, flags: [] },
  { id: "v5", title: "August 2026 · sterilisation", operator: "Municipal field team", period: "1–31 Aug", records: 52, vet: 49, evidence: 240, state: "Returned", waiting: "—", days: 0, flags: ["3 records had no surgeon's authorisation"] },
];

/* ── Healthcare (sample). Invented references; no real patient. Dose numbers and dates are as a clinician entered them. ── */
export const CLINIC = { name: "Teaching Hospital Anti-Rabies Clinic", short: "TH", kind: "Healthcare · Human" };
export type SampleBite = { id: string; code: string; ref: string; age: string; category: "I" | "II" | "III" | "Not yet assessed"; species: string; area: string; on: string; course: "Waiting for a clinician" | "In course" | "Completed" | "Did not return"; doses: string; next: string | null };
export const BITES: SampleBite[] = [
  { id: "b1", code: "BX-2611-4F2A", ref: "OPD-ILL-0412", age: "15–29", category: "Not yet assessed", species: "Dog", area: "Jayanagar", on: "Today", course: "Waiting for a clinician", doses: "—", next: null },
  { id: "b2", code: "BX-2611-9C1D", ref: "OPD-ILL-0409", age: "5–14", category: "III", species: "Dog", area: "HSR Layout", on: "13 Nov", course: "In course", doses: "2 given", next: "Today" },
  { id: "b3", code: "BX-2611-27E0", ref: "OPD-ILL-0398", age: "30–49", category: "II", species: "Dog", area: "BTM Layout", on: "8 Nov", course: "In course", doses: "3 given", next: "Today" },
  { id: "b4", code: "BX-2611-B7A3", ref: "OPD-ILL-0391", age: "50+", category: "III", species: "Cat", area: "Koramangala", on: "4 Nov", course: "In course", doses: "2 given", next: "Overdue 3 days" },
  { id: "b5", code: "BX-2610-11F8", ref: "OPD-ILL-0350", age: "15–29", category: "II", species: "Dog", area: "Indiranagar", on: "12 Oct", course: "Completed", doses: "Completed", next: null },
  { id: "b6", code: "BX-2610-0A9C", ref: "OPD-ILL-0331", age: "30–49", category: "III", species: "Dog", area: "Whitefield", on: "3 Oct", course: "Did not return", doses: "2 given", next: null },
];
export type SampleSampleRow = { id: string; code: string; species: string; type: string; from: string; area: string; collected: string; status: "Dispatched" | "Received" | "Testing" | "Resulted"; result: string | null; days: number };
export const LAB_SAMPLES: SampleSampleRow[] = [
  { id: "x1", code: "SX-ILL-005", species: "Dog", type: "Saliva", from: "Animal Care Trust", area: "Koramangala", collected: "Yesterday", status: "Dispatched", result: null, days: 1 },
  { id: "x2", code: "SX-ILL-003", species: "Cat", type: "Brain tissue", from: "Animal Care Trust", area: "BTM Layout", collected: "2 days ago", status: "Received", result: null, days: 2 },
  { id: "x3", code: "SX-ILL-004", species: "Cattle", type: "Brain tissue", from: "Municipal division", area: "Yelahanka", collected: "6 days ago", status: "Testing", result: null, days: 6 },
  { id: "x4", code: "SX-ILL-001", species: "Dog", type: "Brain tissue", from: "Animal Care Trust", area: "HSR Layout", collected: "9 days ago", status: "Resulted", result: "Positive", days: 9 },
  { id: "x5", code: "SX-ILL-002", species: "Dog", type: "Brain tissue", from: "Municipal division", area: "Whitefield", collected: "20 days ago", status: "Resulted", result: "Negative", days: 20 },
];

/* ── Operations and programmes (sample) ─────────────────────────── */
export type SampleVisit = { id: string; when: string; day: "Overdue" | "Today" | "Tomorrow" | "This week"; what: string; kind: string; place: string; who: string; animal: string | null; case: string | null };
export const VISITS_OPS: SampleVisit[] = [
  { id: "o1", when: "12 Nov", day: "Overdue", what: "Day 7 observation after a bite report", kind: "Observation", place: "Ward 08", who: "Field team B", animal: "AN-1107", case: "CASE-0214" },
  { id: "o2", when: "Today 4:30 pm", day: "Today", what: "Recovery check after sterilisation", kind: "Recovery", place: "Indiranagar", who: "Dr. Arun K.", animal: "AN-0987", case: "CASE-0241" },
  { id: "o3", when: "Today 11:00 am", day: "Today", what: "Return visit: dog not found at the stop", kind: "Vaccination", place: "Ward 12", who: "Field team A", animal: "AN-1042", case: null },
  { id: "o4", when: "Tomorrow 8:30 am", day: "Tomorrow", what: "Return visit: dog not found at the stop", kind: "Vaccination", place: "Ward 12", who: "Field team A", animal: "AN-0877", case: null },
  { id: "o5", when: "Tomorrow 10:00 am", day: "Tomorrow", what: "Transport to the veterinary centre", kind: "Transport", place: "Ward 12", who: "Field team A", animal: "AN-0951", case: "CASE-0236" },
  { id: "o6", when: "Thu 20 Nov", day: "This week", what: "Sterilisation booked", kind: "Procedure", place: "Indiranagar", who: "Dr. Arun K.", animal: "AN-0987", case: "CASE-0241" },
  { id: "o7", when: "Fri 21 Nov", day: "This week", what: "Vaccinate on the Ward 01 visit", kind: "Vaccination", place: "Ward 01", who: "Nisha R.", animal: "AN-0824", case: "CASE-0229" },
];
export type SampleDrive = { id: string; name: string; kind: string; zone: string; dates: string; animals: number; sterilised: number; sterUnknown: number; vaccinated: number; vaccUnknown: number; people: number; archived: boolean };
export const DRIVES: SampleDrive[] = [
  { id: "d1", name: "Ward 12 vaccination drive", kind: "Vaccination drive", zone: "Ward 12", dates: "1 Nov – 30 Nov", animals: 84, sterilised: 61, sterUnknown: 9, vaccinated: 52, vaccUnknown: 6, people: 6, archived: false },
  { id: "d2", name: "Ward 08 ABC round", kind: "ABC round", zone: "Ward 08", dates: "15 Oct – 15 Dec", animals: 121, sterilised: 88, sterUnknown: 14, vaccinated: 90, vaccUnknown: 11, people: 5, archived: false },
  { id: "d3", name: "Indiranagar census", kind: "Census", zone: "Indiranagar", dates: "3 Nov – 10 Nov", animals: 47, sterilised: 20, sterUnknown: 21, vaccinated: 18, vaccUnknown: 23, people: 3, archived: false },
  { id: "d4", name: "Ward 01 school outreach", kind: "Outreach", zone: "Ward 01", dates: "Sep 2026", animals: 12, sterilised: 7, sterUnknown: 2, vaccinated: 9, vaccUnknown: 1, people: 4, archived: true },
];

/* ── Government programme (sample) ─────────────────────────────── */
export const PROG_SAMPLE = { name: "East Zone rabies programme", parent: "State One Health programme", status: "Pilot", target: 0.7, since: "17 Aug", slug: null as string | null };
export type SamplePartner = { id: string; name: string; kind: string; responsibilities: string; members: number; open: number; overdue: number; services: { service: string; status: string; on: string }[] };
export const PARTNERS: SamplePartner[] = [
  { id: "p1", name: "Kind Hour", kind: "Field partner", responsibilities: "Sterilisation and vaccination in Wards 01 and 02", members: 9, open: 2, overdue: 0, services: [{ service: "Dog vaccination", status: "Available", on: "12 Nov" }] },
  { id: "p2", name: "Street Care Trust", kind: "Field partner", responsibilities: "Sterilisation in Wards 05 and 08; bite follow-ups", members: 7, open: 3, overdue: 2, services: [{ service: "Dog vaccination", status: "Limited", on: "9 Nov" }] },
  { id: "p3", name: "Municipal field team", kind: "Municipal department", responsibilities: "Catching and transport, Wards 11 and 12", members: 12, open: 1, overdue: 0, services: [] },
  { id: "p4", name: "Health centre · Ward 08", kind: "Health centre", responsibilities: "Bite care and vaccine doses", members: 4, open: 1, overdue: 1, services: [{ service: "Anti-rabies vaccine", status: "Not available", on: "14 Nov" }, { service: "Wound washing", status: "Available", on: "14 Nov" }] },
  { id: "p5", name: "District hospital", kind: "Hospital", responsibilities: "Referrals for severe exposures", members: 6, open: 0, overdue: 0, services: [{ service: "Anti-rabies vaccine", status: "Available", on: "13 Nov" }, { service: "Rabies immunoglobulin", status: "Available", on: "13 Nov" }] },
  { id: "p6", name: "Veterinary laboratory", kind: "Laboratory", responsibilities: "Rabies testing of submitted samples", members: 3, open: 2, overdue: 0, services: [{ service: "Rabies testing", status: "Available", on: "10 Nov" }] },
];
export const SURV_WEEKS: { week: string; n: number | "<5" }[] = [
  { week: "15 Sep", n: 6 }, { week: "22 Sep", n: "<5" }, { week: "29 Sep", n: 7 }, { week: "6 Oct", n: 9 }, { week: "13 Oct", n: 8 }, { week: "20 Oct", n: 11 }, { week: "27 Oct", n: 7 }, { week: "3 Nov", n: 12 }, { week: "10 Nov", n: 10 },
];
export const SURV_AREAS: { area: string; n: number | "<5" }[] = [{ area: "Ward 08", n: 18 }, { area: "Ward 12", n: 14 }, { area: "Ward 05", n: 11 }, { area: "Ward 02", n: 9 }, { area: "Ward 01", n: 7 }, { area: "Ward 14", n: "<5" }];
export type SampleAlert = { key: string; severity: "urgent" | "attention" | "info"; kind: string; title: string; detail: string; area: string | null; at: string; ack: string | null };
export const ALERTS: SampleAlert[] = [
  { key: "a1", severity: "urgent", kind: "Laboratory confirmed", title: "Positive rabies result, Ward 08", detail: "Resulted by the veterinary laboratory. Animal follow-up requested from Street Care Trust.", area: "Ward 08", at: "Today", ack: null },
  { key: "a2", severity: "urgent", kind: "Treatment readiness", title: "Health centre · Ward 08: anti-rabies vaccine not available", detail: "Confirmed by the duty medical officer. Referral for this: District hospital.", area: "Ward 08", at: "Today", ack: null },
  { key: "a3", severity: "attention", kind: "Doses overdue", title: "4 vaccine doses overdue", detail: "Across two health centres. Patient details stay with the facilities.", area: null, at: "Yesterday", ack: null },
  { key: "a4", severity: "attention", kind: "Vaccination coverage", title: "Ward 08 below the 70% target", detail: "61% of the October survey estimate.", area: "Ward 08", at: "Yesterday", ack: "Acknowledged by the programme lead" },
  { key: "a5", severity: "info", kind: "Sample waiting", title: "2 samples waiting at the laboratory", detail: "Oldest received 3 days ago.", area: null, at: "2 days", ack: null },
];
export const OUTPUTS = [
  { id: "o1", title: "September 2026 · sterilisation", source: "Street Care Trust", kind: "Accepted package", period: "1–30 Sep", records: 57, by: "A. Reviewer", on: "12 Oct" },
  { id: "o2", title: "August 2026 · vaccination", source: "Kind Hour", kind: "Accepted package", period: "1–31 Aug", records: 188, by: "A. Reviewer", on: "8 Sep" },
  { id: "o3", title: "July 2026 · sterilisation", source: "Kind Hour", kind: "Partially accepted", period: "1–31 Jul", records: 49, by: "A. Reviewer", on: "11 Aug" },
];

/* ── Healthcare referrals, facilities, laboratory (sample) ─────── */
export type SampleReferral = { id: string; code: string; dir: "in" | "out"; other: string; service: string; category: string; species: string; exposure: string; sent: string; by: string; status: string; note: string | null; closed: string | null };
export const REFERRALS: SampleReferral[] = [
  { id: "f1", code: "BX-2611-4C1E", dir: "in", other: "Health centre · Ward 08", service: "Anti-rabies vaccine", category: "II", species: "Dog", exposure: "13 Nov", sent: "Today", by: "Duty medical officer", status: "Referred", note: "Vaccine not available here today", closed: null },
  { id: "f2", code: "BX-2611-77A0", dir: "in", other: "Wound unit · Ward 05", service: "Rabies immunoglobulin", category: "III", species: "Dog", exposure: "14 Nov", sent: "Yesterday", by: "Nurse on duty", status: "Arrived", note: null, closed: "Yesterday, casualty nurse" },
  { id: "f3", code: "BX-2610-1D93", dir: "in", other: "Health centre · Ward 12", service: "Anti-rabies vaccine", category: "II", species: "Cat", exposure: "8 Nov", sent: "9 Nov", by: "Medical officer", status: "Did not arrive", note: null, closed: "12 Nov, records clerk" },
  { id: "f4", code: "BX-2611-0B52", dir: "out", other: "District hospital", service: "Rabies immunoglobulin", category: "III", species: "Monkey", exposure: "12 Nov", sent: "12 Nov", by: "Dr. Arun K.", status: "Referred", note: "Deep bite to the hand", closed: null },
];
export type SampleFacility = { id: string; name: string; kind: string; area: string; hours: string; phone: string | null; services: { service: string; status: string; on: string }[] };
export const FACILITIES: SampleFacility[] = [
  { id: "h1", name: "District hospital", kind: "Hospital", area: "Ward 01", hours: "Every day, 8 am to 8 pm", phone: null, services: [{ service: "Vaccine", status: "Available", on: "13 Nov" }, { service: "RIG", status: "Available", on: "13 Nov" }, { service: "Wound washing", status: "Available", on: "13 Nov" }] },
  { id: "h2", name: "Health centre · Ward 08", kind: "Health centre", area: "Ward 08", hours: "Mon to Sat, 9 am to 4 pm", phone: null, services: [{ service: "Vaccine", status: "Not available", on: "14 Nov" }, { service: "Wound washing", status: "Available", on: "14 Nov" }] },
  { id: "h3", name: "Health centre · Ward 12", kind: "Health centre", area: "Ward 12", hours: "Mon to Sat, 9 am to 4 pm", phone: null, services: [{ service: "Vaccine", status: "Not confirmed recently", on: "2 Nov" }, { service: "Wound washing", status: "Not confirmed recently", on: "2 Nov" }] },
  { id: "h4", name: "Wound unit · Ward 05", kind: "Health centre", area: "Ward 05", hours: "Every day, 7 am to 9 pm", phone: null, services: [{ service: "Wound washing", status: "Available", on: "14 Nov" }] },
  { id: "h5", name: "Veterinary laboratory", kind: "Laboratory", area: "Ward 02", hours: "Mon to Fri, 9 am to 5 pm", phone: null, services: [{ service: "Testing", status: "Limited", on: "10 Nov" }] },
];
export const LAB_DETAIL: Record<string, { received: string | null; bench: number | null; method: string | null; by: string | null; on: string | null; notice: string | null; custody: { what: string; who: string; when: string; note?: string }[] }> = {
  x1: { received: null, bench: null, method: null, by: null, on: null, notice: null, custody: [{ what: "Collected", who: "Field team", when: "Yesterday 4 pm" }, { what: "Dispatched", who: "Field team", when: "Yesterday 6 pm", note: "Cold chain, sealed container" }] },
  x2: { received: "Yesterday", bench: 1, method: null, by: null, on: null, notice: null, custody: [{ what: "Collected", who: "Field team", when: "2 days ago" }, { what: "Dispatched", who: "Field team", when: "2 days ago" }, { what: "Received", who: "Laboratory scientist", when: "Yesterday" }] },
  x3: { received: "5 days ago", bench: 5, method: null, by: null, on: null, notice: null, custody: [{ what: "Collected", who: "Municipal team", when: "6 days ago" }, { what: "Dispatched", who: "Municipal team", when: "6 days ago" }, { what: "Received", who: "Laboratory scientist", when: "5 days ago" }, { what: "Testing started", who: "Laboratory scientist", when: "4 days ago" }] },
  x4: { received: "8 days ago", bench: null, method: "Direct fluorescent antibody test", by: "Laboratory scientist", on: "5 days ago", notice: "Sent to the programme coordinator, not opened yet", custody: [{ what: "Collected", who: "Field team", when: "9 days ago" }, { what: "Received", who: "Laboratory scientist", when: "8 days ago" }, { what: "Result released", who: "Laboratory scientist", when: "5 days ago", note: "Positive" }] },
  x5: { received: "19 days ago", bench: null, method: "Direct fluorescent antibody test", by: "Laboratory scientist", on: "16 days ago", notice: null, custody: [{ what: "Collected", who: "Municipal team", when: "20 days ago" }, { what: "Received", who: "Laboratory scientist", when: "19 days ago" }, { what: "Result released", who: "Laboratory scientist", when: "16 days ago", note: "Negative" }] },
};

/* ── Kaju mission history (sample) ─────────────────────────────── */
export const MISSIONS_DONE: Mission[] = [
  { id: "ms3", title: "Prepare follow-ups in Ward 08 due this week", meta: "Yesterday · approved by you", state: "Completed", tone: "ok", steps: [{ text: "Found 4 open cases in Ward 08 needing a follow-up", state: "done" }, { text: "Drafted 4 follow-up tasks for Field team B", state: "done" }, { text: "Created 4 tasks and told #field-operations", state: "done" }] },
  { id: "ms4", title: "Prepare follow-ups due tomorrow", meta: "12 Nov · cancelled by you", state: "Cancelled", tone: "plain", steps: [{ text: "Found 2 open cases needing a follow-up; 1 already has one open", state: "done" }, { text: "Drafted 2 follow-up tasks", state: "done" }, { text: "Cancelled before anything was created", state: "todo" }] },
];

/* ── Kaju checks (sample) ──────────────────────────────────────── */
export type Finding = { rule: string; count: number; explanation: string; records: { label: string; href?: string }[]; configured?: boolean; due_on?: string | null };
export const FINDINGS: Finding[] = [
  { rule: "overdue_followup", count: 7, explanation: "Upcoming follow-ups dated before today on current open cases.", records: [{ label: "CASE-0214" }, { label: "CASE-0236" }, { label: "CASE-0229" }] },
  { rule: "missing_evidence", count: 5, explanation: "ABC records missing one or more of the five required evidence kinds. File presence is not content verification.", records: [{ label: "SP-1042" }, { label: "SP-1067" }] },
  { rule: "awaiting_vet", count: 3, explanation: "A surgery record is attached but no current veterinary authorisation is recorded. Only a veterinarian can authorise.", records: [{ label: "SP-1071" }] },
  { rule: "open_clarification", count: 1, explanation: "Submitted packages with an unanswered municipal query.", records: [{ label: "October 2026 · sterilisation" }] },
  { rule: "programme_activity", count: 0, explanation: "Active programmes older than seven days with no linked animal observation recorded in the last seven days. This is a record gap, not proof of no fieldwork.", records: [] },
  { rule: "reporting_deadline", count: 0, explanation: "The organisation lead supplied this deadline. No deadline is inferred when it has not been set.", records: [], configured: false, due_on: null },
];
export const WORKLOAD: [string, number][] = [["Field team A", 9], ["Nisha R.", 7], ["Field team B", 6], ["Dr. Arun K.", 3], ["Unassigned", 4]];
