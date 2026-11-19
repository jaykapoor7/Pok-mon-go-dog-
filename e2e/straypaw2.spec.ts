import { test, expect, type Page } from "@playwright/test";

/* ════════════════════════════════════════════════════════════════════
   StrayPaw 2.0 journeys. Public reads go to whatever record the server is
   configured for; every write is answered here, so the suite never writes
   to a real project. NGO screens are covered signed-out (the gate) here and
   signed-in by the local QA harness described in docs/straypaw-2/ACCEPTANCE.md.
   ════════════════════════════════════════════════════════════════════ */

function errorsOf(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
}
/* The live site asks for a human check before sending, which a test cannot pass; a build
   without a record store refuses to send at all. Both are correct behaviour, so the send
   journeys run only where a send is possible, and say why when they cannot. */
async function sendOrSkip(page: Page) {
  const send = page.getByRole("button", { name: "Send the report" });
  test.skip(await send.isDisabled(), "the live site's human check (Turnstile) cannot be passed by a test");
  await send.click();
  const unavailable = page.getByText(/Reporting is not available right now/);
  await expect(page.getByText(/Received|Not sent|Reporting is not available/).first()).toBeVisible();
  test.skip(await unavailable.isVisible(), "this build has no record store configured, so it rightly refuses to send");
}

test.describe("old addresses land on their 2.0 homes", () => {
  const cases: [string, RegExp][] = [
    ["/map?city=Coimbatore", /\/community\?city=Coimbatore$/], ["/report", /\/community\/report$/],
    ["/following", /\/community\/activity$/], ["/dog/00000000-0000-4000-8000-000000000000", /\/animal\/00000000-0000-4000-8000-000000000000$/],
    ["/insights?city=Coimbatore", /\/city\/insights\?city=Coimbatore$/], ["/municipality", /\/city$/], ["/programmes", /\/city\/programmes$/],
    ["/resources", /\/learn\/resources$/], ["/moderate", /\/trust$/], ["/orgs", /\/community\/organisations$/], ["/admin", /\/trust\/console$/],
  ];
  for (const [from, to] of cases) test(from, async ({ request }) => {
    const r = await request.get(from, { maxRedirects: 0 });
    expect(r.status()).toBe(307);
    expect(r.headers().location).toMatch(to);
  });
});

/* The classic application is gone: its addresses are not redirected anywhere, they simply do not exist. */
test("retired application addresses are not pages and do not redirect", async ({ request }) => {
  for (const from of ["/partner", "/partner/cases/new?dogId=abc", "/dashboard", "/cases", "/ngo/work", "/ngo/verification", "/city/review", "/assistant", "/today", "/workspace/x", "/programme/x", "/next/ngo/today"]) {
    const r = await request.get(from, { maxRedirects: 0 });
    expect(r.status(), from).toBe(404);
  }
});

test("the landing page still renders its hero", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto("/");
  await expect(page.locator("h1").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("Open App is a gateway, not a redirect, and reporting stays one tap away", async ({ page, request }) => {
  expect((await request.get("/app", { maxRedirects: 0 })).status()).toBe(200);
  await page.goto("/app");
  await expect(page.getByRole("link", { name: /Report an animal/ })).toHaveAttribute("href", "/community/report");
});

test("the field-intake story is labelled and points to working web reporting", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });await page.goto("/whatsapp");
  const main = page.locator("main");
  await expect(main.getByText("Not connected", { exact: true }).first()).toBeVisible();
  await expect(main.getByRole("link", { name: "web report form" })).toHaveAttribute("href", "/community/report");
  await page.goto("/");
  const workflow=page.getByRole("link", { name: /Watch Kaju build a claim/ }).first();
  await expect(workflow).toHaveAttribute("href", "#workflow");
  await workflow.click();await expect(page.locator("#workflow")).toBeInViewport();
});

test("solutions: every solution has its own page", async ({ page }) => {
  await page.goto("/solutions");
  for (const href of ["/for-ngos", "/solutions/abc-arv", "/solutions/rescue-care", "/for-governments", "/for-community"]) {
    await expect(page.locator(`main a[href="${href}"]`).first()).toBeVisible();
  }
});

/* On a phone the layers sit behind one "Map layer" button. */
async function openLayers(page: Page) {
  const fold = page.locator(".fm-layer-fold > .mobile-details-toggle");
  if (await fold.isVisible()) await fold.click();
}

test("the Map opens on India with its lenses and search", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto("/community");
  await expect(page.locator(".fm-map canvas").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("India");
  await openLayers(page);
  for (const name of ["Animals", "Needs help", "Open requests", "Sterilisation records"]) await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Needs help", exact: true }).click();
  await expect(page).toHaveURL(/lens=help/);
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("the Municipality map opens on its evidence layers", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto("/city");
  await expect(page.locator(".fm-map canvas").first()).toBeVisible({ timeout: 20_000 });
  await openLayers(page);
  await expect(page.getByRole("button", { name: "ABC · sterilisation", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Report here|Open a case here/ })).toHaveCount(0);
  await noOverflow(page);
  expect(errors).toEqual([]);
});

/* The organisation's map is a view of its animal register now (Animals, List | Map); the old Operations map link opens it. */
test("the organisation map asks a visitor to sign in and draws nothing", async ({ page }) => {
  await page.goto("/ngo/operations?view=map");
  await expect(page).toHaveURL(/\/ngo\/animals\?view=map/);
  await expect(page.getByText(/Sign in as a member of an NGO to see your organisation/)).toBeVisible();
  await expect(page.locator(".am-map canvas, .fm-map canvas")).toHaveCount(0);
});

test.describe("reporting", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/nominatim.openstreetmap.org/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ address: { suburb: "Gandhipuram", city: "Coimbatore" }, display_name: "Gandhipuram, Coimbatore" }) }));
  });

  test("a sighting is sent and the receipt says received, not accepted", async ({ page }) => {
    const sent: string[] = [];
    await page.route("**/api/report", async (r) => { sent.push(r.request().method()); await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, id: "11111111-1111-4111-8111-111111111111", status: "pending" }) }); });
    // From the map's "Report here" the place is already pinned: what was seen, its ears, Send.
    await page.goto("/community/report?lat=11.0168&lng=76.9558");
    await page.getByRole("radio", { name: /Just seen/ }).click();
    await page.getByRole("radio", { name: "An ear is notched" }).click();
    await sendOrSkip(page);
    await expect(page.getByText(/Received/).first()).toBeVisible();
    expect(sent).toEqual(["POST"]);
    await noOverflow(page);
  });

  test("a failed send keeps the answers and says not sent", async ({ page }) => {
    await page.route("**/api/report", (r) => r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Service unavailable." }) }));
    await page.goto("/community/report?lat=11.0168&lng=76.9558");
    await page.getByRole("radio", { name: /Just seen/ }).click();
    await page.getByRole("radio", { name: "An ear is notched" }).click();
    await sendOrSkip(page);
    await expect(page.getByText(/Not sent/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Send the report" })).toBeEnabled();
  });

  test("?help=1 opens the needs-help questions", async ({ page }) => {
    await page.goto("/community/report?help=1");
    await expect(page.getByRole("heading", { name: "What is happening?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send the report" })).toHaveClass(/is-flame/);
  });
});

test("signed out, the NGO workspace shows labelled sample records and reads nothing private", async ({ page }) => {
  const reads: string[] = [];
  page.on("request", (r) => { if (/\/rest\/v1\/(rpc\/)?(org_animals|dogs|cases)/.test(r.url())) reads.push(r.url()); });
  await page.goto("/ngo/animals");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Sample data", { exact: true }).first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(reads).toEqual([]);
});

test("an Academy lesson is completed on the device", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto("/learn/courses/reading-the-record/unknown-is-not-zero");
  for (const b of await page.locator(".ex-dog").all()) await b.click();
  await expect(page.locator(".k-tag", { hasText: "Done" }).first()).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("sp2.learn.done"))).toContain("reading-the-record/unknown-is-not-zero");
  await noOverflow(page);
  expect(errors).toEqual([]);
});

for (const route of ["/city/insights?city=Coimbatore", "/city/programmes", "/community/stories", "/community/organisations", "/community/help", "/learn/workshops", "/search?q=coim"]) {
  test(`${route} renders without errors or overflow`, async ({ page }) => {
    const errors = errorsOf(page);
    const r = await page.goto(route);
    expect(r?.status()).toBeLessThan(400);
    await expect(page.locator("h1").first()).toBeVisible();
    await noOverflow(page);
    expect(errors).toEqual([]);
  });
}
