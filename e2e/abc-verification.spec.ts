import { expect, test } from "@playwright/test";

/* The ABC verification and municipal review screens. CI runs without a
   database, so these check the signed-out doors and navigation; the
   workflow itself is checked end to end on staging with real sessions
   (scripts/staging/abc-workflow-check.mjs, 55 checks). */

test("the homepage introduces Kaju and what it handles", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Meet Kaju, the AI agent for\s*animal welfare programmes/);
  await expect(page.locator(".s4-announce").getByRole("link", { name: /See how it connects/ })).toHaveAttribute("href", "/platform#one-health");
  await expect(page.locator(".s4-hero .s4-hero-eyebrow")).toHaveCount(0);
  await expect(page.locator(".s4-hero .s6-rot")).toBeVisible();
});

test("product fragments stay inside a phone screen (no text cut off at the edges)", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone layout");
  for (const path of ["/", "/ai", "/abc-operations", "/for-governments"]) {
    await page.goto(path);
    const cut = await page.evaluate(() => [...document.querySelectorAll(".s4u-frag p, .s4u-frag li, .s4u-frag span")]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.left < -2 || r.right > innerWidth + 2); }).length);
    expect(cut, path).toBe(0);
  }
});

test("every public page has exactly one main heading (mission included)", async ({ page }) => {
  await page.goto("/mission");
  await expect(page.locator("h1")).toHaveCount(1);
});

test("evidence, packages and the review queue read nothing for a signed-out visitor", async ({ page }) => {
  const calls: string[] = [];
  page.on("request", (r) => { if (/rpc\/(abc_|operations_)/.test(r.url())) calls.push(r.url()); });
  for (const path of ["/ngo/submissions?tab=evidence", "/ngo/submissions", "/gov/verification", "/health/procedures"]) { await page.goto(path); await page.waitForLoadState("networkidle"); }
  await page.waitForTimeout(800);
  expect(calls).toEqual([]);
});
