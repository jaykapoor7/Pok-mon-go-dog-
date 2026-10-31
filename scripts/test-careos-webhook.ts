/* CareOS webhook: signatures are enforced and Meta payloads become idempotent jobs. */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { toJobs, verifySignature } from "../src/lib/careos/webhook";

const secret = "test-secret";
const body = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [{ changes: [{ field: "messages", value: {
    metadata: { phone_number_id: "PNID" },
    contacts: [{ wa_id: "919800000000", profile: { name: "Field A" } }],
    messages: [{ id: "wamid.1", from: "919800000000", type: "text", text: { body: "Released after ABC, Saibaba Colony" } }, { id: "wamid.2", from: "919800000000", type: "location", location: { latitude: 11.0, longitude: 76.9 } }],
    statuses: [{ id: "wamid.9", status: "delivered", recipient_id: "919800000000" }],
  } }] }],
});
const sig = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
assert.equal(verifySignature(body, sig, secret), true);
assert.equal(verifySignature(body + " ", sig, secret), false, "tampered body");
assert.equal(verifySignature(body, sig, "other"), false, "wrong secret");
assert.equal(verifySignature(body, null, secret), false, "missing header");
assert.equal(verifySignature(body, "sha256=zz", secret), false, "malformed header");
const jobs = toJobs(JSON.parse(body));
assert.deepEqual(jobs.map((j) => j.key), ["wa:msg:wamid.1", "wa:msg:wamid.2", "wa:status:wamid.9:delivered"]);
assert.equal(jobs[0].kind, "message");
assert.equal(jobs[0].payload.text, "Released after ABC, Saibaba Colony");
assert.equal(jobs[0].payload.name, "Field A");
assert.deepEqual(jobs[1].payload.location, { lat: 11.0, lng: 76.9, label: null });
assert.deepEqual(jobs[2], { key: "wa:status:wamid.9:delivered", kind: "status", payload: { id: "wamid.9", recipient: "919800000000", status: "delivered", timestamp: null, error: null } });
assert.deepEqual(toJobs({ object: "page", entry: [] }), [], "other objects ignored");
assert.deepEqual(toJobs(null), []);
console.log("careos-webhook: 13 checks passed");
