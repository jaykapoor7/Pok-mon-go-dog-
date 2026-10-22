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

test("landing closes in one night section that carries the footer", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".ld-levels,.restored-partners,.ld-audience")).toHaveCount(0);
  const end = page.getByRole("contentinfo");
  await expect(end.locator(".lx-end-cta")).toHaveCount(1);
  await expect(end.locator(".lx-end-foot")).toHaveCount(1);
  await expect(end.locator("details")).toHaveCount(0);
  for (const gone of ["Art credits", "Data and resources", "Who it’s for"]) await expect(end).not.toContainText(gone);
  await expect(end.getByRole("link", { name: "Report a sighting" })).toHaveCount(1);
  expect(await page.locator(".sp-header").evaluate(el => getComputedStyle(el, "::before").backgroundImage)).toBe("none");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("the WhatsApp thread is driven by scrolling, forwards and back, and stays a labelled pilot", async ({ page }) => {
  await page.goto("/");
  const thread = page.locator("#one-request");
  await expect(thread).toContainText("WhatsApp intake is a pilot and is not open to the public yet");
  await expect(thread.getByRole("button")).toHaveCount(0);
  await scrollThrough(page, ".rt-track", 0);
  await expect(thread.locator(".rt-msg")).toHaveCount(0);
  await scrollThrough(page, ".rt-track", 0.35);
  expect(await thread.locator(".rt-msg").count()).toBeGreaterThan(2);
  await scrollThrough(page, ".rt-track", 1);
  await expect(thread.locator(".rt-city")).toBeVisible();
  await expect(thread.locator(".rt-city-cap")).toContainText("recorded areas");
  await scrollThrough(page, ".rt-track", 0.1);
  expect(await thread.locator(".rt-msg").count()).toBeLessThan(3);
});

test("NGO remains a workspace on both Community and NGO pages", async ({ page }) => {
  for (const path of ["/community", "/ngo"]) {
    await page.goto(path);
    await page.locator(".sp-ws-btn").click();
    await expect(page.getByRole("menuitemradio", { name: /NGO/ })).toHaveCount(1);
    await page.keyboard.press("Escape");
  }
});

test("phone menu: two places, five audiences, one Open App", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await expect(page.getByRole("link", { name: /Open App/ })).toHaveCount(1);
  await expect(page.locator(".sp-sheet-main > li")).toHaveCount(2);
  await expect(page.locator(".sp-sheet-group a")).toHaveCount(5);
  await expect(page.locator("#sp-sheet")).not.toContainText("Report an animal");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open menu", exact: true })).toBeFocused();
});

test("the seven-day request follows the scroll on a phone, without WebGL", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type.includes("webgl")) return null;
      return original.apply(this, [type, ...args] as Parameters<typeof original>);
    } as typeof original;
  });
  await page.goto("/");
  const dive = page.locator("#request-journey");
  await expect(dive.getByRole("button")).toHaveCount(0);
  await scrollThrough(page, "#request-journey", 0);
  await expect(dive.locator(".ld-dive-day b")).toHaveText("0");
  await scrollThrough(page, "#request-journey", 1);
  await expect(dive.locator(".is-now .ld-dive-what b")).toHaveText(/Case closed|Recovered/);
  await expect(dive.locator(".ld-dive-day b")).not.toHaveText("0");
  await scrollThrough(page, "#request-journey", 0);
  await expect(dive.locator(".ld-dive-day b")).toHaveText("0");
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

test("More is grouped and closes without losing the workspace", async ({ page }) => {
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

test("workshops run one activity at a time and pair attributed originals", async ({ page }) => {
  await page.goto("/learn/workshops");
  await expect(page.locator(".wsx-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Next activity", exact: true }).click();
  await expect(page.locator(".wsx-card .ex")).toBeVisible();
  await expect(page.locator(".wsx-card")).toContainText("A calm encounter");
  await page.getByRole("radio", { name: /Reading a map/ }).click();
  await expect(page.locator(".wsx-card")).toContainText("Activity 1 of 6");
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
