import { expect, test, type Page } from "@playwright/test";

/* ════════════════════════════════════════════════════════════════════
   The public site comes in two experiences, chosen by one value,
   MARKETING_EXPERIENCE (next.config.mjs):

     legacy     the site as it was (the default)
     cinematic  "The whole world, connected" (src/cine)

   This file reads which one the server is running from the homepage and
   checks that one, so the same suite runs against either build:

     npm run build && npx next start             → legacy checks
     MARKETING_EXPERIENCE=cinematic npm run build && npx next start
                                                 → cinematic checks
   ════════════════════════════════════════════════════════════════════ */

let mode: "cinematic" | "legacy" = "legacy";
test.beforeAll(async ({ request }) => {
  const html = await (await request.get("/")).text();
  mode = html.includes("cn8-story") ? "cinematic" : "legacy";
});

const noSideScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

test.describe("legacy experience", () => {
  test.beforeEach(() => { test.skip(mode !== "legacy", "the server is running the cinematic experience"); });

  test("the homepage is the earlier one and Meet Kaju sends people to the Kaju page they know", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".cn8")).toHaveCount(0);
    await expect(page.locator("h1").first()).toBeVisible();
    await page.goto("/kaju");
    await expect(page).toHaveURL(/\/ai$/);
  });
});

test.describe("cinematic experience", () => {
  test.beforeEach(() => { test.skip(mode !== "cinematic", "the server is running the legacy experience"); });

  test("the world opens with the headline, five words of navigation and two ways in", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/The whole world,\s*connected\./);
    const wide = (page.viewportSize()?.width ?? 0) > 900;
    if (wide) {
      const site = page.getByRole("navigation", { name: "Site", exact: true });
      for (const [label, href] of [["Platform", "/platform"], ["Kaju", "/kaju"], ["Solutions", "/solutions"], ["Proof", "/customers"], ["Pricing", "/pricing"]]) {
        await expect(site.getByRole("link", { name: label, exact: true })).toHaveAttribute("href", href);
      }
    } else {
      await page.getByRole("button", { name: "Open menu" }).click();
      const sheet = page.getByRole("navigation", { name: "Site, on a phone" });
      await expect(sheet.getByRole("link", { name: "Kaju" })).toBeVisible();
      await expect(sheet.getByRole("link", { name: "Platform" })).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(page.getByRole("button", { name: "Close menu" })).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(page.getByRole("link", { name: "StrayPaw home" })).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(page.locator("#cn8-sheet").getByRole("link", { name: /Sign in|Open app/ })).toBeFocused();
      await page.keyboard.press("Escape");
      const menu = page.getByRole("button", { name: "Open menu" });
      await expect(menu).toBeFocused();
      await expect(menu).toHaveAttribute("aria-expanded", "false");
    }
    const demo = page.locator("main").getByRole("link", { name: "Explore live demo" }).first();
    await expect(demo).toHaveAttribute("href", /demo\.straypaw\.org/);
    await noSideScroll(page);
  });

  test("every stage of the chain opens its record, and the record says it is illustrative", async ({ page }) => {
    await page.goto("/");
    const story = page.locator(".cn8-story");
    const box = await story.boundingBox();
    await page.evaluate((y) => window.scrollTo(0, y), (box?.y ?? 0) + (box?.height ?? 0) * 0.62);
    const steps = page.locator(".cn8-steps button");
    await expect(steps).toHaveCount(6);
    await steps.nth(4).click();
    const card = page.locator(".cn8-card");
    await expect(card).toContainText("Illustrative record");
    await expect(card.getByRole("link")).toHaveAttribute("href", "/platform");
  });

  test("Kaju answers with its steps, its evidence and what it prepared, all labelled illustrative", async ({ page }) => {
    await page.goto("/");
    const demo = page.locator(".cn8-kaju .cn8-kd");
    await demo.scrollIntoViewIfNeeded();
    await expect(demo).toContainText("Illustrative records");
    await demo.getByRole("button", { name: /Draft October/ }).click();
    await expect(demo.locator(".cn8-kd-ans")).toContainText("131 of 133 records", { timeout: 6000 });
    await expect(demo.getByRole("list", { name: "Evidence" }).getByRole("listitem")).toHaveCount(2);
    await expect(demo).toContainText("Prepared, not sent.");
  });

  test("the platform window changes with the role, and accepting a package is not a payment", async ({ page }) => {
    await page.goto("/");
    const tabs = page.getByRole("tablist", { name: "Who it is for" });
    await tabs.scrollIntoViewIfNeeded();
    await tabs.getByRole("tab", { name: "Municipal government" }).click();
    const panel = page.locator("#cn8-plat-panel");
    await expect(panel).toContainText("it is not a payment");
    await tabs.getByRole("tab", { name: "Hospitals and public health" }).click();
    await expect(panel).toContainText("Record dose");
  });

  test("proof keeps live, illustrative and planned apart", async ({ page }) => {
    await page.goto("/");
    const proof = page.locator(".cn8-proof");
    await expect(proof.locator(".cn8-status")).toHaveCount(3);
    await expect(proof).toContainText("Not connected yet");
    await expect(proof).toContainText("waiting for Meta approval");
  });

  test("Meet Kaju: four capabilities, each with its own demonstration", async ({ page }) => {
    await page.goto("/kaju");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Meet\s+Kaju\./);
    const list = page.getByRole("tablist", { name: "What Kaju does" });
    await expect(list.getByRole("tab")).toHaveCount(4);
    await list.getByRole("tab", { name: /Coordinate/ }).click();
    const demo = page.locator("#cn8-kp-demo");
    await demo.getByRole("button", { name: /bite reports/ }).click();
    await expect(demo).toContainText("Patient details stay with the hospital", { timeout: 6000 });
    await noSideScroll(page);
  });

  test("other pages keep their layout under the new bar, and the footer's links all resolve", async ({ page, request }) => {
    await page.goto("/platform");
    const nav = page.locator(".cn8-nav");
    await expect(nav).toHaveClass(/is-page/);
    const navBottom = (await nav.boundingBox())?.height ?? 0;
    const h1 = (await page.locator("h1").first().boundingBox())?.y ?? 0;
    expect(h1).toBeGreaterThanOrEqual(navBottom);
    const hrefs = await page.locator(".cn8-foot a[href^='/'], .cn8-nav a[href^='/']").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!))]);
    expect(hrefs.length).toBeGreaterThan(15);
    for (const href of hrefs) {
      const r = await request.get(href, { maxRedirects: 5 });
      expect(r.status(), href).toBeLessThan(400);
    }
  });
});

test.describe("cinematic experience, with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test.beforeEach(() => { test.skip(mode !== "cinematic", "the server is running the legacy experience"); });

  test("the story holds still and Kaju answers at once", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const demo = page.locator(".cn8-kaju .cn8-kd");
    await demo.scrollIntoViewIfNeeded();
    await demo.getByRole("button", { name: /missing a photo/ }).click();
    await expect(demo.locator(".cn8-kd-ans")).toBeVisible({ timeout: 1500 });
  });
});
