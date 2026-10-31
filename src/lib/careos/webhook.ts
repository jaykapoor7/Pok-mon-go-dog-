import { createHmac, timingSafeEqual } from "node:crypto";

/* ════════════════════════════════════════════════════════════════════
   CareOS: the WhatsApp Cloud API webhook, reduced to two pure steps so
   they can be tested without Meta:
     1. verifySignature: Meta signs the raw body with the app secret
        (X-Hub-Signature-256: sha256=<hex>). Anything unsigned or wrongly
        signed is refused before it is parsed.
     2. toJobs: each inbound message and delivery status becomes one
        idempotent job for careos_enqueue(p_events jsonb), keyed by
        Meta's own id, so a retried delivery is never queued twice.
   Structuring a message into a record happens later, in the CareOS
   worker and the NGO inbox, always with a person's review.
   ════════════════════════════════════════════════════════════════════ */

export function verifySignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header || !header.startsWith("sha256=") || !appSecret) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const got = header.slice(7);
  if (got.length !== expected.length || !/^[0-9a-f]+$/i.test(got)) return false;
  return timingSafeEqual(Buffer.from(got, "hex"), Buffer.from(expected, "hex"));
}

/* The shape careos_process_job reads (the existing CareOS backend): a flat
   payload. Messages: id, from, timestamp, text (plus type, location, media,
   name). Statuses: id, recipient, status, timestamp, error. */
export type CareJob = { key: string; kind: "message" | "status"; payload: Record<string, unknown> };

type Msg = {
  id?: string; from?: string; timestamp?: string; type?: string;
  text?: { body?: string }; button?: { text?: string }; interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
  location?: { latitude?: number; longitude?: number; name?: string; address?: string };
  image?: { id?: string; mime_type?: string; caption?: string }; video?: { id?: string; mime_type?: string; caption?: string };
  audio?: { id?: string; mime_type?: string }; document?: { id?: string; mime_type?: string; caption?: string };
};
type Value = {
  metadata?: { phone_number_id?: string };
  contacts?: { wa_id?: string; profile?: { name?: string } }[];
  messages?: Msg[];
  statuses?: { id?: string; status?: string; timestamp?: string; recipient_id?: string; errors?: { code?: number | string }[] }[];
};

function flatMessage(m: Msg, name: string | null, pnid: string | null): Record<string, unknown> {
  const media = m.image ?? m.video ?? m.audio ?? m.document ?? null;
  const kind = m.image ? "image" : m.video ? "video" : m.audio ? "audio" : m.document ? "document" : null;
  const text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? (media && "caption" in media ? media.caption : undefined) ?? "";
  return {
    id: m.id, from: m.from, timestamp: m.timestamp, type: m.type ?? kind ?? "text", text,
    name, phone_number_id: pnid,
    location: m.location ? { lat: m.location.latitude ?? null, lng: m.location.longitude ?? null, label: m.location.name ?? m.location.address ?? null } : null,
    media: media?.id ? [{ id: media.id, kind, mime: media.mime_type ?? null }] : [],
  };
}

export function toJobs(body: unknown): CareJob[] {
  const b = body as { object?: string; entry?: { changes?: { field?: string; value?: Value }[] }[] };
  if (b?.object !== "whatsapp_business_account" || !Array.isArray(b.entry)) return [];
  const jobs: CareJob[] = [];
  for (const e of b.entry) for (const c of e.changes ?? []) {
    if (c.field !== "messages" || !c.value) continue;
    const v = c.value;
    const pnid = v.metadata?.phone_number_id ?? null;
    for (const m of v.messages ?? []) {
      if (!m.id || !m.from) continue;
      const name = v.contacts?.find((x) => x.wa_id === m.from)?.profile?.name ?? null;
      jobs.push({ key: `wa:msg:${m.id}`, kind: "message", payload: flatMessage(m, name, pnid) });
    }
    for (const s of v.statuses ?? []) {
      if (!s.id || !s.status) continue;
      jobs.push({ key: `wa:status:${s.id}:${s.status}`, kind: "status", payload: { id: s.id, recipient: s.recipient_id ?? null, status: s.status, timestamp: s.timestamp ?? null, error: s.errors?.[0]?.code != null ? String(s.errors[0].code) : null } });
    }
  }
  return jobs.slice(0, 100);
}
