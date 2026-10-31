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

test("landing closes with one demo call to action and the site index", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main .s4-close")).toHaveCount(1);
  await expect(page.locator("main .s4-close .is-primary")).toHaveCount(1);
  await expect(page.locator("main .s4-close .is-primary")).toHaveText("Book a demo");
  const end = page.getByRole("contentinfo");
  for (const col of ["Product", "Solutions", "Resources", "Company"]) await expect(end.getByRole("heading", { name: col, exact: true })).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("the hero demo shows the phone as a labelled, unconnected preview", async ({ page }) => {
  await page.goto("/");
  const phone = page.getByRole("group", { name: /field message becoming a draft record \(WhatsApp not connected in production\)/ }).first();
  await expect(phone).toBeVisible();
  await expect(phone).toContainText("WhatsApp · demo");
  await expect(phone).toContainText("Waiting for operator review");
});

test("the AI jobs advance by themselves and stop when one is chosen", async ({ page }) => {
  await page.goto("/");
  const band = page.locator(".s4-band");
  await band.scrollIntoViewIfNeeded();
  const jobs = band.locator(".s4-jobs button");
  await expect(jobs.first()).toHaveAttribute("aria-pressed", "true");
  await expect(jobs.nth(1)).toHaveAttribute("aria-pressed", "true", { timeout: 12_000 });
  await jobs.nth(3).click();
  await expect(jobs.nth(3)).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(7000);
  await expect(jobs.nth(3)).toHaveAttribute("aria-pressed", "true");
});

test("NGO remains a workspace on both Community and NGO pages", async ({ page }) => {
  for (const path of ["/community", "/ngo"]) {
    await page.goto(path);
    await page.locator(".sx3-ws-btn:visible, .sp-ws-btn:visible").first().click();
    await expect(page.getByRole("menuitemradio", { name: /NGO/ })).toHaveCount(1);
    await page.keyboard.press("Escape");
  }
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

test("signed-out NGO page shows what the workspace includes at every width", async ({ page }) => {
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/ngo");
    const items = page.locator(".ngo-door-inc li");
    await expect(items).toHaveCount(3);
    for (const p of await page.locator(".ngo-door-inc p").all()) {
      await expect(p).toBeVisible();
      expect(await p.evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(150);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});

test("desktop sidebar groups the workspace's other pages", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "phones use the More sheet");
  await page.goto("/ngo");
  const side = page.getByRole("complementary", { name: "Workspace" });
  const groups = side.locator(".sx3-group");
  expect(await groups.count()).toBeGreaterThan(1);
  await groups.first().locator("summary").click();
  await expect(groups.first().locator("ul")).toBeVisible();
  await expect(page).toHaveURL(/\/ngo$/);
});

test("More is grouped and closes without losing the workspace", async ({ page, isMobile }) => {
  test.skip(!isMobile, "desktop uses the sidebar groups");
  await page.goto("/ngo");
  await page.getByRole("button", { name: "More", exact: true }).first().click();
  const more = page.getByRole("dialog", { name: "More in NGO" });
  await expect(more).toBeVisible();
  const groups = more.locator(".sp-more-group");
  expect(await groups.count()).toBeGreaterThan(1);
  await expect(groups.first().locator("ul")).toBeVisible();
  await groups.nth(1).locator("summary").click();
  await expect(groups.nth(1).locator("ul")).toBeVisible();
  await more.getByRole("button", { name: "Close" }).click();
  await expect(more).not.toBeVisible();
  await expect(page).toHaveURL(/\/ngo$/);
});

test("workshops scroll through every activity and pair attributed originals", async ({ page }) => {
  await page.goto("/learn/workshops");
  await expect(page.getByRole("button", { name: /^(Next activity|Back|Finish the session)$/ })).toHaveCount(0);
  await expect(page.locator(".wsx-card")).toHaveCount(6);
  const second = page.locator(".wsx-card").nth(1);
  await expect(second).toContainText("A calm encounter");
  await second.scrollIntoViewIfNeeded();
  await expect(second.locator(".ex")).toBeVisible();
  await expect(page.locator(".wsx-track li.is-now")).toHaveCount(1);
  await page.getByRole("radio", { name: /Reading a map/ }).click();
  await expect(page.locator(".wsx-card")).toHaveCount(7);
  await expect(page.locator(".wsx-card").first()).toContainText("Activity 1 of 6");
  await expect(page.locator(".kh.is-pair .kh-doc")).toHaveCount(1);
  await expect(page.locator(".kh.is-pair a.btn")).toHaveAttribute("href", /drive.google.com\/file\/d\//);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("the Academy features every Kind Hour original with a preview", async ({ page }) => {
  await page.goto("/learn");
  const docs = page.locator("#kind-hour .kh-doc");
  await expect(docs).toHaveCount(5);
  await expect(page.locator("#kind-hour .kh-credit")).toContainText("created by and belong to The Kind Hour Foundation");
  await expect(page.locator("#kind-hour .kh-note.is-warn")).toHaveCount(1);
  await docs.first().getByRole("button", { name: "Preview" }).click();
  const dialog = page.locator("dialog.kh-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("iframe")).toHaveAttribute("src", /drive.google.com\/file\/d\/.+\/preview/);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.getByRole("tab", { name: /On the street/ }).click();
  await expect(page.locator("#acx-panel h3")).toHaveText("On the street");
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
