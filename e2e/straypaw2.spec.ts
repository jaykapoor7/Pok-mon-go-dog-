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
    ["/app", /\/community$/], ["/map?city=Coimbatore", /\/community\?city=Coimbatore$/], ["/report", /\/community\/report$/],
    ["/following", /\/community\/activity$/], ["/dog/00000000-0000-4000-8000-000000000000", /\/animal\/00000000-0000-4000-8000-000000000000$/],
    ["/insights?city=Coimbatore", /\/city\/insights\?city=Coimbatore$/], ["/municipality", /\/city$/], ["/programmes", /\/city\/programmes$/],
    ["/partner", /\/ngo$/], ["/partner/cases/new?dogId=abc", /\/ngo\/cases\/new\?(.*&)?dog=abc(&|$)/], ["/partner/review", /\/ngo\/review$/],
    ["/resources", /\/learn\/resources$/], ["/moderate", /\/trust$/], ["/orgs", /\/community\/organisations$/],
    ["/partner/medical", /\/ngo\/care$/], ["/partner/quality", /\/ngo\/quality$/], ["/partner/volunteers", /\/ngo\/volunteers$/],
    ["/partner/stories", /\/ngo\/stories$/], ["/partner/resources", /\/ngo\/evidence$/], ["/partner/fundraising", /\/ngo\/fundraising$/],
    ["/partner/fundraisers/new", /\/ngo\/fundraising\/new$/], ["/partner/surveys", /\/ngo\/surveys$/], ["/partner/projects", /\/ngo\/projects$/],
    ["/partner/feeding", /\/ngo\/feeding$/], ["/admin", /\/trust\/console$/],
  ];
  for (const [from, to] of cases) test(from, async ({ request }) => {
    const r = await request.get(from, { maxRedirects: 0 });
    expect(r.status()).toBe(307);
    expect(r.headers().location).toMatch(to);
  });
});

test("the landing page still renders its hero", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto("/");
  await expect(page.locator("h1").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("the guided request has readable disclosure and a web reporting destination", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });await page.goto("/");
  await expect(page.locator("#one-request")).toContainText("Reporting on WhatsApp");
  await expect(page.locator("#one-request")).not.toContainText(/pilot/i);
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Report a sighting" })).toHaveAttribute("href","/community/report");
});

test("solutions: the URL chooses the audience", async ({ page }) => {
  await page.goto("/solutions#ngos");
  await expect(page.getByRole("tab", { name: /Animal welfare organisations/ })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: /Municipal teams/ }).click();
  await expect(page).toHaveURL(/#municipal$/);
  await expect(page.getByRole("tabpanel")).toContainText("area by area");
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

test("the NGO map explains itself when signed out", async ({ page }) => {
  await page.goto("/ngo/map");
  await expect(page.getByText(/only for members of an organisation/)).toBeVisible();
});

test.describe("reporting", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/nominatim.openstreetmap.org/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ address: { suburb: "Gandhipuram", city: "Coimbatore" }, display_name: "Gandhipuram, Coimbatore" }) }));
  });

  test("a sighting is sent and the receipt says received, not accepted", async ({ page }) => {
    const sent: string[] = [];
    await page.route("**/api/report", async (r) => { sent.push(r.request().method()); await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, id: "11111111-1111-4111-8111-111111111111", status: "pending" }) }); });
    await page.goto("/community/report?lat=11.0168&lng=76.9558");
    await page.getByRole("button", { name: /I spotted an animal/ }).click();
    await page.getByRole("button", { name: /Continue without a photo/ }).click();
    await page.getByRole("button", { name: /This is the place/ }).click();
    await page.locator("fieldset.choice label").first().click();
    await page.getByRole("button", { name: "Continue" }).click();
    await sendOrSkip(page);
    await expect(page.getByText(/Received/).first()).toBeVisible();
    expect(sent).toEqual(["POST"]);
    await noOverflow(page);
  });

  test("a failed send keeps the answers and says not sent", async ({ page }) => {
    await page.route("**/api/report", (r) => r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Service unavailable." }) }));
    await page.goto("/community/report?lat=11.0168&lng=76.9558");
    await page.getByRole("button", { name: /I spotted an animal/ }).click();
    await page.getByRole("button", { name: /Continue without a photo/ }).click();
    await page.getByRole("button", { name: /This is the place/ }).click();
    await page.locator("fieldset.choice label").first().click();
    await page.getByRole("button", { name: "Continue" }).click();
    await sendOrSkip(page);
    await expect(page.getByText(/Not sent/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Send the report" })).toBeEnabled();
  });

  test("?help=1 opens the needs-help questions", async ({ page }) => {
    await page.goto("/community/report?help=1");
    await expect(page.getByRole("heading", { name: "Where is the animal?" })).toBeVisible();
  });
});

test("the NGO workspace explains itself when signed out", async ({ page }) => {
  await page.goto("/ngo/animals");
  await expect(page.getByText(/only for members of an organisation/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Sign in with your code/ })).toBeVisible();
});

test("an Academy lesson is completed on the device", async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto("/learn/courses/reading-the-record/unknown-is-not-zero");
  for (const b of await page.locator(".ex-dog").all()) await b.click();
  await expect(page.locator(".ls-do .pill", { hasText: "Done" })).toBeVisible();
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
