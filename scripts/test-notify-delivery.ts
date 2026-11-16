/* Notification delivery decisions, without a network: quiet hours, providers that are not set up, retries with
   backoff, and approvals that are never held back. */
import assert from "node:assert/strict";
import { attempt, quietUntil } from "../src/lib/notify/deliver";
import { deliverPepReminders, PEP_MAX_ATTEMPTS, type PepReminder } from "../src/lib/notify/pep";

const ok = (n: string) => console.log(`  ✓ ${n}`);
(async () => {
  const at = (iso: string) => new Date(iso);
  const night = { quiet_from: "21:00", quiet_to: "07:00", time_zone: "Asia/Kolkata" };
  assert.ok(quietUntil(at("2026-11-16T17:00:00Z"), night), "22:30 IST is quiet"); ok("22:30 in Kolkata is inside 21:00 to 07:00");
  assert.equal(quietUntil(at("2026-11-16T06:00:00Z"), night), null); ok("11:30 in Kolkata is not");
  const q = quietUntil(at("2026-11-16T17:00:00Z"), night)!; assert.equal(q.toISOString(), "2026-11-17T01:30:00.000Z"); ok("held until 07:00 local");
  const d = { id: "d", channel: "email" as const, attempts: 0, user_id: "u" };
  const n = { title: "Asha mentioned you in #field-ops", kind: "mention", href: "/channels/field-ops?m=1" };
  const ctx = { now: at("2026-11-16T06:00:00Z"), settings: night, email: "person@example.invalid", subs: [], site: "https://example.invalid" };
  assert.equal((await attempt(d, n, ctx, {})).status, "not_connected"); ok("no email provider: recorded as not connected, nothing sent");
  let seen = "";
  const sent = await attempt(d, n, ctx, { email: async (_to, subject, link) => { seen = `${subject} ${link}`; return { ok: true, ref: "r1" }; } });
  assert.equal(sent.status, "sent"); assert.ok(seen.includes("https://example.invalid/channels/field-ops")); ok("sent with a link back into StrayPaw");
  assert.ok(!seen.includes("van")); ok("the email carries the title and a link, not the message's wording");
  const quiet = await attempt(d, n, { ...ctx, now: at("2026-11-16T17:00:00Z") }, { email: async () => ({ ok: true }) });
  assert.equal(quiet.status, "held_quiet"); ok("held during quiet hours");
  const appr = await attempt(d, { ...n, kind: "approval" }, { ...ctx, now: at("2026-11-16T17:00:00Z") }, { email: async () => ({ ok: true }) });
  assert.equal(appr.status, "sent"); ok("an approval is not held by quiet hours");
  const retry = await attempt(d, n, ctx, { email: async () => ({ ok: false, error: "rate limited" }) });
  assert.equal(retry.status, "queued"); assert.ok(retry.next_attempt_at && Date.parse(retry.next_attempt_at) > ctx.now.getTime()); ok("a failure is retried later");
  const last = await attempt({ ...d, attempts: 4 }, n, ctx, { email: async () => ({ ok: false, error: "rejected" }) });
  assert.equal(last.status, "failed"); ok("after five tries it is recorded as failed");
  assert.equal((await attempt({ ...d, channel: "push" }, n, ctx, {})).status, "not_connected"); ok("push without keys: not connected");
  assert.equal((await attempt({ ...d, channel: "whatsapp" }, n, ctx, { email: async () => ({ ok: true }) })).status, "not_connected"); ok("WhatsApp: not connected, never pretended");

  /* PEP reminders: the worker's loop, with a stand-in sender and a stand-in recorder. */
  const marks: [string, string, string | null | undefined, string | null | undefined][] = [];
  const mark = async (id: string, status: string, error?: string | null, ref?: string | null) => { marks.push([id, status, error, ref]); };
  const rows: PepReminder[] = [{ id: "r1", channel: "sms", phone: "+91 98450 00001", vars: ["W12 HC", "2", "17 Nov"], attempts: 0 }];
  let texts: { phone: string; vars: string[] }[] = [];
  const sms = async (phone: string, vars: string[]) => { texts.push({ phone, vars }); return { id: "msg-1" }; };
  let res = await deliverPepReminders(rows, { smsReady: false, send: sms, mark, deadline: Date.now() + 60_000 });
  assert.deepEqual([texts.length, marks[0]?.[1], res.not_connected], [0, "not_connected", 1]); ok("PEP: no approved SMS template, so nothing is sent and it is recorded as not connected");
  marks.length = 0;
  res = await deliverPepReminders([{ ...rows[0], channel: "whatsapp" }], { smsReady: true, send: sms, mark, deadline: Date.now() + 60_000 });
  assert.deepEqual([texts.length, marks[0]?.[2]], [0, "WhatsApp is not connected."]); ok("PEP: WhatsApp is recorded as not connected, never pretended");
  marks.length = 0;
  res = await deliverPepReminders(rows, { smsReady: true, send: sms, mark, deadline: Date.now() + 60_000 });
  assert.deepEqual(texts, [{ phone: "+91 98450 00001", vars: ["W12 HC", "2", "17 Nov"] }]); assert.deepEqual(marks[0], ["r1", "sent", null, "msg-1"]); ok("PEP: sent once through the template, with the provider's reference kept");
  marks.length = 0; texts = [];
  const down = async () => { throw new Error("MSG91 answered 503"); };
  await deliverPepReminders(rows, { smsReady: true, send: down, mark, deadline: Date.now() + 60_000 });
  assert.deepEqual(marks[0], ["r1", "retry", "MSG91 answered 503", undefined]); ok("PEP: a failed send is marked for a retry, with the provider's answer");
  marks.length = 0;
  await deliverPepReminders([{ ...rows[0], attempts: PEP_MAX_ATTEMPTS - 1 }], { smsReady: true, send: down, mark, deadline: Date.now() + 60_000 });
  assert.equal(marks[0]?.[1], "failed"); ok(`PEP: the ${PEP_MAX_ATTEMPTS}th failure is final`);
  marks.length = 0;
  let recorded = 0;
  const flaky = async (id: string, status: string) => { recorded++; if (status === "sent") throw new Error("database unreachable"); marks.push([id, status, null, null]); };
  await assert.rejects(deliverPepReminders(rows, { smsReady: true, send: sms, mark: flaky, deadline: Date.now() + 60_000 }));
  assert.deepEqual([texts.length, recorded, marks.length], [1, 1, 0]); ok("PEP: a send that went out is never marked for a retry because recording it failed");
  marks.length = 0; texts = [];
  let clock = 0;
  res = await deliverPepReminders([rows[0], { ...rows[0], id: "r2" }], { smsReady: true, send: sms, mark, deadline: 0, now: () => clock++ });
  assert.deepEqual([res.due, texts.length], [1, 1]); ok("PEP: the run stops at its time limit and leaves the rest queued");
  console.log("\nNotification delivery: all checks passed");
})().catch((e) => { console.error(e); process.exit(1); });
