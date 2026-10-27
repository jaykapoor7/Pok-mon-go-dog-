import { whatsappConfig } from "./config";
import { mediaPath } from "./protocol";

export type Outbound = { id: string; lease: string; phone: string; body: string; notice: string; buttons: { id: string; title: string }[]; language: string; last_inbound: string; attempts: number };
export class MetaError extends Error {
  constructor(public code: string, public retryable = false, public uncertain = false) { super(code); }
}
export function messagePayload(row: Outbound, now = Date.now(), templates = process.env.CAREOS_TEMPLATES_JSON): Record<string, unknown> | null {
  const base = { messaging_product: "whatsapp", recipient_type: "individual", to: row.phone };
  if (now - Date.parse(row.last_inbound) < 24 * 60 * 60 * 1000 && Date.parse(row.last_inbound) <= now + 60000) {
    // Meta limits interactive bodies to 1024 characters. Keep a long report's
    // complete confirmation text and let the user type CONFIRM instead.
    if (row.buttons.length && Array.from(row.body).length <= 1024) return { ...base, type: "interactive", interactive: { type: "button", body: { text: row.body }, action: { buttons: row.buttons.slice(0, 3).map(b => ({ type: "reply", reply: { id: b.id, title: Array.from(b.title).slice(0, 20).join("") } })) } } };
    return { ...base, type: "text", text: { preview_url: false, body: row.body } };
  }
  let mapping: Record<string, { name: string; language: string }> = {};
  try { mapping = JSON.parse(templates || "{}"); } catch { return null; }
  const template = mapping[`${row.notice}:${row.language}`];
  if (!template || !/^[a-z0-9_]+$/.test(template.name) || !/^[a-z]{2}(_[A-Z]{2})?$/.test(template.language)) return null;
  // Approved utility templates must contain exactly one body text parameter.
  return { ...base, type: "template", template: { name: template.name, language: { code: template.language }, components: [{ type: "body", parameters: [{ type: "text", text: row.body.replace(/\s+/g, " ").trim().slice(0, 1024) }] }] } };
}

export async function sendMeta(row: Outbound, fetcher = fetch): Promise<{ state: string; metaId?: string; error?: string }> {
  const c = whatsappConfig();
  if (!c.accessToken) throw new MetaError("missing_access_token");
  const payload = messagePayload(row);
  if (!payload) return { state: "blocked", error: "template_required" };
  let res: Response;
  try {
    res = await fetcher(`https://graph.facebook.com/${c.version}/${c.phoneNumberId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${c.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000), redirect: "error" });
  } catch { throw new MetaError("send_network_unknown", false, true); }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = String(json.error?.code || res.status);
    // Only an explicit rejection is retried. A 5xx/timeout may have accepted a send.
    throw new MetaError(`meta_${code}`, res.status === 429, res.status >= 500);
  }
  const id = json.messages?.[0]?.id;
  if (typeof id !== "string") throw new MetaError("send_response_unknown", false, true);
  return { state: "sent", metaId: id };
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/aac", "audio/amr", "video/mp4", "application/pdf"]);
export function isMetaMediaUrl(value: string) {
  try { const u = new URL(value); return u.protocol === "https:" && ["lookaside.fbsbx.com", "lookaside.whatsapp.net"].includes(u.hostname) && !u.username && !u.password && (!u.port || u.port === "443"); }
  catch { return false; }
}
export async function downloadMedia(id: string, messageId: string, fetcher = fetch) {
  const c = whatsappConfig();
  if (!c.accessToken) throw new MetaError("missing_access_token");
  const headers = { Authorization: `Bearer ${c.accessToken}` };
  const meta = await fetcher(`https://graph.facebook.com/${c.version}/${id}?phone_number_id=${c.phoneNumberId}`, { headers, signal: AbortSignal.timeout(10000), redirect: "error" });
  if (!meta.ok) throw new MetaError("media_metadata_failed", true);
  const data = await meta.json();
  const mime = String(data.mime_type || "").split(";")[0].trim();
  if (!isMetaMediaUrl(data.url) || !ALLOWED_MIME.has(mime) || Number(data.file_size) > 16 * 1024 * 1024) throw new MetaError("media_not_supported");
  const res = await fetcher(data.url, { headers, redirect: "error", signal: AbortSignal.timeout(20000) });
  if (!res.ok || !res.body) throw new MetaError("media_download_failed", true);
  if (Number(res.headers.get("content-length")) > 16 * 1024 * 1024) throw new MetaError("media_too_large");
  const reader = res.body.getReader(), chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    length += value.length;
    if (length > 16 * 1024 * 1024) { await reader.cancel(); throw new MetaError("media_too_large"); }
    chunks.push(value);
  }
  return { bytes: Buffer.concat(chunks), mime, path: mediaPath(messageId, id) };
}
