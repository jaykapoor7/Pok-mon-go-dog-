import "server-only";

/* Delivering notifications outside StrayPaw. In-app notifications are always shown; email and push are sent only to
   people who turned them on, only through a configured provider, and never with the message's wording: the subject
   is the notification's title and the body is a link back into StrayPaw, where access is checked again. Quiet hours
   hold anything that is not an approval. Failures are retried with backoff and then recorded as failed. */

export type Delivery = { id: string; channel: "email" | "push" | "sms" | "whatsapp"; attempts: number; user_id: string };
export type Settings = { quiet_from: string | null; quiet_to: string | null; time_zone: string };
export type Outcome = { status: "sent" | "failed" | "not_connected" | "held_quiet" | "queued"; next_attempt_at?: string; last_error?: string | null; provider_ref?: string | null };

const MAX = 5;
/** Minutes past midnight in the person's time zone. */
function localMinutes(now: Date, tz: string) {
  try { const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now).split(":").map(Number); return h * 60 + m; }
  catch { return now.getUTCHours() * 60 + now.getUTCMinutes(); }
}
const mins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
/** When quiet hours end, if now is inside them; null otherwise. */
export function quietUntil(now: Date, s: Settings | null): Date | null {
  if (!s?.quiet_from || !s.quiet_to) return null;
  const at = localMinutes(now, s.time_zone), from = mins(s.quiet_from), to = mins(s.quiet_to);
  const inside = from <= to ? at >= from && at < to : at >= from || at < to;
  if (!inside) return null;
  const wait = ((to - at) + 1440) % 1440 || 1440;
  return new Date(now.getTime() + wait * 60000);
}
export const backoff = (attempts: number, now: Date) => new Date(now.getTime() + Math.min(60, 2 ** attempts) * 60000);

export type Senders = {
  email?: (to: string, subject: string, link: string) => Promise<{ ok: boolean; ref?: string | null; error?: string }>;
  push?: (sub: { endpoint: string; p256dh: string; auth: string }, title: string, link: string) => Promise<{ ok: boolean; gone?: boolean; error?: string }>;
};

/** Decide and, if due, attempt one delivery. Pure apart from the senders, so it is tested without a network. */
export async function attempt(d: Delivery, n: { title: string; kind: string; href: string | null }, ctx: { now: Date; settings: Settings | null; email: string | null; subs: { endpoint: string; p256dh: string; auth: string }[]; site: string }, send: Senders): Promise<Outcome> {
  const link = `${ctx.site}${n.href && n.href.startsWith("/") ? n.href : "/next"}`;
  if (n.kind !== "approval") { const q = quietUntil(ctx.now, ctx.settings); if (q) return { status: "held_quiet", next_attempt_at: q.toISOString() }; }
  const fail = (e: string): Outcome => d.attempts + 1 >= MAX ? { status: "failed", last_error: e.slice(0, 500) } : { status: "queued", next_attempt_at: backoff(d.attempts + 1, ctx.now).toISOString(), last_error: e.slice(0, 500) };
  if (d.channel === "email") {
    if (!send.email) return { status: "not_connected", last_error: "No email provider is configured on this deployment." };
    if (!ctx.email) return { status: "failed", last_error: "This account has no email address." };
    const r = await send.email(ctx.email, n.title.slice(0, 160), link);
    return r.ok ? { status: "sent", provider_ref: r.ref ?? null } : fail(r.error ?? "The email provider refused the message.");
  }
  if (d.channel === "push") {
    if (!send.push) return { status: "not_connected", last_error: "Browser push is not configured on this deployment." };
    if (!ctx.subs.length) return { status: "failed", last_error: "No browser is subscribed." };
    const rs = await Promise.all(ctx.subs.map((s) => send.push!(s, n.title.slice(0, 120), link)));
    return rs.some((r) => r.ok) ? { status: "sent" } : fail(rs.find((r) => r.error)?.error ?? "Push failed.");
  }
  return { status: "not_connected", last_error: `${d.channel === "sms" ? "SMS" : "WhatsApp"} is not connected.` };
}
