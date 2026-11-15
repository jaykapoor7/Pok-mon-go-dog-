import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("straypaw.notice.storage.v1", "1"));
});

/** Scroll a pinned section to a fraction of its scroll track, the way a reader would. */
async function scrollThrough(page: Page, selector: string, f: number) {
  await page.evaluate(([sel, frac]) => {
    const el = document.querySelector(sel as string)!;
    const r = el.getBoundingClientRect();
    window.scrollTo({ top: r.top + scrollY + (r.height - innerHeight) * (frac as number), behavior: "instant" });
  }, [selector, f] as const);
  await page.waitForTimeout(250);
}

test("landing closes with one primary action, one demo link in the page, and the site index", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main .s4-close")).toHaveCount(1);
  await expect(page.locator("main .s4-close .is-primary")).toHaveCount(1);
  await expect(page.locator("main .s4-close .is-primary")).toHaveText("Explore the platform");
  await expect(page.locator("main a").filter({ hasText: /^Book a demo$/ })).toHaveCount(1);
  const end = page.getByRole("contentinfo");
  for (const col of ["Product", "Solutions", "Resources", "Company"]) await expect(end.getByRole("heading", { name: col, exact: true })).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("the hero demo is labelled, plays its story with the phone, and can be paused", async ({ page }) => {
  await page.goto("/");
  const demo = page.getByRole("group", { name: /Product demo: a coordinator's day in StrayPaw/ });
  await expect(demo).toBeVisible();
  await expect(demo).toContainText("Product demo · illustrative records");
  await expect(demo).toContainText("WhatsApp not connected");
  await expect(demo).toContainText("Here is your daily brief.");
  /* the story moves on by itself, and the phone thread grows with it */
  await expect(demo).toContainText("Weekly evidence check", { timeout: 15_000 });
  await expect(demo).toContainText("Three of eighteen");
  /* Pause holds the scene; a step can be chosen directly */
  await demo.getByRole("button", { name: "Pause the demo" }).click();
  await demo.getByRole("button", { name: "Show: Report package" }).click();
  await expect(demo).toContainText("Ward 14 ABC drive · October 2026");
  await page.waitForTimeout(6000);
  await expect(demo).toContainText("Ward 14 ABC drive · October 2026");
});

test("the AI jobs advance by themselves and stop when one is chosen", async ({ page }) => {
  await page.goto("/");
  const band = page.locator(".s7-rec");
  await band.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const jobs = band.locator(".s7-rec-list button");
  await expect(jobs.first()).toHaveAttribute("aria-pressed", "true");
  await expect(jobs.nth(1)).toHaveAttribute("aria-pressed", "true", { timeout: 12_000 });
  await jobs.nth(3).click();
  await expect(jobs.nth(3)).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(7000);
  await expect(jobs.nth(3)).toHaveAttribute("aria-pressed", "true");
});

test("phone menu: grouped places, one demo action, one sign in", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  const sheet = page.locator("#s4-sheet");
  await expect(sheet.getByRole("link", { name: "Book a demo" })).toHaveCount(1);
  await expect(sheet.getByRole("link", { name: "Sign in" })).toHaveCount(1);
  await expect(sheet.locator("details > summary")).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open menu", exact: true })).toHaveAttribute("aria-expanded", "false");
});

test("workshops run one activity at a time and pair attributed originals", async ({ page }) => {
  await page.goto("/learn/workshops");
  const track = page.getByRole("list", { name: /where the group is/ });
  await expect(track.getByRole("button")).toHaveCount(6);
  await expect(page.locator(".lrn-act-k")).toContainText("Activity 1 of 5");
  await page.getByRole("button", { name: "Next activity", exact: true }).click();
  await expect(page.locator(".lrn-act-k")).toContainText("Activity 2 of 5");
  await expect(page.locator("#lrn-act-t")).toContainText("A calm encounter");
  await expect(track.locator('button[aria-current="step"]')).toHaveCount(1);
  await page.getByRole("group", { name: "Sessions" }).getByRole("button", { name: /Reading a map/ }).click();
  await expect(page.locator(".lrn-act-k")).toContainText("Activity 1 of 6");
  await expect(page.locator(".lrn-doc")).toHaveCount(1);
  await expect(page.locator(".lrn-doc a")).toHaveAttribute("href", /drive.google.com\/file\/d\//);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("the Academy features every Kind Hour original with a preview", async ({ page }) => {
  await page.goto("/learn");
  const docs = page.locator("#kind-hour .lrn-doc");
  await expect(docs).toHaveCount(5);
  await expect(page.locator("#kind-hour .lrn-fine")).toContainText("created by and belong to The Kind Hour Foundation");
  await expect(page.locator("#kind-hour .lrn-warn")).toHaveCount(1);
  await docs.first().getByRole("button", { name: /^Preview/ }).click();
  const dialog = page.locator("dialog[open]");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("iframe")).toHaveAttribute("src", /drive.google.com\/file\/d\/.+\/preview/);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("practice gives feedback; there are no printable cards", async ({ page }) => {
  await page.goto("/learn/resources");
  await expect(page.getByText("Cards to print", { exact: true })).toHaveCount(0);
  await page.getByLabel("Where", { exact: true }).fill("Bus stop opposite the market on MG Road");
  await page.getByLabel("What you saw", { exact: true }).fill("A brown dog limping on its left back leg at 6 pm");
  await page.getByRole("button", { name: "Not safely", exact: true }).click();
  await page.getByRole("button", { name: "Check my practice report", exact: true }).click();
  await expect(page.getByText(/Practice complete/)).toBeVisible();
});
