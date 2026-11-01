"use client";

/* Saving a confirmed Kaju proposal. Each kind runs the SAME
   server-authorised action the manual screens use (sp/data/work), under the
   person's own session, so permissions, validation and history are
   identical. The saved text carries "Prepared with StrayPaw AI, confirmed
   by <name>", and a database trigger writes an operational_audit_log row
   (ai_assisted_insert, naming the person) in the same transaction as the
   change, so the audit cannot be skipped by the browser
   (supabase/staging-sync/2026-10-31-write-audit.sql). */

import { addNote, openCase, recordCare, scheduleFollowup, type Receipt } from "@/sp/data/work";
import { getSupabase } from "@/lib/supabase";
import type { Proposal } from "./types";

const MARK = (who: string) => `Prepared with StrayPaw AI, confirmed by ${who}.`;

export type Saved = Receipt & { href?: string };

export async function executeProposal(p: Proposal, actor: { id: string; name: string }): Promise<Saved> {
  let r: Saved;
  switch (p.kind) {
    case "open_case": {
      const res = await openCase({ title: p.title, city: p.city, zone: p.zone, category: p.category, severity: p.severity, description: `${p.description}\n\n${MARK(actor.name)}`.trim(), dogId: p.dogId }, actor);
      r = { ...res, href: res.ok && res.id ? `/ngo/cases/${res.id}` : undefined };
      break;
    }
    case "add_note":
      r = { ...(await addNote(p.caseId, actor, `${p.note}\n\n${MARK(actor.name)}`)), href: `/ngo/cases/${p.caseId}` };
      break;
    case "schedule_followup":
      r = { ...(await scheduleFollowup(p.caseId, p.dogId, p.dueAt, `${p.note ? `${p.note} · ` : ""}${MARK(actor.name)}`)), href: `/ngo/cases/${p.caseId}` };
      break;
    case "record_care":
      r = { ...(await recordCare(p.dogId, { kind: p.careKind, date: p.date, notes: `${p.notes ? `${p.notes} · ` : ""}${MARK(actor.name)}`, by: actor.name })), href: `/ngo/animals/${p.dogId}` };
      break;
    case "email":
      r = await act(p.send ? "email_send" : "email_draft", p.provider, { to: p.to, cc: p.cc, subject: p.subject, body: p.body }, p.send ? `Email sent from ${p.providerName}` : `Draft saved in ${p.providerName}`);
      break;
    case "calendar_event":
      r = await act("calendar_event", p.provider, { title: p.title, start: p.start, end: p.end, attendees: p.attendees, location: p.location }, `Event added to ${p.providerName}`);
      break;
    case "chat_post":
      r = await act("chat_post", p.provider, { channel: p.channel, text: p.text }, `Posted to #${p.channelName}`);
      break;
    case "sms":
      r = await act("sms", "sms", { to: p.to, values: p.values }, `SMS sent to ${p.to.length}`);
      break;
    case "report_file": {
      const dl = await download(p.format, p.source, p.title);
      r = dl.ok && p.saveTo ? await act("save_report", p.saveTo, { format: p.format, source: p.source, title: p.title }, `Downloaded and saved to ${p.saveToName}`) : dl;
      break;
    }
  }
  void logAction(p, r);
  return r;
}

/** Optional extra log of the proposal's reason ("why"). Best-effort and not
    the audit record: the database trigger above is. Returns quietly if the
    optional ai_action_log table has not been applied. */
async function logAction(p: Proposal, r: Saved) {
  try {
    const supa = getSupabase();
    const token = (await supa?.auth.getSession())?.data.session?.access_token;
    if (!token) return;
    await fetch("/api/ai/log", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ kind: p.kind, ok: r.ok, target: r.href ?? null, summary: "why" in p ? p.why : null }) });
  } catch { /* the record's own history already holds the change */ }
}

/* ── connections: actions outside StrayPaw, only ever after Confirm ── */
async function token() {
  return (await getSupabase()?.auth.getSession())?.data.session?.access_token ?? null;
}
async function act(action: string, provider: string, payload: Record<string, unknown>, what: string): Promise<Saved> {
  const t = await token();
  if (!t) return { ok: false, error: "Sign in again to continue." };
  const res = await fetch("/api/connections/act", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ action, provider, payload }) });
  const j = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, at: new Date().toISOString(), what, href: j.url ?? undefined } : { ok: false, error: j.error ?? "Not done. Nothing was sent." };
}
async function download(format: string, source: string, title: string): Promise<Saved> {
  const t = await token();
  if (!t) return { ok: false, error: "Sign in again to continue." };
  const res = await fetch("/api/files/export", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ format, source, title }) });
  if (!res.ok) { const j = await res.json().catch(() => ({})); return { ok: false, error: j.error ?? "The report could not be made." }; }
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? `report.${format}`;
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return { ok: true, at: new Date().toISOString(), what: `${name} downloaded` };
}
