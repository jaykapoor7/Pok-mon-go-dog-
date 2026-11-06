/* Module readiness for ShapeOS, the Bengaluru pilot and beyond.

   One honest list. A module is LIVE only when it runs in production for its
   intended users and its end-to-end checks pass; STAGING when it is built
   and under test; BLOCKED when it waits on someone outside StrayPaw;
   PLANNED when it is not built. `december` marks what the controlled
   Bengaluru pilot needs. The pilot itself is under discussion with the BeST
   Cluster at IISc and is not signed or funded. Update this file with every
   release; the readiness page and docs/SHAPEOS-READINESS.md read from it. */

import type { Flag } from "./flags";

export type Status = "LIVE" | "STAGING" | "BLOCKED" | "PLANNED";
export type Area = "Kaju" | "Field & NGO" | "Veterinary" | "Government" | "Research" | "Training" | "Citizens" | "Identity" | "Integrations" | "Platform";
export type Module = {
  id: string; name: string; area: Area; status: Status; december: boolean;
  /** What exists and how it was verified. */
  evidence: string;
  /** What stands between this and the next status, if anything. */
  next?: string;
  /** Who or what outside StrayPaw it waits on, when BLOCKED. */
  waitsOn?: string;
  flag?: Flag;
};

export const MODULES: Module[] = [
  // Kaju
  { id: "kaju-tools", name: "Kaju record tools", area: "Kaju", status: "LIVE", december: true, evidence: "Answers from authorised records under the caller's own session, with citations; changes are prepared as proposals a person confirms. Unit tests: kaju-reliability, kaju-prepare, kaju-intake, report-isolation." },
  { id: "kaju-model", name: "Kaju with a language model", area: "Kaju", status: "STAGING", december: true, evidence: "Tool-use loop, one inference gate, dated authorisation, monthly ceiling, per-user and per-organisation quotas, token prices, and a usage ledger (kaju_model_usage) metering every run. Ledger migration applied on staging; tests: inference-off.", next: "Apply the ledger migration to production, add a model key and the authorisation, ceiling and price settings, then approve the data route." },
  { id: "kaju-checks", name: "Kaju scheduled checks", area: "Kaju", status: "STAGING", december: true, evidence: "Recurring checks and daily calendar checks with run receipts (kaju_check_runs, kaju_check_settings).", next: "Confirm the schedule runs on production and add delivery receipts per recipient." },
  { id: "kaju-actions", name: "Human-approved actions", area: "Kaju", status: "LIVE", december: true, evidence: "Open case, add note, schedule follow-up and record care commit only on confirmation, with an audit row and an idempotent receipt (kaju_confirm_action)." },

  // Field & NGO
  { id: "ngo-cases", name: "Intake, cases and follow-ups", area: "Field & NGO", status: "LIVE", december: true, evidence: "NGO workspace in use by an operational partner; case creation, notes, follow-ups, assignment; e2e: mobile-focus, straypaw2." },
  { id: "ngo-register", name: "Animal register and lifecycle", area: "Field & NGO", status: "LIVE", december: true, evidence: "One record per animal with capture, sterilisation, vaccination, release and photos; offline intake; register import with provenance." },
  { id: "ngo-imports", name: "Register imports (Excel, CSV)", area: "Field & NGO", status: "LIVE", december: true, evidence: "Imported rows keep their source and stay labelled historical until checked. Tests: master-import suite, ngo-import." },
  { id: "ngo-evidence", name: "Release evidence and packages", area: "Field & NGO", status: "STAGING", december: true, evidence: "Evidence receipts, package checks and claims at contract rates.", next: "Run one full monthly package with a pilot operator." },

  // Veterinary
  { id: "vet-signoff", name: "Clinical records and vet sign-off", area: "Veterinary", status: "STAGING", december: true, evidence: "Medical records inside the tenant boundary; veterinarian role; sign-off on procedures.", next: "Walk the OT workflow with a pilot veterinarian and adjust fields to their register." },

  // Government
  { id: "gov-review", name: "Verification and review", area: "Government", status: "STAGING", december: true, evidence: "City review queue, programme and contract views, reviewer access to submitted packages.", next: "No municipal office uses it yet. Configure a BBMP pilot workspace once the pilot is agreed." },
  { id: "gov-reports", name: "Programme reporting", area: "Government", status: "STAGING", december: true, evidence: "Ward and programme reports from approved records; exports to Excel and PDF." },

  // Research
  { id: "research-public", name: "Public datasets and map", area: "Research", status: "LIVE", december: true, evidence: "Public map with H3 cells, programmes and published datasets with method notes." },
  { id: "research-access", name: "Researcher workspace and controlled exports", area: "Research", status: "PLANNED", december: true, evidence: "Not built: role, approved-study scope, export audit.", next: "Agree data-sharing terms with the consortium, then build approved-study exports." },

  // Training
  { id: "training-lms", name: "Training courses and assignments", area: "Training", status: "PLANNED", december: true, evidence: "Public academy lessons exist; organisation courses, assignments and completion records are not built yet.", flag: "training_lms" },

  // Citizens
  { id: "citizen-report", name: "Animal reports", area: "Citizens", status: "LIVE", december: true, evidence: "Public sighting and needs-help reports with a received-not-accepted receipt; e2e: straypaw2 reporting." },
  { id: "citizen-bite", name: "Bite or scratch help", area: "Citizens", status: "BLOCKED", december: true, waitsOn: "Clinical review of the guidance, and a verified list of anti-rabies vaccine centres from the health department.", evidence: "Prototype guidance and triage behind a flag; nothing public.", flag: "citizen_bite_assist" },

  // Identity
  { id: "identity-rfid", name: "RFID, microchip and QR identity", area: "Identity", status: "PLANNED", december: true, evidence: "Not built: identifier store, scanner input and lookup.", flag: "animal_identifiers" },
  { id: "identity-dedupe", name: "Duplicate review", area: "Identity", status: "LIVE", december: true, evidence: "Provisional identification and duplicate review for the register." },

  // Integrations
  { id: "int-whatsapp", name: "WhatsApp (Meta Cloud API)", area: "Integrations", status: "BLOCKED", december: true, waitsOn: "Meta business verification and an approved WhatsApp number.", evidence: "Signed webhook built and refusing everything until credentials exist (test: careos-webhook). Pasted or forwarded messages work today." },
  { id: "int-google", name: "Google Workspace", area: "Integrations", status: "BLOCKED", december: false, waitsOn: "Google OAuth verification for the requested scopes, or an organisation administrator's internal approval.", evidence: "Connection adapters with confirm-before-send (test: connections)." },
  { id: "int-microsoft", name: "Microsoft 365", area: "Integrations", status: "BLOCKED", december: false, waitsOn: "An organisation administrator granting consent.", evidence: "Connection adapters with confirm-before-send (test: connections)." },
  { id: "int-sms", name: "SMS (MSG91)", area: "Integrations", status: "BLOCKED", december: false, waitsOn: "DLT template registration.", evidence: "Adapter built." },

  // Platform
  { id: "platform-rls", name: "Tenant isolation and audit", area: "Platform", status: "LIVE", december: true, evidence: "Row-level security per organisation, security-definer review, operational audit log. Scripts: db:security:audit, db:security:matrix." },
  { id: "platform-flags", name: "Feature flags and readiness", area: "Platform", status: "STAGING", december: true, evidence: "SP_FLAGS switches unverified modules on per deployment; this registry.", flag: "readiness_board" },
];

export const STATUS_ORDER: Status[] = ["LIVE", "STAGING", "BLOCKED", "PLANNED"];
export const countBy = (mods: Module[]) => Object.fromEntries(STATUS_ORDER.map((s) => [s, mods.filter((m) => m.status === s).length])) as Record<Status, number>;
