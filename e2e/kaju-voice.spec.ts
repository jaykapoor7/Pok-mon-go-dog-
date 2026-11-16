import { test, expect } from "@playwright/test";

// Run against opted-in localhost next dev with unfilled Voice Agents settings.
test.skip(process.env.VOICE_TEST_E2E !== "1", "Local voice proof only; disabled in hosted/production environments.");

test("voice setup stays honest and fits desktop and phone", async ({ page }) => {
  let providerRequests = 0;
  page.on("request", (req) => { if (/sarvam\.ai/.test(req.url())) providerRequests++; });
  const response = await page.goto("/kaju/voice");
  expect(response?.headers()["permissions-policy"]).toContain("microphone=(self)");
  await expect(page.getByRole("heading", { name: "Speak with Kaju" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start conversation" })).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("Not connected");
  await expect(page.getByLabel("Starting language").locator("option")).toHaveText(["English", "Hindi", "Kannada"]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(providerRequests).toBe(0);
});

test("unconfigured proxy refuses without exposing configuration or making calls", async ({ request }) => {
  const config = await request.get("/api/kaju/voice/config", { headers: { "X-StrayPaw-Voice-Test": "1" } });
  expect(config.status()).toBe(401);
  expect(config.headers()["cache-control"]).toBe("private, no-store");
  const unsigned = await request.get("/api/kaju/voice/config");
  expect(unsigned.status()).toBe(403);
});
