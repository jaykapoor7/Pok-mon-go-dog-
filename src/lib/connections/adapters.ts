import "server-only";
import { readFile, type ReadResult } from "@/lib/files/native";
import type { ProviderId } from "./providers";

/* ════════════════════════════════════════════════════════════════════
   Provider adapters: one interface over Google Workspace and Microsoft
   Graph. Read operations run when Kaju asks; write operations (send,
   create event, save file) run only from /api/connections/act, after the
   person pressed Confirm on the exact action shown to them.
   A new provider implements the same interface.
   ════════════════════════════════════════════════════════════════════ */

export type RemoteFile = { id: string; name: string; mime: string; modified: string | null; url: string | null; size: number | null };
export type EmailDraft = { to: string[]; cc?: string[]; subject: string; body: string };
export type CalendarEvent = { title: string; start: string; end: string; attendees?: string[]; location?: string; description?: string };

/* Every method is optional: a provider implements what its capabilities promise. */
export interface Adapter {
  search?(token: string, query: string): Promise<RemoteFile[]>;
  read?(token: string, id: string): Promise<{ file: RemoteFile; content: ReadResult }>;
  createDraft?(token: string, d: EmailDraft): Promise<{ id: string; url: string | null }>;
  sendDraft?(token: string, draftId: string): Promise<void>;
  createEvent?(token: string, e: CalendarEvent): Promise<{ id: string; url: string | null }>;
  saveFile?(token: string, name: string, mime: string, bytes: Buffer): Promise<{ id: string; url: string | null }>;
  listChannels?(token: string): Promise<{ id: string; name: string }[]>;
  postMessage?(token: string, channel: string, text: string): Promise<{ id: string; url: string | null }>;
}
export function need<K extends keyof Adapter>(a: Adapter, k: K): NonNullable<Adapter[K]> {
  const f = a[k];
  if (!f) throw new Error("This account does not support that");
  return f.bind(a) as NonNullable<Adapter[K]>;
}

async function call<T>(url: string, token: string, init: RequestInit = {}, as: "json" | "buffer" = "json"): Promise<T> {
  const r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  if (r.status === 401) throw new ProviderAuthError();
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j?.error?.message ?? j?.error_description ?? `Provider answered ${r.status}`);
  }
  return (as === "buffer" ? Buffer.from(await r.arrayBuffer()) : r.status === 204 ? undefined : await r.json()) as T;
}
export class ProviderAuthError extends Error { constructor() { super("The provider no longer accepts this connection"); } }

const b64url = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const header = (v: string) => v.replace(/[\r\n]+/g, " ").trim();

/* ── Google ────────────────────────────────────────────────────────── */
const G_EXPORT: Record<string, { mime: string; name: string }> = {
  "application/vnd.google-apps.document": { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", name: "export.docx" },
  "application/vnd.google-apps.spreadsheet": { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", name: "export.xlsx" },
  "application/vnd.google-apps.presentation": { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", name: "export.pptx" },
};
const google: Adapter = {
  async search(token, query) {
    const q = `name contains '${query.replace(/['\\]/g, " ").slice(0, 80)}' and trashed = false`;
    const u = `https://www.googleapis.com/drive/v3/files?${new URLSearchParams({ q, pageSize: "15", fields: "files(id,name,mimeType,modifiedTime,webViewLink,size)", orderBy: "modifiedTime desc", supportsAllDrives: "true", includeItemsFromAllDrives: "true" })}`;
    const j = await call<{ files: { id: string; name: string; mimeType: string; modifiedTime?: string; webViewLink?: string; size?: string }[] }>(u, token);
    return j.files.map((f) => ({ id: f.id, name: f.name, mime: f.mimeType, modified: f.modifiedTime ?? null, url: f.webViewLink ?? null, size: f.size ? Number(f.size) : null }));
  },
  async read(token, id) {
    const meta = await call<{ id: string; name: string; mimeType: string; modifiedTime?: string; webViewLink?: string; size?: string }>(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=id,name,mimeType,modifiedTime,webViewLink,size&supportsAllDrives=true`, token);
    const file: RemoteFile = { id: meta.id, name: meta.name, mime: meta.mimeType, modified: meta.modifiedTime ?? null, url: meta.webViewLink ?? null, size: meta.size ? Number(meta.size) : null };
    const exp = G_EXPORT[meta.mimeType];
    const bytes = exp
      ? await call<Buffer>(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}/export?mimeType=${encodeURIComponent(exp.mime)}`, token, {}, "buffer")
      : await call<Buffer>(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`, token, {}, "buffer");
    return { file, content: await readFile(bytes, exp ? exp.name : meta.name, exp ? exp.mime : meta.mimeType) };
  },
  async createDraft(token, d) {
    const raw = [`To: ${header(d.to.join(", "))}`, ...(d.cc?.length ? [`Cc: ${header(d.cc.join(", "))}`] : []), `Subject: ${header(d.subject)}`, "Content-Type: text/plain; charset=UTF-8", "", d.body].join("\r\n");
    const j = await call<{ id: string; message?: { id: string } }>("https://gmail.googleapis.com/gmail/v1/users/me/drafts", token, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: { raw: b64url(raw) } }) });
    return { id: j.id, url: j.message?.id ? `https://mail.google.com/mail/u/0/#drafts?compose=${j.message.id}` : null };
  },
  async sendDraft(token, draftId) {
    await call("https://gmail.googleapis.com/gmail/v1/users/me/drafts/send", token, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: draftId }) });
  },
  async createEvent(token, e) {
    const j = await call<{ id: string; htmlLink?: string }>("https://www.googleapis.com/calendar/v3/calendars/primary/events", token, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      summary: e.title, location: e.location, description: e.description, start: { dateTime: e.start }, end: { dateTime: e.end }, attendees: (e.attendees ?? []).map((email) => ({ email })),
    }) });
    return { id: j.id, url: j.htmlLink ?? null };
  },
  async saveFile(token, name, mime, bytes) {
    const boundary = `sp${Date.now()}`;
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name })}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`),
      bytes, Buffer.from(`\r\n--${boundary}--`),
    ]);
    const j = await call<{ id: string; webViewLink?: string }>("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", token, { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body: new Uint8Array(body) });
    return { id: j.id, url: j.webViewLink ?? null };
  },
};

/* ── Microsoft 365 (Graph) ─────────────────────────────────────────── */
const G = "https://graph.microsoft.com/v1.0";
type MsItem = { id: string; name: string; file?: { mimeType?: string }; lastModifiedDateTime?: string; webUrl?: string; size?: number; parentReference?: { driveId?: string } };
const msFile = (f: MsItem): RemoteFile => ({ id: f.parentReference?.driveId ? `${f.parentReference.driveId}!${f.id}` : f.id, name: f.name, mime: f.file?.mimeType ?? "", modified: f.lastModifiedDateTime ?? null, url: f.webUrl ?? null, size: f.size ?? null });
const msPath = (id: string) => { const [drive, item] = id.includes("!") ? id.split("!") : [null, id]; return drive ? `${G}/drives/${encodeURIComponent(drive)}/items/${encodeURIComponent(item)}` : `${G}/me/drive/items/${encodeURIComponent(item)}`; };
const microsoft: Adapter = {
  async search(token, query) {
    /* Searches OneDrive and SharePoint files the person can open. */
    const j = await call<{ value: { hitsContainers: { hits?: { resource: MsItem }[] }[] }[] }>(`${G}/search/query`, token, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requests: [{ entityTypes: ["driveItem"], query: { queryString: query.slice(0, 120) }, size: 15 }] }) });
    return (j.value?.[0]?.hitsContainers?.[0]?.hits ?? []).map((h) => msFile(h.resource));
  },
  async read(token, id) {
    const meta = await call<MsItem>(msPath(id), token);
    const bytes = await call<Buffer>(`${msPath(id)}/content`, token, {}, "buffer");
    const file = msFile(meta);
    return { file, content: await readFile(bytes, meta.name, file.mime) };
  },
  async createDraft(token, d) {
    const to = (l?: string[]) => (l ?? []).map((address) => ({ emailAddress: { address } }));
    const j = await call<{ id: string; webLink?: string }>(`${G}/me/messages`, token, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject: d.subject, body: { contentType: "Text", content: d.body }, toRecipients: to(d.to), ccRecipients: to(d.cc) }) });
    return { id: j.id, url: j.webLink ?? null };
  },
  async sendDraft(token, draftId) {
    await call(`${G}/me/messages/${encodeURIComponent(draftId)}/send`, token, { method: "POST" });
  },
  async createEvent(token, e) {
    const j = await call<{ id: string; webLink?: string }>(`${G}/me/events`, token, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      subject: e.title, body: { contentType: "Text", content: e.description ?? "" }, location: e.location ? { displayName: e.location } : undefined,
      start: { dateTime: e.start, timeZone: "Asia/Kolkata" }, end: { dateTime: e.end, timeZone: "Asia/Kolkata" },
      attendees: (e.attendees ?? []).map((address) => ({ emailAddress: { address }, type: "required" })),
    }) });
    return { id: j.id, url: j.webLink ?? null };
  },
  async saveFile(token, name, mime, bytes) {
    const j = await call<{ id: string; webUrl?: string }>(`${G}/me/drive/root:/StrayPaw/${encodeURIComponent(name)}:/content`, token, { method: "PUT", headers: { "Content-Type": mime }, body: new Uint8Array(bytes) });
    return { id: j.id, url: j.webUrl ?? null };
  },
};

/* ── Slack (user token; posts as the person) ───────────────────────── */
async function slackCall<T>(method: string, token: string, body?: Record<string, unknown>): Promise<T> {
  const r = await fetch(`https://slack.com/api/${method}`, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json; charset=utf-8" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (j.error === "invalid_auth" || j.error === "token_revoked" || j.error === "token_expired") throw new ProviderAuthError();
  if (!j.ok) throw new Error(`Slack: ${j.error ?? r.status}`);
  return j as T;
}
const slack: Adapter = {
  async listChannels(token) {
    const j = await slackCall<{ channels: { id: string; name: string; is_member?: boolean }[] }>("conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=200", token);
    return j.channels.filter((c) => c.is_member !== false).map((c) => ({ id: c.id, name: c.name }));
  },
  async postMessage(token, channel, text) {
    const j = await slackCall<{ channel: string; ts: string }>("chat.postMessage", token, { channel, text, unfurl_links: false });
    const link = await slackCall<{ permalink?: string }>(`chat.getPermalink?channel=${encodeURIComponent(j.channel)}&message_ts=${encodeURIComponent(j.ts)}`, token).catch(() => ({ permalink: undefined }));
    return { id: j.ts, url: link.permalink ?? null };
  },
};

/* ── Zoho Mail (India data centre by default) ──────────────────────── */
const ZMAIL = () => (process.env.ZOHO_MAIL_URL?.trim() || "https://mail.zoho.in");
async function zcall<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${ZMAIL()}${path}`, { ...init, headers: { Authorization: `Zoho-oauthtoken ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  if (r.status === 401) throw new ProviderAuthError();
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.data?.moreInfo ?? j?.status?.description ?? `Zoho answered ${r.status}`);
  return j as T;
}
async function zohoAccount(token: string) {
  const j = await zcall<{ data: { accountId: string; primaryEmailAddress: string }[] }>("/api/accounts", token);
  const a = j.data?.[0];
  if (!a) throw new Error("No Zoho Mail account");
  return a;
}
const zoho: Adapter = {
  async createDraft(token, d) {
    const a = await zohoAccount(token);
    const j = await zcall<{ data: { messageId: string } }>(`/api/accounts/${a.accountId}/messages`, token, { method: "POST", body: JSON.stringify({ fromAddress: a.primaryEmailAddress, toAddress: d.to.join(","), ccAddress: (d.cc ?? []).join(","), subject: d.subject, content: d.body, mailFormat: "plaintext", mode: "draft" }) });
    return { id: JSON.stringify({ to: d.to, cc: d.cc ?? [], subject: d.subject, body: d.body, draft: j.data?.messageId }), url: null };
  },
  /* Zoho sends a new message rather than a stored draft: the confirmed content is re-sent as is. */
  async sendDraft(token, draftId) {
    const d = JSON.parse(draftId) as { to: string[]; cc: string[]; subject: string; body: string };
    const a = await zohoAccount(token);
    await zcall(`/api/accounts/${a.accountId}/messages`, token, { method: "POST", body: JSON.stringify({ fromAddress: a.primaryEmailAddress, toAddress: d.to.join(","), ccAddress: d.cc.join(","), subject: d.subject, content: d.body, mailFormat: "plaintext" }) });
  },
};

export const ADAPTERS: Record<ProviderId, Adapter> = { google, microsoft, slack, zoho };
