import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem("straypaw.notice.storage.v1", "1")); });

test("the mission wall paints itself on arrival and can play again", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/mission");
  await expect(page.getByRole("region", { name: /every stray animal on record/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /click to spray/i })).toHaveCount(0);
  await expect(page.locator(".mw")).toHaveClass(/is-play/);
  await expect(page.getByRole("button", { name: /mute/i })).toBeVisible();
  const again = page.getByRole("button", { name: /spray again/i });
  await expect(again).toBeVisible({ timeout: 60_000 });
  await again.click();
  await expect(page.locator(".mw")).toHaveClass(/is-play/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("reduced motion shows the finished wall without replay", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/mission");
  await expect(page.locator(".mw")).toHaveClass(/is-done/);
  await expect(page.getByRole("button", { name: /spray again/i })).toHaveCount(0);
});
