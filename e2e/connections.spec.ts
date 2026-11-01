import { expect, test } from "@playwright/test";

/* Kaju Connections without a session: every door is closed and nothing
   pretends to be connected. Signed-in flows need provider credentials and
   are checked on staging (scripts/test-connections.ts, RLS checks). */

test("the Connections page asks a visitor to sign in", async ({ page }) => {
  await page.goto("/ngo/settings/connections");
  await expect(page.getByRole("heading", { level: 1, name: "Connections" })).toBeVisible();
  await expect(page.getByText("Sign in to connect your tools with Kaju.")).toBeVisible();
  await expect(page.getByText("Connected", { exact: true })).toHaveCount(0);
});

test("connection APIs refuse requests without a session", async ({ request }) => {
  for (const [method, path] of [["GET", "/api/connections"], ["POST", "/api/connections/google/start"], ["POST", "/api/connections/microsoft/start"], ["DELETE", "/api/connections/google"], ["POST", "/api/connections/policy"], ["POST", "/api/connections/act"], ["POST", "/api/files/export"]] as const) {
    const r = await request.fetch(path, { method, data: {} });
    expect([401, 429, 503], `${method} ${path}`).toContain(r.status());
  }
  const forged = await request.post("/api/connections/act", { headers: { Authorization: "Bearer forged.token.value" }, data: { action: "email_send", provider: "google", payload: { to: ["a@b.org"] } } });
  expect([401, 429]).toContain(forged.status());
});

test("an OAuth callback without a valid signed state is refused", async ({ request }) => {
  // Resolve the host redirect before checking the application callback.
  const origin = new URL((await request.get("/")).url()).origin;
  const r = await request.get(`${origin}/api/connections/google/callback?code=abc&state=forged.state`, { maxRedirects: 0, headers: { Cookie: "sp_conn_google=%" } });
  expect(r.status()).toBeGreaterThanOrEqual(300);
  expect(r.status()).toBeLessThan(400);
  expect(r.headers()["location"]).toMatch(/connection=error/);
});

test("an unknown provider does not exist", async ({ request }) => {
  const r = await request.post("/api/connections/dropbox/start");
  expect(r.status()).toBe(404);
});
