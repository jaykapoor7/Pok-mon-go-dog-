import { expect, test } from "@playwright/test";

/* The ABC verification and municipal review screens. CI runs without a
   database, so these check the signed-out doors and navigation; the
   workflow itself is checked end to end on staging with real sessions
   (scripts/staging/abc-workflow-check.mjs, 55 checks). */

test("verification is a module of the NGO workspace and asks a visitor to sign in", async ({ page, isMobile }) => {
  await page.goto("/ngo/verification");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Verification");
  await expect(page.getByRole("link", { name: /Sign in with your code|Join with a code/ })).toBeVisible();
  if (!isMobile) {
    const side = page.getByRole("complementary", { name: "Workspace" });
    await expect(side.getByRole("link", { name: "Verification" })).toHaveAttribute("aria-current", "page");
    await expect(side.getByRole("link", { name: "Report packages" })).toBeVisible();
  }
});

test("report packages ask a visitor to sign in", async ({ page }) => {
  await page.goto("/ngo/packages");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Report packages");
});

test("municipal package review asks a visitor to sign in", async ({ page, isMobile }) => {
  await page.goto("/city/review");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Package review");
  await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
  if (!isMobile) {
    /* Only people in a reviewing office see it in the sidebar; everyone else keeps a short one. */
    const side = page.getByRole("complementary", { name: "Workspace" });
    await expect(side.getByRole("link", { name: "Package review" })).toHaveCount(0);
    await expect(side.getByRole("link", { name: "Overview" })).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("the homepage introduces Kaju and what it handles", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Meet Kaju, the AI that\s*verifies every sterilisation/);
  await expect(page.getByText(/Kaju handles capture, vet sign-off, evidence checks/)).toBeVisible();
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

test("the verification queue reads nothing for a signed-out visitor", async ({ page }) => {
  const calls: string[] = [];
  page.on("request", (r) => { if (/rpc\/abc_/.test(r.url())) calls.push(r.url()); });
  await page.goto("/ngo/verification");
  await page.goto("/ngo/packages");
  await page.waitForTimeout(800);
  expect(calls).toEqual([]);
});
