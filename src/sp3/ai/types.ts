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
);

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
