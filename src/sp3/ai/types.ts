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
  /* Connections: these act outside StrayPaw, so they run only on Confirm (/api/connections/act). */
  | { kind: "email"; provider: ConnProvider; providerName: string; to: string[]; cc: string[]; subject: string; body: string; send: boolean }
  | { kind: "calendar_event"; provider: ConnProvider; providerName: string; title: string; start: string; end: string; attendees: string[]; location: string | null }
  | { kind: "chat_post"; provider: ConnProvider; providerName: string; channel: string; channelName: string; text: string }
  | { kind: "sms"; to: string[]; values: string[]; note: string }
  | { kind: "report_file"; format: "pdf" | "docx" | "xlsx" | "csv" | "pptx" | "geojson" | "kml"; title: string; source: ReportSource; saveTo: ConnProvider | null; saveToName: string | null }
);

export type ConnProvider = "google" | "microsoft" | "slack" | "zoho";

/** Records a report can be built from (server reads them with the person's own access). */
export const REPORT_SOURCES = ["open_cases", "animals", "verification"] as const;
export type ReportSource = (typeof REPORT_SOURCES)[number];

export type AiReply = {
  text: string;
  citations: Citation[];
  tools: ToolRun[];
  proposals: Proposal[];
  navigate?: { href: string; label: string };
  engine: "model" | "tools";
  notice?: string;
};

export type ChatTurn = { role: "user" | "assistant"; text: string };
export type AiRequest = { messages: ChatTurn[]; context?: { path?: string; workspace?: string } };

export const CARE_KINDS = ["sterilisation", "vaccination", "treatment", "checkup", "deworming", "other"] as const;
