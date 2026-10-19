import { test, expect } from "@playwright/test";

test("municipal buyer has a direct navigation route and a usable paid pilot model", async ({ page }) => {
  await page.goto("/municipalities");
  await expect(page.locator("h1")).toContainText("Digital infrastructure");
  await expect(page.locator("header.sp-header")).toHaveCount(1);
  await expect(page.locator(".sd-body")).toHaveCount(0);
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Discuss a paid pilot" })).toHaveAttribute("href", /Paid%20municipal%20pilot/);
  await page.getByRole("button", { name: "StrayPaw reviews evidence" }).click();
  await expect(page.locator("#pilot-model-detail")).toContainText("Corrections return to the field team");
  await page.getByRole("button", { name: "Release funds after review" }).click();
  await expect(page.locator("#pilot-model-detail")).toContainText("under the agreed pilot terms");
  await expect(page.locator("#pilot-model-detail")).toContainText("verified records");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto("/product");
  const pricing = page.locator("#whatsapp-pricing");
  await expect(pricing).toContainText("₹999");
  await expect(pricing).toContainText("/ month per NGO");
  await expect(pricing.getByRole("link", { name: "Ask about the WhatsApp pilot" })).toHaveAttribute("href", /^\/contact\?/);
  await pricing.getByRole("link", { name: "Ask about the WhatsApp pilot" }).click();
  await expect(page.locator("#contact-subject")).toHaveValue("WhatsApp pilot ₹999 per month");
});
