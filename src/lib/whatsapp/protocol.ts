import { createHash } from "node:crypto";

export type Inbound = {
  id: string; from: string; timestamp: number; type: string; text: string;
  location?: { lat: number; lng: number }; mediaId?: string; mediaKind?: string;
  media?: { id: string; kind: string; path: string; mime: string };
  extraction?: { description: string; urgency: string };
};
export type Delivery = { id: string; recipient: string; status: string; timestamp: number; error?: number };
export type Event = { key: string; kind: "message" | "status"; payload: Inbound | Delivery };
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Obj : {};
const list = (v: unknown) => Array.isArray(v) ? v : [];
const str = (v: unknown) => typeof v === "string" ? v : "";
const phone = (v: unknown) => /^\d{7,15}$/.test(str(v));

/** Only signed, allowlisted WABA/phone events reach the durable queue. */
export function parseWebhook(body: unknown, waba: string, phoneId: string): Event[] {
  const root = obj(body); if (root.object !== "whatsapp_business_account") return [];
  const events: Event[] = [];
  for (const entry of list(root.entry)) {
    const e = obj(entry); if (e.id !== waba) continue;
    for (const change of list(e.changes)) {
      const c = obj(change), v = obj(c.value);
      if (c.field !== "messages" || obj(v.metadata).phone_number_id !== phoneId) continue;
      for (const item of list(v.messages)) {
        const m = obj(item), id = str(m.id), from = str(m.from), type = str(m.type);
        const timestamp = Number(m.timestamp);
        if (!id || id.length > 300 || !phone(from) || !Number.isFinite(timestamp)) continue;
        const interactive = obj(m.interactive);
        const text = str(obj(m.text).body) || str(obj(interactive.button_reply).id) || str(obj(interactive.list_reply).id) || str(obj(m.button).payload) || str(obj(m.button).text) || str(obj(m[type]).caption);
        const payload: Inbound = { id, from, timestamp, type, text: text.slice(0, 4000) };
        if (type === "location") {
          const l = obj(m.location), lat = Number(l.latitude), lng = Number(l.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) payload.location = { lat, lng };
        }
        if (["image", "audio", "video", "document"].includes(type)) {
          const mediaId = str(obj(m[type]).id);
          if (/^\d{1,40}$/.test(mediaId)) { payload.mediaId = mediaId; payload.mediaKind = type; }
        }
        events.push({ key: `in:${id}`, kind: "message", payload });
      }
      for (const item of list(v.statuses)) {
        const s = obj(item), id = str(s.id), recipient = str(s.recipient_id), status = str(s.status), timestamp = Number(s.timestamp);
        if (!id || !phone(recipient) || !["sent", "delivered", "read", "failed"].includes(status) || !Number.isFinite(timestamp)) continue;
        const error = Number(obj(list(s.errors)[0]).code) || undefined;
        events.push({ key: `status:${id}:${status}:${timestamp}`, kind: "status", payload: { id, recipient, status, timestamp, error } });
      }
    }
  }
  if (events.length > 100) throw new Error("too_many_events");
  return events;
}

export function mediaPath(messageId: string, mediaId: string) {
  return `${createHash("sha256").update(messageId).digest("hex")}/${mediaId}`;
}
