import { test, expect } from "@playwright/test";

/* The rebuild at /next, on sample data. These hold the interactions the handoff calls signature:
   a task settles into Done, a row opens its record, a chart choice narrows the table, a channel turns talk into
   work only on acceptance, and Kaju stops for approval. */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("straypaw.notice.storage.v1", "1"); localStorage.setItem("sp.demo.tour.v1", JSON.stringify({ mode: "off", step: 0, role: null })); });
});

/* Typing before React has attached would be lost on any server-rendered page; wait for the page to settle first. */
const open = async (page: import("@playwright/test").Page, path: string) => { await page.goto(path); await page.waitForLoadState("networkidle"); };

const noSideScroll = async (page: import("@playwright/test").Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

test("Today: finishing a task moves it to Done and updates the count", async ({ page }) => {
  await open(page, "/next/ngo/today");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Priya");
  await expect(page.locator(".nx-sub")).toContainText("6 things need you");
  await page.getByRole("button", { name: /^Mark done: Injured street dog/ }).click();
  await expect(page.locator(".nx-sub")).toContainText("5 things need you");
  await expect(page.getByRole("button", { name: /^Reopen: Injured street dog/ })).toBeVisible();
  await noSideScroll(page);
});

test("Animals: a view narrows the table and a row opens its record", async ({ page }) => {
  await open(page, "/next/ngo/animals");
  await expect(page.locator("button.nx-tr")).toHaveCount(9);
  await page.getByRole("tab", { name: /Identity to review/ }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(1);
  await page.locator("button.nx-tr").first().click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toContainText("Activity and medical history");
  await drawer.getByRole("link", { name: "Open full record" }).first().click();
  await expect(page).toHaveURL(/\/next\/ngo\/animals\/AN-1107$/);
  await expect(page.getByRole("tab", { name: "Summary" })).toHaveAttribute("aria-selected", "true");
  await noSideScroll(page);
});

test("Cases: views narrow one list, and a row opens its details", async ({ page }) => {
  await open(page, "/next/ngo/cases");
  await expect(page.locator("button.nx-tr")).toHaveCount(5);
  await page.getByRole("tab", { name: /Critical and high/ }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(3);
  await page.getByRole("tab", { name: /Resolved/ }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(2);
  await page.locator("button.nx-tr").first().click();
  await expect(page.getByRole("dialog")).toContainText("CASE-0198");
  await noSideScroll(page);
});

test("Insights: choosing a ward narrows the figures and the table together", async ({ page }) => {
  await open(page, "/next/gov/overview");
  await expect(page.locator("button.nx-tr")).toHaveCount(6);
  await page.locator(".nx-barrow", { hasText: "Ward 08" }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(1);
  await expect(page.locator(".nx-fig").first()).toContainText("236");
  await expect(page.locator(".nx-barrow", { hasText: "Ward 14" })).toContainText("No estimate");
  await noSideScroll(page);
});

test("Channel: Kaju proposes tasks and creates them only when accepted", async ({ page }) => {
  await open(page, "/next/channels/abc-ward-12");
  const work = page.getByRole("tab", { name: /^Work/ });
  await expect(work).toContainText("1");
  await page.getByLabel("Message #abc-ward-12").fill("@Kaju turn these updates into tasks");
  await page.getByLabel("Message #abc-ward-12").press("Enter");
  await expect(page.getByRole("button", { name: "Create 2 tasks" })).toBeVisible();
  await expect(work).toContainText("1");
  await page.getByRole("button", { name: "Create 2 tasks" }).click();
  await expect(work).toContainText("3");
  await noSideScroll(page);
});

test("Kaju: details are recognised before sending, and a run stops for approval", async ({ page }) => {
  await open(page, "/next/kaju");
  const ask = page.getByLabel("Ask Kaju");
  await ask.fill("Prepare next week's follow-ups for Ward 12, assign to Field team A, and notify #field-operations");
  await expect(page.locator(".nx-span")).toHaveCount(4);
  await expect(page.locator(".nx-mission")).toHaveCount(2);
  await page.getByRole("button", { name: /^Place: Ward 12/ }).click();
  await expect(page.locator(".nx-plan")).toContainText("Ward 14");
  await ask.press("Enter");
  await expect(page.locator(".nx-mission")).toHaveCount(3);
  await page.getByRole("button", { name: "Approve and post" }).click();
  await expect(page.locator(".nx-mission").first()).toContainText("Completed");
  await noSideScroll(page);
});
