import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("straypaw.notice.storage.v1", "1"));
});

test("landing story is controlled by the reader and closes in one footer", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".ld-levels,.restored-partners")).toHaveCount(0);
  await expect(page.getByRole("contentinfo").locator(".ld-close")).toHaveCount(1);
  await expect(page.getByRole("contentinfo").locator(".ld-foot")).toHaveCount(1);
  await expect(page.locator(".ld-foot details")).toHaveCount(0);
  await expect(page.locator(".ld-foot")).not.toContainText("Art credits");
  const decoration = await page.locator(".sp-header").evaluate(el => getComputedStyle(el, "::before").display);
  expect(decoration).toBe("none");
  await page.locator(".rs-next").click();
  await expect(page.locator(".request-story-caption h3")).toHaveText("A team takes it forward.");
  await page.locator(".request-story-steps button").nth(3).click();
  await expect(page.locator(".rs-city")).toBeVisible();
  await page.locator(".request-story-controls").getByRole("button", { name: "Replay", exact: true }).click();
  await expect(page.locator(".rs-chat")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("NGO remains a workspace on both Community and NGO pages", async ({ page }) => {
  for (const path of ["/community", "/ngo"]) {
    await page.goto(path);
    await page.locator(".sp-ws-btn").click();
    await expect(page.getByRole("menuitemradio", { name: /NGO/ })).toHaveCount(1);
    await expect(page.locator(".sp-ws-foot")).toHaveCount(0);
    await page.keyboard.press("Escape");
  }
});

test("phone menu has one app action and optional audience links", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await expect(page.getByRole("link", { name: "Open App", exact: true })).toHaveCount(1);
  await expect(page.locator("#sp-sheet > nav > ul > li")).toHaveCount(3);
  await expect(page.locator("#sp-sheet")).not.toContainText("Report an animal");
  const audiences = page.locator(".sp-sheet-who");
  await expect(audiences).not.toHaveAttribute("open", "");
  await audiences.locator("summary").click();
  await expect(audiences.getByRole("link")).toHaveCount(5);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open menu", exact: true })).toBeFocused();
});

test("phone request timeline advances, pauses and replays without WebGL", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type.includes("webgl")) return null;
      return original.apply(this, [type, ...args] as Parameters<typeof original>);
    } as typeof original;
  });
  await page.goto("/");
  const timeline = page.locator("#request-journey");
  await expect(timeline.locator(".ld-dive-day b")).toHaveText("0");
  await timeline.getByRole("button", { name: "Next", exact: true }).click();
  await expect(timeline.locator(".is-now .ld-dive-what b")).toHaveText("Team arrived");
  await timeline.getByRole("button", { name: "Back", exact: true }).click();
  await timeline.getByRole("button", { name: /^Play / }).click();
  await expect(timeline.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await timeline.getByRole("button", { name: "Pause", exact: true }).click();
  for (let i = 0; i < 3; i++) await timeline.getByRole("button", { name: "Next", exact: true }).click();
  await timeline.getByRole("button", { name: "Replay", exact: true }).click();
  await expect(timeline.locator(".ld-dive-day b")).toHaveText("0");
});

test("signed-out NGO explanation stays readable when opened", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/ngo");
  await page.getByRole("button", { name: "What your workspace includes" }).click();
  const text = page.locator(".wk-explain p");
  await expect(text).toHaveCount(3);
  for (const paragraph of await text.all()) {
    await expect(paragraph).toBeVisible();
    expect(await paragraph.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("tools are grouped and can be opened without losing the workspace", async ({ page, isMobile }) => {
  await page.goto("/community");
  await page.getByRole("button", { name: isMobile ? "More" : "Tools", exact: true }).click();
  const tools = page.getByRole("dialog", { name: "Community tools" });
  await expect(tools).toBeVisible();
  await expect(tools.getByRole("heading", { name: "Tools & resources" })).toBeVisible();
  const groups = tools.locator(".sp-tool-group");
  expect(await groups.count()).toBeGreaterThan(0);
  await groups.first().locator("summary").click();
  await expect(groups.first().locator("ul")).toBeVisible();
  await tools.getByRole("button", { name: "Close tools" }).click();
  await expect(tools).not.toBeVisible();
});

test("workshops teach one activity at a time and original documents stay attributed", async ({ page }) => {
  await page.goto("/learn/workshops");
  await expect(page.locator(".studio-activity")).toHaveCount(1);
  await page.getByRole("button", { name: "Next activity", exact: true }).click();
  await expect(page.locator(".studio-activity .ex")).toBeVisible();
  await expect(page.locator(".studio-activity")).toContainText("A calm encounter");
  const first = await page.locator(".kh-reading h3").innerText();
  await page.getByRole("button", { name: "Next document" }).click();
  await expect(page.locator(".kh-reading h3")).not.toHaveText(first);
  await expect(page.locator(".kh-reading a.btn")).toHaveAttribute("href", /drive.google.com\/file\/d\//);
  await expect(page.locator(".kh-credit")).toContainText("Created by The Kind Hour Foundation");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("practice replaces printable cards with feedback", async ({ page }) => {
  await page.goto("/learn/resources");
  await expect(page.getByText("Cards to print", { exact: true })).toHaveCount(0);
  await page.getByLabel("Where", { exact: true }).fill("Bus stop opposite the market on MG Road");
  await page.getByLabel("What you saw", { exact: true }).fill("A brown dog limping on its left back leg at 6 pm");
  await page.getByRole("button", { name: "Not safely", exact: true }).click();
  await page.getByRole("button", { name: "Check my practice report", exact: true }).click();
  await expect(page.getByText(/Practice complete/)).toBeVisible();
});
