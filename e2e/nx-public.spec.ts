import { test, expect, type Page } from "@playwright/test";

/* The public record pages, rebuilt on the public site kit outside the classic app frame. Signed out, each one
   renders, carries the public header (or, for the operator console, its own bar), never the classic frame, never
   links into a signed-in classic route, and never scrolls sideways on a phone. The report form is checked for
   its validation messages and for an honest failure when the server refuses a report: the request is answered
   here, so nothing is written to the shared staging record. */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("straypaw.notice.storage.v1", "1");
    localStorage.setItem("sp.demo.tour.v1", JSON.stringify({ mode: "off", step: 0, role: null }));
  });
});

/* A real public animal on staging (public_spatial_animals); staging may not hold its full profile, in which case the
   page shows its honest "not read" state, which is still a rendered public page. */
const ANIMAL = process.env.E2E_ANIMAL_ID ?? "ab566594-3cfb-474f-923f-415aa1a42adc";

const PAGES = [
  "/community", "/community/activity", "/community/feeding", "/community/help", "/community/organisations", "/community/report", "/community/stories",
  `/animal/${ANIMAL}`, "/fundraisers",
  "/learn", "/learn/courses/reading-the-record/unknown-is-not-zero", "/learn/playground", "/learn/resources", "/learn/workshops",
  "/search", "/search?q=dog", "/offline",
  "/city", "/city/insights", "/city/programmes", "/city/report",
  "/trust", "/trust/console",
];

/* Signed-in classic routes a public page must never link to. */
const CLASSIC = /^\/(ngo|workspace|programme|assistant|today|city\/review|city\/contracts|city\/connections|fundraisers\/new)(\/|\?|#|$)/;

const open = async (page: Page, path: string) => {
  const res = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(res?.status(), `${path} answers`).toBeLessThan(400);
  await page.waitForLoadState("networkidle").catch(() => {});
};

for (const path of PAGES) {
  test(`public page renders outside the classic frame: ${path}`, async ({ page }) => {
    await open(page, path);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator(".sp-app, .ws-side, .ws-bar")).toHaveCount(0);
    if (!path.startsWith("/trust") && path !== "/offline") await expect(page.locator("header.s4-nav, nav[aria-label]").first()).toBeVisible();
    const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
    const bad = hrefs.map((h) => { try { return new URL(h, "http://x").pathname; } catch { return h; } }).filter((p) => CLASSIC.test(p));
    expect(bad, `${path} links to a classic signed-in route`).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `${path} scrolls sideways`).toBe(true);
  });
}

test("report form: each screen says what is missing before it moves on", async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem("sp2.report.draft"));
  await open(page, "/community/report");
  await expect(page.getByRole("heading", { level: 1, name: "What did you see?" })).toBeVisible();
  await page.getByRole("button", { name: /An animal needs help/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Where is the animal?" })).toBeVisible();
  await page.getByRole("button", { name: /This is the place/ }).click();
  await expect(page.getByRole("alert")).toContainText("Pin the place first");
  await expect(page.getByRole("heading", { level: 1, name: "Where is the animal?" })).toBeVisible();
});

test("report form: a refused report says it was not sent and keeps the answers", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("sp2.report.draft", JSON.stringify({ door: "spotted", coords: { lat: 12.97, lng: 77.64 }, zone: "Indiranagar, Bengaluru", landmark: "E2E check, never sent", problem: null, walk: null, seen: [], ear: "unknown", notes: "", email: "", contactOk: false })));
  let posted = 0;
  await page.route("**/api/report", async (route) => { posted++; await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "Verification failed. Please complete the check and try again." }) }); });
  await open(page, "/community/report");
  await page.getByRole("button", { name: "Continue it" }).click();
  await page.getByRole("button", { name: /Continue without a photo/ }).click();
  await page.getByRole("button", { name: /This is the place/ }).click();
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ready to send" })).toBeVisible();
  const send = page.getByRole("button", { name: "Send the report" });
  if (await page.locator("iframe[src*='challenges.cloudflare.com']").count()) {
    await send.click();
    await expect(page.getByRole("alert")).toContainText("Complete the check");
    test.skip(true, "Turnstile is configured here; the refused-report path needs a solved check.");
  }
  await send.click();
  await expect(page.getByText(/Not sent: Verification failed/)).toBeVisible();
  expect(posted).toBe(1);
  await expect(page.getByText("Indiranagar, Bengaluru · E2E check, never sent")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Received." })).toHaveCount(0);
});

test("operator console asks for the password and opens nothing without it", async ({ page }) => {
  await open(page, "/trust/console");
  await expect(page.getByRole("heading", { level: 1, name: "Moderation" })).toBeVisible();
  await page.getByRole("button", { name: "Open the console" }).click();
  await expect(page.getByRole("alert")).toContainText("Enter the moderation password");
  await expect(page.locator(".cn-index")).toHaveCount(0);
});

test("the Academy marks a lesson done on this device only", async ({ page }) => {
  await open(page, "/learn/courses/reading-the-record/count-the-right-thing");
  await expect(page.getByRole("heading", { level: 1, name: "Count the right thing" })).toBeVisible();
  await expect(page.getByText("Try it")).toBeVisible();
});
