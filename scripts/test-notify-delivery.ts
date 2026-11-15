/* Notification delivery decisions, without a network: quiet hours, providers that are not set up, retries with
   backoff, and approvals that are never held back. */
import assert from "node:assert/strict";
import { attempt, quietUntil } from "../src/lib/notify/deliver";

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
  console.log("\nNotification delivery: all checks passed");
})().catch((e) => { console.error(e); process.exit(1); });
