/* Shared shapes for Kaju (server engine ⇄ client panel). */

export type CitationKind = "animal" | "case" | "programme" | "place" | "page";
export type Citation = { id: string; label: string; href: string; kind: CitationKind };
export type ToolRun = { name: string; summary: string; ok: boolean };

type ProposalBase = { id: string; why: string };
export type Proposal = ProposalBase & (
  | { kind: "open_case"; title: string; city: string; zone: string | null; category: "injury" | "sterilisation" | "rescue" | "vaccination" | "other"; severity: "low" | "normal" | "high" | "critical"; description: string; dogId: string | null }
  | { kind: "add_note"; caseId: string; caseLabel: string; note: string }
  | { kind: "schedule_followup"; caseId: string; caseLabel: string; dogId: string | null; dueAt: string; note: string }
  | { kind: "record_care"; dogId: string; dogLabel: string; careKind: string; date: string | null; notes: string }
  /* A task in the organisation's own list (nx_tasks), from "@Kaju add a task …". Saved only on Confirm, as the person who confirms.
     orgId: the workspace the task belongs to (checked again on Confirm; absent means the person's NGO). dogId/dogLabel: the
     animal it is about when no case is linked. */
  | { kind: "add_task"; title: string; dueOn: string | null; assigneeId: string | null; assigneeName: string | null; caseId: string | null; caseLabel: string | null; orgId?: string | null; dogId?: string | null; dogLabel?: string | null }
  /* A bite, scratch or lick presentation for the facility's bite register, from a clinician's note. Saved on Confirm through
     the same database function as the manual bite form (oh_record_exposure), as the confirming person. Only what the note
     states is filled in; the category is never inferred, and prescribing a course stays a manual clinician action.
     exposureTime and site are shown for checking but the register has no field for them, so they are not saved. */
  | { kind: "register_exposure"; facilityId: string; facilityName: string; exposureOn: string; exposureTime: string | null; exposureKind: ExposureKind; site: string | null;
      category: "I" | "II" | "III" | null; patientRef: string | null; ageBand: AgeBand | null; ageText: string | null; sex: "female" | "male" | null; woundWashed: WoundWashed | null;
      species: Species; ownership: "community" | "owned" | "unknown"; animalPlace: string | null; animalDescription?: string | null; areaId: string | null; areaName: string | null; contactPhone: string | null; reminderConsent: boolean }
  /* Connections: these act outside StrayPaw, so they run only on Confirm (/api/connections/act). */
  | { kind: "email"; provider: ConnProvider; providerName: string; to: string[]; cc: string[]; subject: string; body: string; send: boolean }
  | { kind: "calendar_event"; provider: ConnProvider; providerName: string; title: string; start: string; end: string; attendees: string[]; location: string | null }
  | { kind: "chat_post"; provider: ConnProvider; providerName: string; channel: string; channelName: string; text: string }
  | { kind: "sms"; to: string[]; values: string[]; note: string }
  | { kind: "report_file"; format: "pdf" | "docx" | "xlsx" | "csv" | "pptx" | "geojson" | "kml"; title: string; source: ReportSource; saveTo: ConnProvider | null; saveToName: string | null }
);

export type ConnProvider = "google" | "microsoft" | "slack" | "zoho";

/* The bite register's own vocabularies (health.exposures check constraints). */
export const EXPOSURE_KINDS = ["bite", "scratch", "lick_broken_skin", "other"] as const;
export type ExposureKind = (typeof EXPOSURE_KINDS)[number];
export const AGE_BANDS = ["0-4", "5-14", "15-29", "30-49", "50+"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];
export const WOUND_WASHED = ["before_arrival", "at_facility", "not_washed"] as const;
export type WoundWashed = (typeof WOUND_WASHED)[number];
export const SPECIES_KINDS = ["dog", "cat", "cattle", "monkey", "wildlife", "other", "unknown"] as const;
export type Species = (typeof SPECIES_KINDS)[number];

/** Records a report can be built from (server reads them with the person's own access). */
export const REPORT_SOURCES = ["open_cases", "animals", "verification", "operations_checks", "programme_summary"] as const;
export type ReportSource = (typeof REPORT_SOURCES)[number];

export type AiReply = {
  scope?: string;
  text: string;
  citations: Citation[];
  tools: ToolRun[];
  proposals: Proposal[];
  navigate?: { href: string; label: string };
  /** Figures, tables, charts, timelines, record lists or a sentence with blanks, drawn by the app's own components (see blocks.ts). */
  blocks?: import("./blocks").Block[];
  /** One-tap next commands when a request is ambiguous or finished: asked again through the same router. */
  suggestions?: string[];
  engine: "model" | "tools";
  notice?: string;
  /** Server only: tokens and rupee cost of a model run, for the usage log. Removed before the reply leaves the server. */
  usage?: { inputTokens: number; outputTokens: number; costInr: number };
  /** The pilot log row for this answer, so the person can rate it. Absent when nothing was logged. */
  turnId?: string;
};

export type ChatTurn = { role: "user" | "assistant"; text: string };
export type AiRequest = { messages: ChatTurn[]; context?: { path?: string; workspace?: string; scope?: string; /** What the person is looking at: the page title and a record label, shown by the page itself. Untrusted. */ title?: string;
  /** The record a note is about, sent by a record page ("Tell Kaju"). Untrusted: read again with the person's own access before use. */
  caseId?: string; dogId?: string;
  /** Where Kaju was asked from (dock, page, channel, voice, capture), for the pilot log only. */
  surface?: string };
  /** The person pressed Try again on an earlier answer (pilot log only). */
  retry?: boolean };

export const CARE_KINDS = ["sterilisation", "vaccination", "treatment", "checkup", "deworming", "other"] as const;
