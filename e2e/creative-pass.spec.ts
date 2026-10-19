import { test, expect } from "@playwright/test";

for (const width of [320, 390, 768, 1440]) {
  test(`marketing hero stays readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const art = page.locator(".pr-hero-art");
    const picture = await art.boundingBox();
    expect(picture).not.toBeNull();
    for (const link of await page.locator(".pr-hero .sw-acts a").all()) {
      const control = await link.boundingBox();
      expect(control).not.toBeNull();
      const overlap = picture!.x < control!.x + control!.width && picture!.x + picture!.width > control!.x && picture!.y < control!.y + control!.height && picture!.y + picture!.height > control!.y;
      expect(overlap).toBe(false);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const [preview, hero] = await Promise.all([page.locator(".hm-record").boundingBox(), page.locator("#world").boundingBox()]);
    expect(preview!.y + preview!.height).toBeLessThanOrEqual(hero!.y + hero!.height);
    await expect(page.locator("main > section")).toHaveCount(4);
    await expect(page.getByRole("link", { name: "Explore the map", exact: true })).toBeVisible();
  });
}

test("Send is optional and reduced motion preserves the readable record", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const section = page.locator("#why");
  await expect(section.getByRole("heading", { name: "Understand", exact: true })).toBeVisible();
  await section.getByRole("button", { name: "Send the example report" }).click();
  await expect(section.getByRole("status")).toContainText("no organisation has accepted");
  expect(await section.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  await section.getByRole("button", { name: "Replay the example" }).click();
  await expect(section.getByRole("status")).toContainText("Try Send");
});

test("core marketing information and actions survive without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The care infrastructure for India’s street animals." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Report an animal", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Better care starts with better information." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send the example report" })).toBeDisabled();
  await context.close();
});

test("mobile Send creates a visible review item and preserves pending states", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Send the example report" }).click();
  const record = page.locator("#request-record");
  await record.getByRole("button", { name: "Case details", exact: true }).click();
  await expect(record).toContainText("Received · needs review");
  await expect(record).toContainText("Unassigned");
  await expect(record).toContainText("None recorded");
  await record.getByRole("button", { name: "Animal history", exact: true }).click();
  await record.getByRole("button", { name: "Geographic area", exact: true }).click();
  await expect(record.getByText(/This example is not on the map/)).toBeVisible();
  await record.getByRole("button", { name: "Animal history", exact: true }).click();
  await expect(record.getByText("Not linked", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Replay the example" }).click();
  await expect(page.locator(".rq-chat")).toBeVisible();
  await expect(record).toBeHidden();
});
