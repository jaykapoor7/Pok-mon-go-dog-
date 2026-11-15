import { NextResponse } from "next/server";
import webpush from "web-push";
import { getSupabaseAdmin } from "@/lib/supabase";
import { SITE_URL } from "@/lib/site-url";
import { attempt, type Delivery, type Senders } from "@/lib/notify/deliver";
import { sendSms } from "@/lib/connections/sms";
import { sendEmailAs } from "@/lib/connections/send";

/* The delivery worker for notifications outside StrayPaw (email, browser push). Runs on the deployment's schedule with
   the cron secret. Every attempt is recorded on nx_deliveries; nothing is sent through a provider that is not set up. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Store unavailable" }, { status: 503 });
  const now = new Date();
  const due = await db.from("nx_deliveries").select("id,channel,attempts,user_id,notification_id,nx_notifications(title,kind,href)").in("status", ["queued", "held_quiet"]).lte("next_attempt_at", now.toISOString()).order("next_attempt_at").limit(100);
  if (due.error) { console.info("notifications delivery", JSON.stringify({ state: /does not exist|schema cache|PGRST/i.test(due.error.message) ? "awaiting the collaboration database change" : "read failed" })); return NextResponse.json({ ran: 0 }, { status: 200 }); }

  const key = process.env.RESEND_API_KEY?.trim(), from = process.env.EMAIL_FROM?.trim() || "StrayPaw <hello@straypaw.org>";
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim(), vapidPrivate = process.env.VAPID_PRIVATE_KEY?.trim(), vapidSubject = process.env.VAPID_SUBJECT?.trim();
  const send: Senders = {};
  if (key) send.email = async (to, subject, link) => {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to, subject: `StrayPaw: ${subject}`, text: `${subject}\n\nOpen it in StrayPaw: ${link}\n\nYou get these emails because you turned them on in StrayPaw's notification settings.`, html: `<p>${subject.replace(/[<>&]/g, "")}</p><p><a href="${link}">Open it in StrayPaw</a></p><p style="color:#667085;font-size:12px">You get these emails because you turned them on in StrayPaw&rsquo;s notification settings.</p>` }) });
    const j = await r.json().catch(() => ({})) as { id?: string; message?: string };
    return r.ok ? { ok: true, ref: j.id ?? null } : { ok: false, error: j.message ?? `Email provider answered ${r.status}` };
  };
  if (vapidPublic && vapidPrivate && vapidSubject) {
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
    send.push = async (s, title, link) => {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title, url: link }), { TTL: 3600 }); return { ok: true }; }
      catch (e) { const code = (e as { statusCode?: number }).statusCode; return { ok: false, gone: code === 404 || code === 410, error: `Push service answered ${code ?? "an error"}` }; }
    };
  }
  let sent = 0, held = 0, failed = 0, notConnected = 0;
  const started = Date.now();
  for (const row of (due.data ?? []) as unknown as (Delivery & { nx_notifications: { title: string; kind: string; href: string | null } | null })[]) {
    if (Date.now() - started > 45_000) break;
    const n = row.nx_notifications; if (!n) continue;
    const [u, st, subs] = await Promise.all([
      db.auth.admin.getUserById(row.user_id),
      db.from("nx_notification_settings").select("quiet_from,quiet_to,time_zone").eq("user_id", row.user_id).maybeSingle(),
      row.channel === "push" ? db.from("nx_push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", row.user_id) : Promise.resolve({ data: [] }),
    ]);
    const out = await attempt(row, n, { now, settings: st.data ?? null, email: u.data.user?.email ?? null, subs: (subs.data ?? []) as { endpoint: string; p256dh: string; auth: string }[], site: SITE_URL.replace(/\/$/, "") }, send);
    await db.from("nx_deliveries").update({ status: out.status, attempts: row.attempts + (out.status === "held_quiet" || out.status === "not_connected" ? 0 : 1), next_attempt_at: out.next_attempt_at ?? now.toISOString(), last_error: out.last_error ?? null, provider_ref: out.provider_ref ?? null, updated_at: now.toISOString() }).eq("id", row.id);
    if (out.status === "sent") sent++; else if (out.status === "held_quiet") held++; else if (out.status === "not_connected") notConnected++; else if (out.status === "failed") failed++;
  }
  /* Consented PEP reminders from the clinicians' schedules, through the organisation's approved SMS template. */
  const pep = { due: 0, sent: 0, not_connected: 0, failed: 0 };
  const smsReady = !!process.env.MSG91_AUTH_KEY?.trim() && !!process.env.MSG91_PEP_TEMPLATE_ID?.trim();
  const rem = await db.rpc("nx_pep_outbox_due", { p_limit: 50 });
  for (const r of (rem.error ? [] : rem.data ?? []) as { id: string; channel: string; phone: string; vars: string[]; attempts: number }[]) {
    if (Date.now() - started > 50_000) break;
    pep.due++;
    if (r.channel !== "sms" || !smsReady) { await db.rpc("nx_pep_outbox_mark", { p_id: r.id, p_status: "not_connected", p_error: r.channel === "sms" ? "No approved SMS reminder template is configured." : "WhatsApp is not connected." }); pep.not_connected++; continue; }
    try {
      const prev = process.env.MSG91_TEMPLATE_ID; process.env.MSG91_TEMPLATE_ID = process.env.MSG91_PEP_TEMPLATE_ID;
      const out = await sendSms([r.phone], Array.isArray(r.vars) ? r.vars.map(String) : []).finally(() => { process.env.MSG91_TEMPLATE_ID = prev; });
      await db.rpc("nx_pep_outbox_mark", { p_id: r.id, p_status: "sent", p_ref: out.id }); pep.sent++;
    } catch (e) { await db.rpc("nx_pep_outbox_mark", { p_id: r.id, p_status: r.attempts + 1 >= 5 ? "failed" : "retry", p_error: e instanceof Error ? e.message : "SMS failed" }); pep.failed++; }
  }
  /* Approved messages from Kaju missions to people outside StrayPaw, sent as the person who approved them. */
  const ext = { due: 0, sent: 0, not_connected: 0, failed: 0 };
  const out = await db.from("nx_outbox").select("id,org_id,channel,recipient,subject,body,attempts,created_by,approved_by").eq("status", "queued").not("approved_at", "is", null).lte("next_attempt_at", now.toISOString()).limit(30);
  for (const m of (out.error ? [] : out.data ?? []) as { id: string; org_id: string; channel: string; recipient: string; subject: string | null; body: string; attempts: number; created_by: string; approved_by: string }[]) {
    if (Date.now() - started > 55_000) break;
    ext.due++;
    const mark = (status: string, error: string | null, ref: string | null = null) => db.from("nx_outbox").update({ status, attempts: m.attempts + (status === "not_connected" ? 0 : 1), last_error: error, provider_ref: ref, next_attempt_at: status === "queued" ? new Date(now.getTime() + Math.min(60, 2 ** (m.attempts + 1)) * 60000).toISOString() : now.toISOString(), updated_at: now.toISOString() }).eq("id", m.id);
    if (m.channel !== "email") { await mark("not_connected", `${m.channel === "sms" ? "SMS" : "WhatsApp"} from missions is not connected.`); ext.not_connected++; continue; }
    const r = await sendEmailAs(db, m.approved_by ?? m.created_by, m.org_id, { to: m.recipient, subject: m.subject ?? "From StrayPaw", body: m.body });
    if (r.ok) { await mark("sent", null, r.ref); ext.sent++; }
    else if (!r.connected) { await mark("not_connected", r.error); ext.not_connected++; }
    else { await mark(m.attempts + 1 >= 5 ? "failed" : "queued", r.error); ext.failed++; }
  }
  console.info("notifications delivery", JSON.stringify({ due: due.data?.length ?? 0, sent, held, failed, not_connected: notConnected, pep, outside: ext }));
  return NextResponse.json({ due: due.data?.length ?? 0, sent, held, failed, not_connected: notConnected, pep, outside: ext }, { headers: { "Cache-Control": "no-store" } });
}
