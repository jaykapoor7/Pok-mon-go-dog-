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
    const side = page.getByRole("complementary", { name: "Workspace" });
    await expect(side.getByRole("link", { name: "Package review" })).toHaveAttribute("aria-current", "page");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("the homepage positions StrayPaw beyond ABC, with ABC/ARV as the first product", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/platform for\s*animal welfare programmes/);
  await expect(page.getByText(/We start with ABC and anti-rabies programmes/)).toBeVisible();
});
