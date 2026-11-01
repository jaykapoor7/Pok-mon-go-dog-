import { NextResponse } from "next/server";
import { ADAPTERS, ProviderAuthError, need as fn } from "@/lib/connections/adapters";
import { sendSms, smsConfigured } from "@/lib/connections/sms";
import { accessToken, audit, caller, markStatus, touch } from "@/lib/connections/server";
import { isProvider, PROVIDERS, type Capability } from "@/lib/connections/providers";
import { makeFile, type FileKind } from "@/lib/files/native";
import { buildReport } from "@/lib/files/reports";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { REPORT_SOURCES, type ReportSource } from "@/sp3/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* POST: carry out an action the person confirmed in Kaju's panel.
   The only route that writes outside StrayPaw. Every input is checked
   again here (the panel is not trusted), the person's own token is used,
   the connection must allow the capability, and every attempt is audited. */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const FORMATS: FileKind[] = ["pdf", "docx", "xlsx", "csv", "pptx", "geojson", "kml"];

export async function POST(req: Request) {
  if (!(await allowRequest(clientIp(req), "conn-act", 20, 600))) return NextResponse.json({ error: "Too many actions at once. Wait a minute." }, { status: 429 });
  const c = await caller(req);
  if (!c) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = await req.json().catch(() => null) as { action?: string; provider?: string; payload?: Record<string, unknown> } | null;
  if (b?.action === "sms") {
    /* Organisation SMS: a lead or coordinator, with SMS switched on by the lead, to Indian mobile numbers only. */
    const x = b.payload ?? {};
    if (!c.ngoId || !["admin", "coordinator"].includes(c.role ?? "")) return NextResponse.json({ error: "Only a lead or coordinator can send SMS." }, { status: 403 });
    if (!smsConfigured()) return NextResponse.json({ error: "SMS is not set up yet." }, { status: 503 });
    const { data: pol } = await c.db.from("org_connection_policies").select("allowed").eq("ngo_id", c.ngoId).eq("provider", "sms").maybeSingle();
    if (!pol?.allowed) return NextResponse.json({ error: "Your organisation lead has not switched on SMS." }, { status: 403 });
    try {
      const r = await sendSms((Array.isArray(x.to) ? x.to : []).map(String), (Array.isArray(x.values) ? x.values : []).map(String));
      await audit({ user_id: c.userId, ngo_id: c.ngoId, provider: "sms" as never, action: "sms_sent", detail: { recipients: r.count, service: "msg91" } });
      return NextResponse.json({ ok: true, id: r.id, url: null });
    } catch (e) { return NextResponse.json({ error: (e as Error).message.slice(0, 200) }, { status: 400 }); }
  }
  if (!b?.action || !b.provider || !isProvider(b.provider)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const p = b.provider, x = b.payload ?? {};
  const need: Record<string, Capability> = { email_draft: "mail.draft", email_send: "mail.send", calendar_event: "calendar.create", save_report: "files.create", chat_post: "chat.post" };
  const cap = need[b.action];
  if (!cap) return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  if (!PROVIDERS[p].capabilities.includes(cap)) return NextResponse.json({ error: "Not supported by this provider" }, { status: 400 });
  const t = await accessToken(c, p);
  if ("error" in t) return NextResponse.json({ error: t.error }, { status: 409 });
  const A = ADAPTERS[p];
  try {
    let result: { id: string; url: string | null };
    if (b.action === "email_draft" || b.action === "email_send") {
      const to = (Array.isArray(x.to) ? x.to : []).map(String).filter((e) => EMAIL.test(e)).slice(0, 20);
      const cc = (Array.isArray(x.cc) ? x.cc : []).map(String).filter((e) => EMAIL.test(e)).slice(0, 20);
      if (!to.length) return NextResponse.json({ error: "Add at least one valid address." }, { status: 400 });
      const mail = { to, cc, subject: String(x.subject ?? "").slice(0, 200), body: String(x.body ?? "").slice(0, 10_000) };
      if (p === "zoho" && b.action === "email_send") {
        /* Zoho sends directly; drafting first would leave a stray draft behind. */
        await fn(A, "sendDraft")(t.token, JSON.stringify(mail));
        result = { id: "zoho-sent", url: null };
      } else {
        result = await fn(A, "createDraft")(t.token, mail);
        if (b.action === "email_send") await fn(A, "sendDraft")(t.token, result.id);
        if (p === "zoho") result = { id: "zoho-draft", url: null };
      }
    } else if (b.action === "calendar_event") {
      const start = new Date(String(x.start)), end = new Date(String(x.end));
      if (Number.isNaN(+start) || Number.isNaN(+end) || end <= start) return NextResponse.json({ error: "The event needs a valid start and end." }, { status: 400 });
      const attendees = (Array.isArray(x.attendees) ? x.attendees : []).map(String).filter((e) => EMAIL.test(e)).slice(0, 30);
      result = await fn(A, "createEvent")(t.token, { title: String(x.title ?? "").slice(0, 200), start: start.toISOString(), end: end.toISOString(), attendees, location: x.location ? String(x.location).slice(0, 200) : undefined });
    } else if (b.action === "chat_post") {
      const text = String(x.text ?? "").trim().slice(0, 3500);
      const channel = String(x.channel ?? "").slice(0, 40);
      if (!text || !/^[CG][A-Z0-9]+$/.test(channel)) return NextResponse.json({ error: "Choose a channel and write the message." }, { status: 400 });
      result = await fn(A, "postMessage")(t.token, channel, text);
    } else {
      if (!c.ngoId) return NextResponse.json({ error: "Reports need an organisation workspace." }, { status: 403 });
      const format = FORMATS.includes(x.format as FileKind) ? (x.format as FileKind) : "pdf";
      const source = REPORT_SOURCES.includes(x.source as ReportSource) ? (x.source as ReportSource) : "open_cases";
      const file = await makeFile(format, await buildReport(source, c.db, String(x.title ?? "")));
      result = await fn(A, "saveFile")(t.token, file.filename, file.mime, file.bytes);
    }
    await touch(t.connectionId);
    await audit({ connection_id: t.connectionId, user_id: c.userId, ngo_id: c.ngoId, provider: p, action: b.action, detail: { id: result.id } });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof ProviderAuthError) { await markStatus(t.connectionId, "expired", "Access no longer accepted"); return NextResponse.json({ error: `Reconnect ${PROVIDERS[p].name} in Settings → Connections.` }, { status: 409 }); }
    await audit({ connection_id: t.connectionId, user_id: c.userId, ngo_id: c.ngoId, provider: p, action: `${b.action}_failed`, detail: { error: (e as Error).message.slice(0, 200) } });
    return NextResponse.json({ error: `${PROVIDERS[p].name} did not accept it: ${(e as Error).message.slice(0, 160)}` }, { status: 502 });
  }
}
