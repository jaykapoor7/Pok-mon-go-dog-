/* ════════════════════════════════════════════════════════════════════
   The register's vocabulary, as the product displays it.

   The database derives these facts once (supabase/register-intelligence.sql):
   condition_class, status_class, closure_reason, intake_channel. This file
   is the only place that decides what each one is called on screen, in what
   order it is read, and which of them a field team treats as urgent.

   The order of every list below is the reading order everywhere — in a
   legend, a band, a unit chart and a table — so a colour never has to be
   learned twice.
   ════════════════════════════════════════════════════════════════════ */

export const CONDITIONS = [
  "Road accident",
  "Maggot wound",
  "TVT",
  "Skin & mange",
  "Dog bite",
  "Tumour",
  "Distemper (CD)",
  "Entrapment",
  "Human abuse",
  "Suspected rabies",
  "Eye condition",
  "Ear condition",
  "Minor injury",
  "Tick-borne",
  "Parvo",
  "Prolapse",
  "Fracture & mobility",
  "Other wound or injury",
  "Abandonment",
  "Sterilisation (ABC)",
  "Vaccination (ARV)",
  "Other",
  "Not recorded",
] as const;
export type Condition = (typeof CONDITIONS)[number];

/** Conditions a field team reads as one group when space is short. */
export const CONDITION_GROUP: Record<Condition, string> = {
  "Road accident": "Road accident",
  "Maggot wound": "Maggot wound",
  TVT: "TVT",
  "Skin & mange": "Skin & mange",
  "Dog bite": "Dog bite",
  Tumour: "Tumour",
  "Distemper (CD)": "Distemper (CD)",
  Entrapment: "Entrapment",
  "Human abuse": "Human abuse",
  "Suspected rabies": "Suspected rabies",
  "Eye condition": "Eye & ear",
  "Ear condition": "Eye & ear",
  "Minor injury": "Minor injury",
  "Tick-borne": "Other illness",
  Parvo: "Other illness",
  Prolapse: "Other illness",
  "Fracture & mobility": "Other injury",
  "Other wound or injury": "Other injury",
  Abandonment: "Other",
  "Sterilisation (ABC)": "Other",
  "Vaccination (ARV)": "Other",
  Other: "Other",
  "Not recorded": "Not recorded",
};

export const CONDITION_GROUPS = [
  "Road accident", "Maggot wound", "TVT", "Skin & mange", "Dog bite", "Tumour", "Distemper (CD)",
  "Entrapment", "Human abuse", "Suspected rabies", "Eye & ear", "Minor injury", "Other illness",
  "Other injury", "Other", "Not recorded",
] as const;

export type Triage = "Critical" | "Priority" | "Routine" | "Unclassified";
export const TRIAGE_ORDER: Triage[] = ["Critical", "Priority", "Routine", "Unclassified"];

/** A StrayPaw default an organisation can change (ngos.config.triage). */
export const DEFAULT_TRIAGE: Record<Condition, Triage> = {
  "Road accident": "Critical",
  "Maggot wound": "Critical",
  "Human abuse": "Critical",
  "Dog bite": "Critical",
  Entrapment: "Critical",
  "Suspected rabies": "Critical",
  TVT: "Priority",
  Tumour: "Priority",
  "Distemper (CD)": "Priority",
  Parvo: "Priority",
  "Fracture & mobility": "Priority",
  Prolapse: "Priority",
  "Skin & mange": "Routine",
  "Eye condition": "Routine",
  "Ear condition": "Routine",
  "Minor injury": "Routine",
  "Tick-borne": "Routine",
  "Other wound or injury": "Routine",
  Abandonment: "Routine",
  "Sterilisation (ABC)": "Routine",
  "Vaccination (ARV)": "Routine",
  Other: "Routine",
  "Not recorded": "Unclassified",
};

export function triageOf(condition: string | null | undefined, overrides?: Partial<Record<string, Triage>>): Triage {
  if (!condition) return "Unclassified";
  return overrides?.[condition] ?? DEFAULT_TRIAGE[condition as Condition] ?? "Routine";
}

/* ── Status: a position on Report → Record → Case → Outcome ─────────── */

export const STATUSES = ["closed", "other_ngo", "in_progress", "open", "no_action", "not_attended", "unknown"] as const;
export type StatusClass = (typeof STATUSES)[number];

export const STATUS_META: Record<StatusClass, { label: string; short: string; note: string; open: boolean }> = {
  closed: { label: "Closed", short: "Closed", note: "work done and closed", open: false },
  other_ngo: { label: "Handed to another organisation", short: "Other NGO", note: "rescued by a partner", open: false },
  in_progress: { label: "In progress", short: "In progress", note: "being worked", open: true },
  open: { label: "Open", short: "Open", note: "not yet started", open: true },
  no_action: { label: "Closed without field action", short: "No action", note: "closed without intervention", open: false },
  not_attended: { label: "Not attended", short: "Not attended", note: "no one reached it", open: false },
  unknown: { label: "Status not recorded", short: "Not recorded", note: "status never entered", open: false },
};

export const CLOSURE_REASONS = [
  "could_not_locate", "died", "recovered", "caller_unreachable", "other_ngo", "duplicate", "not_attended", "other", "unspecified",
] as const;
export type ClosureReason = (typeof CLOSURE_REASONS)[number];

export const CLOSURE_META: Record<ClosureReason, { label: string; lesson: string }> = {
  could_not_locate: { label: "Animal could not be found or caught", lesson: "A precise place, a photograph and repeat sightings are what shorten this." },
  died: { label: "Animal died before help arrived", lesson: "Time from report to first action matters most here." },
  recovered: { label: "Recovered without intervention", lesson: "Worth a follow-up sighting to confirm." },
  caller_unreachable: { label: "Caller could not be reached", lesson: "A report that carries its own place and photo does not depend on the caller." },
  other_ngo: { label: "Handled by another organisation", lesson: "A shared record lets both organisations see the outcome." },
  duplicate: { label: "Duplicate report", lesson: "Repeat sightings of one animal belong on one record." },
  not_attended: { label: "No one could attend", lesson: "Where this repeats is where capacity is missing." },
  other: { label: "Other reason", lesson: "" },
  unspecified: { label: "No reason recorded", lesson: "Recording why a case closed is what makes this chart useful." },
};

export const INTAKES = ["own_line", "partner_org", "individual", "team_found", "resident_report", "other"] as const;
export type Intake = (typeof INTAKES)[number];
export const INTAKE_META: Record<Intake, string> = {
  own_line: "The organisation's own line",
  partner_org: "A partner organisation",
  individual: "A volunteer or individual",
  team_found: "Found by the field team",
  resident_report: "A resident report on StrayPaw",
  other: "Other",
};

export const CARE_KINDS = [
  "treatment", "diagnostic", "surgery", "sterilisation", "vaccination", "wound_care", "chemotherapy", "rescue", "other",
] as const;
export const CARE_META: Record<(typeof CARE_KINDS)[number], string> = {
  treatment: "Treatment",
  diagnostic: "Diagnostics",
  surgery: "Surgery",
  sterilisation: "Sterilisation (ABC)",
  vaccination: "Vaccination (ARV)",
  wound_care: "Wound care",
  chemotherapy: "TVT / chemotherapy",
  rescue: "Rescue",
  other: "Other care",
};

export const SEVERITIES = ["low", "normal", "high", "critical"] as const;

export const indexOr = <T extends string>(list: readonly T[], v: string | null | undefined, fallback: T) => {
  const i = list.indexOf((v ?? "") as T);
  return i >= 0 ? i : list.indexOf(fallback);
};
