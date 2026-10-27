import { test, expect } from "@playwright/test";
import { createHmac } from "node:crypto";

// Local server only. These tests must never target production or a Meta phone.
test.skip(Boolean(process.env.E2E_BASE_URL && !/^http:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(process.env.E2E_BASE_URL)), "CareOS HTTP checks are local-only");

test("CareOS handshake echoes challenge as text and rejects the wrong token", async ({ request }) => {
  const good = await request.get("/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=careos-e2e-verification-only&hub.challenge=123456789");
  expect(good.status()).toBe(200); expect(await good.text()).toBe("123456789");
  expect(good.headers()["content-type"]).toContain("text/plain");
  expect((await request.get("/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123")).status()).toBe(403);
});
test("CareOS native route rejects invalid HMAC and cannot write while disabled", async ({ request }) => {
  const body = JSON.stringify({ object: "whatsapp_business_account", entry: [{ id: "1410300414599459", changes: [{ field: "messages", value: { metadata: { phone_number_id: "1388373327695772" }, messages: [{ id: "wamid.local.http-test", from: "919000000001", timestamp: String(Math.floor(Date.now() / 1000)), type: "text", text: { body: "REPORT" } }] } }] }] });
  expect((await request.post("/api/whatsapp/webhook", { data: body, headers: { "x-hub-signature-256": "sha256=" + "0".repeat(64) } })).status()).toBe(401);
  const signature = "sha256=" + createHmac("sha256", "careos-e2e-app-secret-only").update(body).digest("hex");
  expect((await request.post("/api/whatsapp/webhook", { data: body, headers: { "x-hub-signature-256": signature } })).status()).toBe(503);
});
test("CareOS worker and private media require authorization", async ({ request }) => {
  expect((await request.get("/api/whatsapp/worker")).status()).toBe(401);
  expect((await request.get("/api/whatsapp/media/123")).status()).toBe(401);
});
test("signed-out NGO inbox and settings protect staff controls", async ({ page }) => {
  await page.goto("/ngo/inbox");
  await expect(page.getByRole("button", { name: "Accept this report" })).toHaveCount(0);
  await page.goto("/ngo/settings");
  await expect(page.getByRole("button", { name: "Create my link code" })).toHaveCount(0);
});
