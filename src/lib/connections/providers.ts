/* ════════════════════════════════════════════════════════════════════
   Kaju Connections: the provider registry.

   Each provider declares what Kaju can do with it (capabilities), the
   least-privilege OAuth scopes those need, and which actions write to the
   outside world (those always wait for the person's confirmation). Adding
   a provider (Slack, a municipal system) means adding an entry here and an
   adapter in ./adapters; the agent itself does not change.

   Shared by the server and the Connections page, so it holds no secrets.
   ════════════════════════════════════════════════════════════════════ */

export type ProviderId = "google" | "microsoft";

export type Capability =
  | "files.search" | "files.read" | "sheets.read" | "mail.draft" | "mail.send"
  | "calendar.read" | "calendar.create" | "files.create";

export const CAPABILITY: Record<Capability, { label: string; writes: boolean }> = {
  "files.search": { label: "Find files", writes: false },
  "files.read": { label: "Read documents and presentations", writes: false },
  "sheets.read": { label: "Read spreadsheets", writes: false },
  "calendar.read": { label: "See calendar availability", writes: false },
  "mail.draft": { label: "Draft emails", writes: true },
  "mail.send": { label: "Send emails you approve", writes: true },
  "calendar.create": { label: "Add events you approve", writes: true },
  "files.create": { label: "Save reports you approve", writes: true },
};

export type Provider = {
  id: ProviderId;
  name: string;
  apps: string[];
  line: string;
  capabilities: Capability[];
  scopes: string[];
  /** Environment variables an administrator must set before anyone can connect. */
  env: string[];
};

export const PROVIDERS: Record<ProviderId, Provider> = {
  google: {
    id: "google",
    name: "Google Workspace",
    apps: ["Gmail", "Drive", "Docs", "Sheets", "Slides", "Calendar"],
    line: "Find and read files in Drive, draft and send email from Gmail, and add events to Calendar.",
    capabilities: ["files.search", "files.read", "sheets.read", "mail.draft", "mail.send", "calendar.read", "calendar.create", "files.create"],
    scopes: [
      "openid", "email", "profile",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    env: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "CONNECTIONS_ENC_KEY"],
  },
  microsoft: {
    id: "microsoft",
    name: "Microsoft 365",
    apps: ["Outlook", "OneDrive", "SharePoint", "Word", "Excel", "PowerPoint", "Teams", "Calendar"],
    line: "Find and read files in OneDrive and SharePoint, draft and send email from Outlook, and add events to Calendar.",
    capabilities: ["files.search", "files.read", "sheets.read", "mail.draft", "mail.send", "calendar.read", "calendar.create", "files.create"],
    scopes: ["openid", "email", "profile", "offline_access", "User.Read", "Files.Read.All", "Files.ReadWrite", "Sites.Read.All", "Mail.ReadWrite", "Mail.Send", "Calendars.ReadWrite"],
    env: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "CONNECTIONS_ENC_KEY"],
  },
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];
export const isProvider = (v: string): v is ProviderId => v in PROVIDERS;

/** File work that needs no connected account: reading uploads, generating exports. */
export const NATIVE_FILES = {
  name: "Files",
  line: "Read uploaded PDF, Word, Excel, CSV and PowerPoint files, and create reports in the same formats. No account needed.",
  read: ["PDF", "DOCX", "XLSX", "CSV", "PPTX"],
  create: ["PDF", "DOCX", "XLSX", "CSV", "PPTX"],
} as const;

/** Providers on the roadmap. Shown as planned, never as connectable. */
export const PLANNED = [
  { name: "Slack", line: "Ask Kaju from a channel and get answers with sources." },
  { name: "WhatsApp", line: "Field messages as draft records. Waiting for Meta verification." },
  { name: "Municipal systems", line: "Approved government systems, connected per department." },
] as const;

/** The public shape of one person's connection (never includes tokens). */
export type ConnectionView = {
  provider: ProviderId;
  status: "available" | "unavailable" | "connected" | "expired" | "error" | "blocked";
  account_email: string | null;
  capabilities: Capability[];
  connected_at: string | null;
  last_used_at: string | null;
  last_error: string | null;
  share_with_org: boolean;
  shared_by?: string | null;
  missing_env?: string[];
};
