/* Sample records for the NGO setup pages, shown signed out with the "Sample data" chip. Kind Hour is the sample
   organisation used across the new app. None of this is anyone's real work; actions on it open the live demo. */

import type { Package, PackageCase, PackageEvent, QueueRow, Office } from "@/lib/abc";
import type { Contract, ContractRate, Reconciliation } from "@/lib/reconciliation";
import type { CampaignAnimal, CampaignStats } from "@/lib/campaigns";
import type { SourceDocument } from "@/lib/documents";
import type { Fundraiser, Survey, SurveyArea, SurveyResponse } from "@/lib/types";
import type { OrgFeedingZone } from "@/lib/feeding-zones";
import type { WorkflowPolicy } from "@/lib/operations";
import type { Member, OrgProfile, TeamCode, Volunteer, Course, Lesson } from "../../data/ngo-setup";
import type { OwnStory, QualityQueue } from "../../data/ngo-submissions";
import type { Zone } from "../../data/ngo-programmes";

const ORG = "sample-kind-hour";
export const S_OFFICES: Office[] = [{ id: "of-east", name: "East Zone office", city: "Bengaluru" }];

const pkg = (id: string, title: string, s: string, e: string, status: Package["status"], records: number, at: string, decided?: string): Package => ({
  id, ngo_id: ORG, office_id: "of-east", title, period_start: s, period_end: e, case_ids: [], summary: { records, vet_authorised: records, evidence_items: records * 5 },
  status, item_review_enabled: true, created_at: at, submitted_at: status === "draft" ? null : at, decided_by_name: decided ?? null, decided_at: decided ? at : null,
});
export const S_PACKAGES: Package[] = [
  pkg("sample-nov", "ABC claims · November 2026", "2026-11-01", "2026-11-30", "draft", 43, "2026-11-14T10:00:00Z"),
  pkg("sample-oct", "ABC claims · October 2026", "2026-10-01", "2026-10-31", "queried", 61, "2026-11-04T09:00:00Z"),
  pkg("sample-oct-v", "ARV vaccination · October 2026", "2026-10-01", "2026-10-31", "submitted", 204, "2026-11-04T09:30:00Z"),
  pkg("sample-sep", "ABC claims · September 2026", "2026-09-01", "2026-09-30", "accepted", 57, "2026-10-12T11:00:00Z", "R. Menon, East Zone office"),
  pkg("sample-aug", "ABC claims · August 2026", "2026-08-01", "2026-08-31", "returned", 52, "2026-09-09T08:00:00Z", "R. Menon, East Zone office"),
];

const q = (n: number, stage: Partial<QueueRow>, days: number): QueueRow => ({
  case_id: `sample-case-${n}`, case_code: `KH-ABC-${String(1200 + n)}`, title: `Sterilisation · ${["Ward 12 market", "Ward 08 bus stand", "Indiranagar 2nd stage", "Ward 12 temple lane", "Ward 08 school gate"][n % 5]}`,
  city: "Bengaluru", created_at: new Date(Date.UTC(2026, 10, 14 - days)).toISOString(), provenance: "recorded", evidence_count: 5, missing: [], vet_authorised: true, evidence_reviewed: false,
  government_accepted: false, vet_name: "Dr. Arun K.", reviewer_name: null, returned_note: null, returned_by: null, in_package: null, ...stage,
});
export const S_QUEUE: QueueRow[] = [
  q(1, { evidence_count: 3, missing: ["release_photo", "release_location"] }, 1),
  q(2, { evidence_count: 4, missing: ["ear_notch_photo"] }, 2),
  q(3, { vet_authorised: false, vet_name: null }, 2),
  q(4, {}, 3),
  q(5, {}, 4),
  q(6, { returned_note: "Release photo does not show the ear notch.", returned_by: "Priya M.", evidence_count: 4, missing: ["ear_notch_photo"] }, 5),
  q(7, { evidence_reviewed: true, reviewer_name: "Priya M." }, 6),
  q(8, { evidence_reviewed: true, reviewer_name: "Priya M.", in_package: "draft" }, 8),
  q(9, { evidence_reviewed: true, reviewer_name: "Priya M.", in_package: "submitted" }, 20),
  q(10, { evidence_reviewed: true, reviewer_name: "Priya M.", government_accepted: true, in_package: "accepted" }, 50),
];

export const S_CONTRACTS: Contract[] = [
  { id: "ct-2", ngo_id: ORG, office_id: "of-east", name: "East Zone ABC agreement", version: 2, reference: "EZ/ABC/2026/14, signed 2 Apr 2026", starts_on: "2026-04-01", ends_on: "2027-03-31", currency: "INR", illustrative: true },
  { id: "ct-1", ngo_id: ORG, office_id: "of-east", name: "East Zone ABC agreement", version: 1, reference: "EZ/ABC/2025/09", starts_on: "2025-04-01", ends_on: "2026-03-31", currency: "INR", illustrative: true },
];
export const S_RATES: ContractRate[] = [
  { id: "rt-1", contract_id: "ct-2", code: "sterilisation", label: "Sterilisation per animal", unit_rate: "1650.00", required_evidence: ["capture_photo", "surgery_record", "ear_notch_photo", "release_photo", "release_location"], required_events: [], vet_required: true },
  { id: "rt-2", contract_id: "ct-2", code: "vaccination", label: "ARV vaccination per animal", unit_rate: "250.00", required_evidence: [], required_events: ["vaccination"], vet_required: true },
  { id: "rt-3", contract_id: "ct-1", code: "sterilisation", label: "Sterilisation per animal", unit_rate: "1450.00", required_evidence: ["capture_photo", "surgery_record", "release_photo"], required_events: [], vet_required: true },
];

export const S_DOCS: SourceDocument[] = [
  { id: "dc-1", ngo_id: ORG, dog_id: null, case_id: null, url: "", kind: "register_page", title: "ABC ledger, page 14", notes: "October entries in Nisha's handwriting, Ward 12 drive.", recorded_on: "2026-10-18", created_at: "2026-11-02T08:00:00Z" },
  { id: "dc-2", ngo_id: ORG, dog_id: "AN-1042", case_id: null, url: "", kind: "medical_note", title: "Post-op note, Bruno", notes: null, recorded_on: "2026-11-06", created_at: "2026-11-06T12:00:00Z" },
  { id: "dc-3", ngo_id: ORG, dog_id: null, case_id: "sample-case-6", url: "", kind: "whatsapp", title: "Resident thread, temple lane", notes: "Location of release confirmed by the resident.", recorded_on: null, created_at: "2026-11-09T15:00:00Z" },
  { id: "dc-4", ngo_id: ORG, dog_id: null, case_id: null, url: "", kind: "consent_form", title: "Consent form, school round", notes: null, recorded_on: "2026-09-21", created_at: "2026-09-22T10:00:00Z" },
];
export const S_STORIES: OwnStory[] = [
  { id: "st-1", case_id: "sample-case-10", title: "Bruno is back on his street, healed and sterilised", location_label: "Indiranagar", published_at: "2026-10-28T10:00:00Z" },
  { id: "st-2", case_id: null, title: "A puppy rescued from a storm drain", location_label: "Ward 08", published_at: "2026-09-14T10:00:00Z" },
];
const qi = (k: string, label: string, sub: string) => ({ key: k, label, sub, href: null });
export const S_QUALITY: QualityQueue[] = [
  { title: "Animals missing StrayPaw ID", detail: "No permanent StrayPaw ID yet. Search across registers and exports may miss them until they have one.", items: [qi("a1", "Kalu", "No StrayPaw ID · KH-0442 · Ward 12"), qi("a2", "Dog without a code", "No StrayPaw ID · no source ID · Ward 08")] },
  { title: "Animals missing source ID", detail: "The profile exists, but cannot be matched back to a spreadsheet, clinic register or tag.", items: [qi("a2", "Dog without a code", "No StrayPaw ID · no source ID · Ward 08")] },
  { title: "Animals missing locality", detail: "Cannot support ward or locality reporting, cluster analysis or repeat-hotspot work.", items: [] },
  { title: "Suspicious record dates", detail: "Unreadable, future or extreme outlier dates distort yearly figures and map activity. Check the source before changing it.", items: [qi("r1", "Rescue from imported register", "date \"31/02/2026\" · Ward 08 · open")] },
  { title: "Open for 30+ days", detail: "Rescue records still open long after the recorded intake date.", items: [qi("r2", "Limping dog near the market", "12 Aug 2026 · Ward 12 · in progress"), qi("r3", "Skin infection, three dogs", "2 Sep 2026 · Ward 08 · assigned")] },
  { title: "Completed without structured outcome", detail: "Closed cases whose result is not recorded as an outcome.", items: [] },
  { title: "Care recorded after last follow-up", detail: "Animals with medical care but no later review or follow-up entry.", items: [qi("a3", "Rani", "AN-0987 · KH-0310 · Indiranagar")] },
];

const drive = (id: string, name: string, kind: CampaignStats["kind"], zone: string, s: string, e: string | null, total: number, st: number, sn: number, vc: number, vn: number, archived = false): CampaignStats => ({
  id, name, kind, zone, starts_on: s, ends_on: e, archived, observations: total + 18, people: 5, total, sterilised: st, not_sterilised: sn, ster_unknown: total - st - sn,
  vaccinated: vc, not_vaccinated: vn, vacc_unknown: total - vc - vn, needs_help: 2, ster_pct_of_known: st + sn ? (100 * st) / (st + sn) : null, ster_pct_of_all: total ? (100 * st) / total : null,
  vacc_pct_of_known: vc + vn ? (100 * vc) / (vc + vn) : null, vacc_pct_of_all: total ? (100 * vc) / total : null,
});
export const S_DRIVES: CampaignStats[] = [
  drive("sample-d1", "Ward 12 vaccination drive", "vaccination", "Ward 12", "2026-11-01", "2026-11-30", 84, 61, 14, 52, 26),
  drive("sample-d2", "Ward 08 ABC round", "sterilisation", "Ward 08", "2026-10-15", "2026-12-15", 121, 88, 19, 90, 20),
  drive("sample-d3", "Indiranagar census", "census", "Indiranagar", "2026-11-03", "2026-11-10", 47, 20, 6, 18, 6),
  drive("sample-d4", "Ward 01 school outreach", "other", "Ward 01", "2026-09-01", "2026-09-30", 12, 7, 3, 9, 2, true),
];
export const S_BREAKDOWN = { overall: drive("all", "All", "other", "", "", null, 412, 261, 70, 230, 88), drives: [], unfiled: { animals: 148, sterilised: 85, not_sterilised: 28, ster_unknown: 35 }, waiting: { ours: 6, community: 3 } };
export const S_DRIVE_ANIMALS: CampaignAnimal[] = [
  { id: "AN-1042", name: "Bruno", code: "KH-0451", zone: "Ward 12", cover_photo: null, sterilisation_status: "sterilised", vaccination_status: "vaccinated", needs_help: false, created_at: "2026-11-02T08:00:00Z", total_count: 6 },
  { id: "AN-1043", name: "Kalu", code: "KH-0442", zone: "Ward 12", cover_photo: null, sterilisation_status: "sterilised", vaccination_status: "unknown", needs_help: false, created_at: "2026-11-02T09:00:00Z", total_count: 6 },
  { id: "AN-1044", name: null, code: "KH-0460", zone: "Ward 12", cover_photo: null, sterilisation_status: "not_sterilised", vaccination_status: "vaccinated", needs_help: true, created_at: "2026-11-03T09:00:00Z", total_count: 6 },
  { id: "AN-1045", name: "Rani", code: "KH-0310", zone: "Ward 12 temple lane", cover_photo: null, sterilisation_status: "unknown", vaccination_status: "not_vaccinated", needs_help: false, created_at: "2026-11-04T09:00:00Z", total_count: 6 },
  { id: "AN-1046", name: "Tommy", code: "KH-0466", zone: "Ward 12 market", cover_photo: null, sterilisation_status: "sterilised", vaccination_status: "vaccinated", needs_help: false, created_at: "2026-11-05T09:00:00Z", total_count: 6 },
  { id: "AN-1047", name: null, code: null, zone: null, cover_photo: null, sterilisation_status: "unknown", vaccination_status: "unknown", needs_help: false, created_at: "2026-11-06T09:00:00Z", total_count: 6 },
];

export const S_ZONES: Zone[] = [
  { id: "sample-z1", name: "Ward 12 north blocks", campaign_id: "sample-d1", planned: 60, status: "assigned", staff: ["u2", "u3"], note: null, updated_at: "2026-11-12T08:00:00Z" },
  { id: "sample-z2", name: "Ward 12 market and temple", campaign_id: "sample-d1", planned: 40, status: "reported_complete", staff: ["u3"], note: "All lanes walked twice. Four dogs could not be caught.", updated_at: "2026-11-13T17:00:00Z" },
  { id: "sample-z3", name: "Ward 08 bus stand", campaign_id: "sample-d2", planned: 35, status: "supervisor_reviewed", staff: ["u4"], note: "Reviewed against the field register.", updated_at: "2026-11-08T12:00:00Z" },
];

const sv = (id: string, title: string, description: string | null, status = "active", at = "2026-10-20T10:00:00Z"): Survey => ({ id, ngo_id: ORG, title, species: "dog", description, status, created_by_id: null, created_at: at });
export const S_SURVEYS: Survey[] = [
  sv("sample-sv1", "Ward 12 dog census 2026", "Street count before and after the vaccination drive."),
  sv("sample-sv2", "Indiranagar ear-notch check", "Sample of marked dogs, two observers.", "active", "2026-11-05T10:00:00Z"),
  sv("sample-pj1", "School round register", "STRAYPAW_PROJECT_FIELDS:School|Children reached|Dog bite cases reported|Next visit\nAwareness sessions in Ward 01 schools.", "active", "2026-09-01T10:00:00Z"),
];
export const S_AREAS: SurveyArea[] = [
  { id: "sample-ar1", survey_id: "sample-sv1", name: "North blocks", code: "12N", target_count: 120, status: "active", response_count: 18, animal_count: 41 },
  { id: "sample-ar2", survey_id: "sample-sv1", name: "Market and temple", code: "12M", target_count: 80, status: "active", response_count: 9, animal_count: 22 },
  { id: "sample-ar3", survey_id: "sample-sv1", name: "Railway colony", code: "12R", target_count: null, status: "active", response_count: 0, animal_count: 0 },
];
export const S_RESPONSES: SurveyResponse[] = [
  { id: "sample-r1", survey_id: "sample-sv1", area_id: "sample-ar1", lat: 12.97, lng: 77.64, photo_url: null, species: "dog", count: 3, attributes: { sterilised: true, vaccination_mark: "marked" }, notes: "Pack of three near the water tank", created_at: "2026-11-12T07:10:00Z" },
  { id: "sample-r2", survey_id: "sample-sv1", area_id: "sample-ar2", lat: 12.968, lng: 77.641, photo_url: null, species: "dog", count: 1, attributes: { vaccination_mark: "unmarked" }, notes: null, created_at: "2026-11-12T07:40:00Z" },
  { id: "sample-r3", survey_id: "sample-sv1", area_id: "sample-ar1", lat: null, lng: null, photo_url: null, species: "dog", count: 2, attributes: { sterilised: false, vaccination_mark: "unknown" }, notes: "Puppies", created_at: "2026-11-11T08:05:00Z" },
];
export const S_ENTRIES = [
  { id: "sample-e1", attributes: { School: "Government Primary, Ward 01", "Children reached": "140", "Dog bite cases reported": "2", "Next visit": "January" }, notes: null, created_at: "2026-09-12T10:00:00Z" },
  { id: "sample-e2", attributes: { School: "St. Mary's", "Children reached": "95", "Dog bite cases reported": "", "Next visit": "December" }, notes: "Teachers asked for posters", created_at: "2026-09-19T10:00:00Z" },
];

export const S_FEEDING: OrgFeedingZone[] = [
  { id: "sample-f1", name: "Market corner, east gate", description: "Six dogs, evening", zone: "Ward 12", lat: 12.971, lng: 77.641, photo_url: null, last_fed_at: "2026-11-14T13:00:00Z", created_at: "2026-08-01T10:00:00Z", volunteer_count: 4 },
  { id: "sample-f2", name: "Bus stand shelter", description: null, zone: "Ward 08", lat: 12.951, lng: 77.62, photo_url: null, last_fed_at: "2026-11-01T13:00:00Z", created_at: "2026-07-10T10:00:00Z", volunteer_count: 1 },
];
export const S_FUNDRAISERS: Fundraiser[] = [
  { id: "sample-fr1", ngo_id: ORG, title: "Clear pending vet bills for 30 rescues", story: null, category: "bills", goal_amount: 90000, currency: "INR", donate_url: "https://example.org/donate", cover_photo: null, deadline: "2026-12-15", raised_reported: 41000, status: "active", featured: false, budget: [], outcome: null, created_by_id: null, created_by_name: "Priya M.", created_at: "2026-10-30T10:00:00Z" },
  { id: "sample-fr2", ngo_id: ORG, title: "Monsoon shelter repairs", story: null, category: "shelter", goal_amount: null, currency: "INR", donate_url: "https://example.org/donate", cover_photo: null, deadline: null, raised_reported: null, status: "closed", featured: false, budget: [], outcome: null, created_by_id: null, created_by_name: "Priya M.", created_at: "2026-06-12T10:00:00Z" },
];

export const S_MEMBERS: Member[] = [
  { user_id: "u1", role: "admin", name: "Priya Menon" },
  { user_id: "u2", role: "coordinator", name: "Nisha Rao" },
  { user_id: "u5", role: "veterinarian", name: "Dr. Arun Kumar" },
  { user_id: "u3", role: "member", name: "Field team A" },
  { user_id: "u4", role: "field_worker", name: "Suresh B." },
];
export const S_CODES: TeamCode[] = [
  { id: "c1", kind: "staff", person_name: "Meera J.", email: "meera@example.org", role: "member", code: "KH-7Q2M", active: true, accepted: false, reports: 0, created_at: "2026-11-10T10:00:00Z" },
  { id: "c2", kind: "volunteer", person_name: "Arjun", email: null, role: "volunteer", code: null, active: false, accepted: true, reports: 14, created_at: "2026-08-22T10:00:00Z" },
];
export const S_VOLUNTEERS: Volunteer[] = [
  { id: "v1", name: "Kavya", contact: "kavya@example.org", message: "Can help on weekends with feeding.", zone: "Ward 12", dog_id: null, created_at: "2026-11-11T10:00:00Z" },
  { id: "v2", name: "Rahul", contact: "+91 90000 00000", message: null, zone: "Indiranagar", dog_id: null, created_at: "2026-11-02T10:00:00Z" },
];
export const S_PROFILE: OrgProfile = { id: ORG, name: "Kind Hour", slug: null, verified: true, mission: "Street dogs in East Bengaluru, cared for where they live.", about: "Rescue, sterilisation and vaccination in four wards.", website: "https://example.org", contact_email: "hello@example.org", contact_phone: "", city: "Bengaluru", state: "Karnataka", registration_no: "KA/2019/0042", founded_year: 2019, areas_of_work: ["Rescue", "ABC", "Vaccination"], logo_url: null, cover_photo: null };
export const S_POLICIES: WorkflowPolicy[] = [
  { id: "p1", name: "East Zone release policy", version: 2, rules: { releaseRequiresVet: true, requiredFields: { release: ["location", "performedBy"], sterilisation: ["facility", "procedure"] } }, source_reference: "EZ/ABC/2026/14 clause 6" },
];

/* One package, opened */
export const S_PACKAGE_CASES: PackageCase[] = S_QUEUE.slice(3, 7).map((r) => ({ case_id: r.case_id, case_code: r.case_code, title: r.title, city: r.city, created_at: r.created_at, evidence: [{ kind: "capture_photo", url: null, location: null, at: null }, { kind: "release_location", url: null, location: "Ward 12, near the market gate", at: null }], vet_name: r.vet_name, reviewer_name: "Priya M." }));
export const S_PACKAGE_EVENTS: PackageEvent[] = [
  { id: "e1", actor_name: "Priya M.", side: "operator", kind: "created", body: null, created_at: "2026-11-01T09:00:00Z" },
  { id: "e2", actor_name: "Priya M.", side: "operator", kind: "submitted", body: null, created_at: "2026-11-04T09:00:00Z" },
  { id: "e3", actor_name: "R. Menon", side: "reviewer", kind: "query", body: "Two release dates are before the surgery date. Please check KH-ABC-1205 and KH-ABC-1206.", created_at: "2026-11-12T11:00:00Z" },
];
export const S_RECON: Reconciliation = {
  package_id: "sample-oct", status: "queried", item_review_enabled: true, contract: S_CONTRACTS[0], currency: "INR", claimed_amount: "6600.00", reviewed_amount: "3300.00", accepted_amount: "3300.00", paid_amount: null, payment_exceeds_accepted: false, generated_at: "2026-11-14T10:00:00Z", payment_processing: false,
  items: S_PACKAGE_CASES.map((c, i) => ({ key: `${c.case_id}:rt-1`, case_id: c.case_id, claim_id: `cl-${i}`, case_code: c.case_code, animal_id: null, title: c.title ?? "", procedure: "sterilisation", procedure_label: "Sterilisation per animal", claimed_units: 1, unit_rate: "1650.00", claimed_amount: "1650.00", decision: i < 2 ? "accepted" : i === 2 ? "query" : "pending", accepted_units: i < 2 ? 1 : null, note: i === 2 ? "Release date is before the surgery date." : i < 2 ? "Evidence complete." : null, reviewer: i < 3 ? "R. Menon" : null, decided_at: i < 3 ? "2026-11-12T11:00:00Z" : null, missing: [] })),
};

/* Training */
export const S_COURSES: Course[] = [
  { id: "sample-co1", ngo_id: ORG, title: "Recording a release with evidence", summary: "What the reviewing office needs to see for each release.", audience: "Field staff", status: "published", updated_at: "2026-11-01T10:00:00Z" },
  { id: "sample-co2", ngo_id: null, title: "Safe handling and capture", summary: "Net, muzzle and transport basics.", audience: "Animal handlers", status: "published", updated_at: "2026-10-01T10:00:00Z" },
];
export const S_LESSONS: Lesson[] = [
  { id: "sample-l1", course_id: "sample-co1", position: 0, title: "Why each photo matters", kind: "reading", body: "A release photo that shows the ear notch lets the reviewing office accept the claim without a query.\n\nTake it where the dog was caught, in daylight, with the notch visible.", media_url: null, questions: null, pass_mark: null },
  { id: "sample-l2", course_id: "sample-co1", position: 1, title: "Check yourself", kind: "quiz", body: null, media_url: null, questions: [{ q: "Where should the release photo be taken?", options: ["At the clinic", "Where the dog was caught", "Anywhere"] }], pass_mark: 70 },
];
