/* ════════════════════════════════════════════════════════════════════
   StrayPaw CareOS — the integration contract between the WhatsApp backend
   (built separately) and the NGO workspace.

   The WhatsApp backend owns: receiving messages, media storage, reporter
   identity, consent, templates and delivery. It exposes the RPCs named
   below. The workspace owns: triage, cases, follow-ups, the animal record
   and outcomes, all of which already exist (cases, case_updates,
   animal_followups, animal_timeline_events, medical_events).

   Nothing here assumes the backend is live. Every reader returns
   { connected: false } until the RPC exists, and the UI says so plainly.
   See docs/CAREOS-INTEGRATION.md for the full contract.
   ════════════════════════════════════════════════════════════════════ */

/** Where a care message arrived from. Only WhatsApp is planned today. */
export type CareChannel = "whatsapp";

/** A care message's place in triage. */
export type CareInboxStatus =
  | "new" //        arrived, nobody has looked
  | "triaged" //    someone owns it, no case yet
  | "linked" //     attached to a case and/or an animal record
  | "dismissed"; // duplicate, spam or not an animal-care matter (reason kept)

export type CareUrgency = "emergency" | "urgent" | "routine" | "unknown";

/** One media attachment. URLs are short-lived, signed by the backend. */
export interface CareMedia {
  id: string;
  kind: "image" | "video" | "audio" | "document";
  url: string;
  /** Possible injury: the UI blurs it behind SensitiveVeil until opened. */
  sensitive: boolean;
}

/**
 * One inbound conversation turn from WhatsApp, as the workspace sees it.
 * The reporter's phone number never reaches the workspace: the backend
 * passes an opaque handle and, if consented, a display name.
 */
export interface CareInboxItem {
  id: string;
  ngo_id: string;
  channel: CareChannel;
  /** Stable per-reporter thread; follow-up messages share it. */
  thread_id: string;
  reporter_handle: string;
  reporter_name: string | null;
  received_at: string;
  text: string | null;
  /** Backend's language guess (e.g. "ta", "hi"), plus an optional translation. */
  language: string | null;
  text_en: string | null;
  media: CareMedia[];
  /** Shared pin or parsed place, if any. Never finer than the reporter sent. */
  location: { lat: number; lng: number; label: string | null } | null;
  urgency: CareUrgency;
  status: CareInboxStatus;
  owner_id: string | null;
  owner_name: string | null;
  linked_case_id: string | null;
  linked_dog_id: string | null;
  dismissed_reason: string | null;
}

/** Actions the workspace performs on an inbox item. Each is one backend RPC. */
export type CareInboxAction =
  | { type: "claim"; item_id: string }
  | { type: "open_case"; item_id: string; dog_id: string | null; title: string; severity: "low" | "normal" | "high" | "critical" }
  | { type: "link_case"; item_id: string; case_id: string }
  | { type: "link_animal"; item_id: string; dog_id: string }
  | { type: "dismiss"; item_id: string; reason: string };

/**
 * Reporter updates the workspace may ask the backend to send. The backend
 * maps each to an approved WhatsApp template and enforces consent and the
 * 24-hour messaging window; the workspace never composes free text to a
 * reporter.
 */
export type ReporterNotice = "received" | "team_assigned" | "treated" | "followup_scheduled" | "closed";

/** What the record calls a WhatsApp-sourced fact (animal_timeline_events.provenance). */
export const WHATSAPP_PROVENANCE = "whatsapp" as const;

/** Names of the RPCs the backend implements. One place, so both sides agree. */
export const CAREOS_RPC = {
  list: "careos_inbox_list", //       (p_status text[] default null, p_limit int, p_offset int) -> CareInboxItem[]
  act: "careos_inbox_act", //         (p_action jsonb: CareInboxAction) -> CareInboxItem
  notify: "careos_notify_reporter", // (p_case_id uuid, p_notice text: ReporterNotice) -> { queued: boolean }
  health: "careos_health", //         () -> { connected: boolean, number_verified: boolean }
} as const;

export type CareOsResult<T> = { connected: true; data: T } | { connected: false; reason: "not_deployed" | "not_signed_in" | "error"; detail?: string };
