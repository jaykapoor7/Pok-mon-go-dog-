/* ════════════════════════════════════════════════════════════════════
   Kaju Connections: the provider registry.

   Each provider declares what Kaju can do with it (capabilities), the
   least-privilege OAuth scopes those need, and which actions write to the
   outside world (those always wait for the person's confirmation). Adding
   a provider (Slack, a municipal system) means adding an entry here and an
   adapter in ./adapters; the agent itself does not change.

   Shared by the server and the Connections page, so it holds no secrets.
   ════════════════════════════════════════════════════════════════════ */

export type ProviderId = "google" | "microsoft" | "slack" | "zoho";

export type Capability =
  | "files.search" | "files.read" | "sheets.read" | "mail.draft" | "mail.send"
  | "calendar.read" | "calendar.create" | "files.create" | "chat.post";

export const CAPABILITY: Record<Capability, { label: string; writes: boolean }> = {
  "files.search": { label: "Find files", writes: false },
  "files.read": { label: "Read documents and presentations", writes: false },
  "sheets.read": { label: "Read spreadsheets", writes: false },
  "calendar.read": { label: "See calendar availability", writes: false },
  "mail.draft": { label: "Draft emails", writes: true },
  "mail.send": { label: "Send emails you approve", writes: true },
  "calendar.create": { label: "Add events you approve", writes: true },
  "files.create": { label: "Save reports you approve", writes: true },
  "chat.post": { label: "Post messages you approve", writes: true },
};

/* How each provider signs people in. Data, not code: a new provider adds an entry. */
export type OAuthSpec = {
  authorize: string; token: string;
  /** Slack asks for user scopes under a different parameter. */
  scopeParam?: "scope" | "user_scope";
  scopeSep?: " " | ",";
  extra?: Record<string, string>;
  pkce: boolean;
  clientIdEnv: string; clientSecretEnv: string;
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
  oauth: OAuthSpec;
};
const MS = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0";

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
    oauth: { authorize: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", pkce: true, extra: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" }, clientIdEnv: "GOOGLE_CLIENT_ID", clientSecretEnv: "GOOGLE_CLIENT_SECRET" },
  },
  microsoft: {
    id: "microsoft",
    name: "Microsoft 365",
    apps: ["Outlook", "OneDrive", "SharePoint", "Word", "Excel", "PowerPoint", "Teams", "Calendar"],
    line: "Find and read files in OneDrive and SharePoint, draft and send email from Outlook, and add events to Calendar.",
    capabilities: ["files.search", "files.read", "sheets.read", "mail.draft", "mail.send", "calendar.read", "calendar.create", "files.create"],
    scopes: ["openid", "email", "profile", "offline_access", "User.Read", "Files.Read.All", "Files.ReadWrite", "Sites.Read.All", "Mail.ReadWrite", "Mail.Send", "Calendars.ReadWrite"],
    env: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "CONNECTIONS_ENC_KEY"],
    oauth: { authorize: `${MS}/authorize`, token: `${MS}/token`, pkce: true, extra: { response_mode: "query" }, clientIdEnv: "MICROSOFT_CLIENT_ID", clientSecretEnv: "MICROSOFT_CLIENT_SECRET" },
  },
  slack: {
    id: "slack",
    name: "Slack",
    apps: ["Channels", "Messages"],
    line: "Post updates and answers to a Slack channel you choose.",
    capabilities: ["chat.post"],
    scopes: ["chat:write", "channels:read", "groups:read"],
    env: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET", "CONNECTIONS_ENC_KEY"],
    oauth: { authorize: "https://slack.com/oauth/v2/authorize", token: "https://slack.com/api/oauth.v2.access", scopeParam: "user_scope", scopeSep: ",", pkce: false, clientIdEnv: "SLACK_CLIENT_ID", clientSecretEnv: "SLACK_CLIENT_SECRET" },
  },
  zoho: {
    id: "zoho",
    name: "Zoho Workplace",
    apps: ["Zoho Mail"],
    line: "Draft and send email from Zoho Mail.",
    capabilities: ["mail.draft", "mail.send"],
    scopes: ["ZohoMail.accounts.READ", "ZohoMail.messages.CREATE", "AaaServer.profile.READ"],
    env: ["ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "CONNECTIONS_ENC_KEY"],
    oauth: { authorize: "{zoho}/oauth/v2/auth", token: "{zoho}/oauth/v2/token", scopeSep: ",", pkce: false, extra: { access_type: "offline", prompt: "consent" }, clientIdEnv: "ZOHO_CLIENT_ID", clientSecretEnv: "ZOHO_CLIENT_SECRET" },
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

/** Organisation-wide services (one account for the organisation, set by an administrator). */
export const SERVICES = {
  sms: { id: "sms", name: "SMS (MSG91)", line: "Send approved text reminders to field staff who do not use email. Uses your organisation's registered SMS template.", env: ["MSG91_AUTH_KEY", "MSG91_TEMPLATE_ID"] },
  maps: { id: "maps", name: "Map exports", line: "Export captures and releases as GeoJSON or KML for municipal GIS and Google Earth. No account needed." },
} as const;

/** On the roadmap. Shown as planned, never as connectable. */
export const PLANNED = [
  { name: "WhatsApp", line: "Field messages as draft records. Waiting for Meta verification." },
  { name: "Government e-Office", line: "File movement with a municipal department, once it approves a connection." },
  { name: "Other municipal systems", line: "Approved government systems, connected per department." },
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
