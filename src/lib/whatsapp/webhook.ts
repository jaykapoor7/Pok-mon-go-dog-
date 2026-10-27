import { whatsappConfig } from "./config";
import { boundedBody, equalSecret, validSignature } from "./security";
import { parseWebhook, type Event } from "./protocol";

export function verifyWebhook(req: Request, token = whatsappConfig().verifyToken) {
  const q = new URL(req.url).searchParams;
  if (!token) return new Response("Webhook not configured", { status: 503 });
  if (q.get("hub.mode") !== "subscribe" || !equalSecret(q.get("hub.verify_token") || "", token) || !q.get("hub.challenge")) {
    return new Response("Forbidden", { status: 403 });
  }
  return new Response(q.get("hub.challenge"), { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function receiveWebhook(req: Request, enqueue: (events: Event[]) => Promise<void>, config = whatsappConfig()) {
  if (!config.appSecret) return new Response("Webhook not configured", { status: 503 });
  let raw: Uint8Array;
  try { raw = await boundedBody(req); } catch { return new Response("Payload too large", { status: 413 }); }
  if (!validSignature(raw, req.headers.get("x-hub-signature-256"), config.appSecret)) return new Response("Invalid signature", { status: 401 });
  let events: Event[];
  try { events = parseWebhook(JSON.parse(Buffer.from(raw).toString("utf8")), config.wabaId, config.phoneNumberId); }
  catch { return new Response("Invalid payload", { status: 400 }); }
  try { if (events.length) await enqueue(events); }
  catch { return new Response("Temporarily unavailable", { status: 503 }); }
  return new Response("EVENT_RECEIVED", { status: 200 });
}
