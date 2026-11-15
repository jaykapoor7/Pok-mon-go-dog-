import { test, expect, type Page } from "@playwright/test";

/* Government verification, programmes, human healthcare and the laboratory in the new app, signed out (sample data).
   Every page renders with the sample chip, links to no classic route, and has no sideways scroll on a 390px phone.
   In sample mode an action is a link to /try, never a button that does nothing. */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("straypaw.notice.storage.v1", "1"); localStorage.setItem("sp.demo.tour.v1", JSON.stringify({ mode: "off", step: 0, role: null })); });
});

const open = async (page: Page, path: string) => { await page.goto(path); await page.waitForLoadState("networkidle"); };
const CLASSIC = /^\/(ngo|city|workspace|programme|animal|assistant|today)(\/|$|\?)/;
async function noClassicLinks(page: Page) {
  const hrefs = await page.$$eval("a[href]", (as) => as.filter((a) => !a.classList.contains("nx-classic")).map((a) => a.getAttribute("href") ?? ""));
  expect(hrefs.filter((h) => CLASSIC.test(h))).toEqual([]);
}
async function noSideScroll(page: Page) {
  const size = page.viewportSize();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  if (size) await page.setViewportSize(size);
}

const PAGES: [string, RegExp][] = [
  ["/next/gov/verification/v2", /October 2026 · sterilisation/],
  ["/next/gov/programmes/sample", /East Zone rabies programme/],
  ["/next/gov/programmes/sample?tab=Setup", /What this programme does/],
  ["/next/gov/reports?tab=Contracts", /Contract versions/],
  ["/next/health/bites/new", /Record a bite/],
  ["/next/health/bites/b2", /OPD-ILL-0409/],
  ["/next/health/samples/new", /Send a sample/],
  ["/next/health/samples/x3", /SX-ILL-004/],
  ["/next/health/procedures/vp1", /Sterilisation/],
  ["/next/health/referrals", /Referrals/],
  ["/next/health/facilities/ours", /Our services/],
];

for (const [path, heading] of PAGES) {
  test(`renders on sample data: ${path}`, async ({ page }) => {
    await open(page, path);
    await expect(page.locator("main, .nx").first()).toContainText(heading);
    await expect(page.locator(".nx-sample").first()).toBeVisible();
    await noClassicLinks(page);
    await noSideScroll(page);
  });
}

test("Verification queue opens the package record in the new app", async ({ page }) => {
  await open(page, "/next/gov/verification");
  await page.locator("button.nx-tr").first().click();
  await page.getByRole("dialog").getByRole("link", { name: "Open the review" }).last().click();
  await expect(page).toHaveURL(/\/next\/gov\/verification\/v2$/);
  await expect(page.getByRole("heading", { name: "Decision on this claim" })).toBeVisible();
  await noClassicLinks(page);
});

test("Package review: a claim shows its checks; selecting claims offers a batch decision that goes to the demo", async ({ page }) => {
  await open(page, "/next/gov/verification/v2");
  await page.getByRole("button", { name: "Open claim SP-1042" }).click();
  await expect(page.getByRole("list", { name: "Fixed checks for this claim" })).toContainText("Missing evidence");
  await expect(page.getByText("Accept is not offered while a requirement is missing")).toBeVisible();
  await page.getByRole("button", { name: /Select the \d+ without exceptions/ }).click();
  const batch = page.getByRole("region", { name: "Decide the selected claims" });
  await expect(batch).toContainText("selected");
  await expect(batch.getByRole("link", { name: "Decide together" })).toHaveAttribute("href", "/try");
  await expect(page.getByText("they do not decide, and Kaju does not decide", { exact: false })).toBeVisible();
  await page.getByRole("tab", { name: /History/ }).click();
  await expect(page.getByRole("heading", { name: "The package" })).toBeVisible();
});

test("Programme record: tabs for coverage, network, work, report and setup; invites point at the new start page", async ({ page }) => {
  await open(page, "/next/gov/programmes/sample");
  await expect(page.getByRole("heading", { name: "Needs a decision" })).toBeVisible();
  await page.getByRole("tab", { name: "Coverage", exact: true }).click();
  await expect(page.getByRole("table", { name: "Coverage by area" })).toContainText("Needs an estimate");
  await page.getByRole("tab", { name: "Network", exact: true }).click();
  await expect(page.getByText("It is not a stock count and does not say a place is open now")).toBeVisible();
  await page.getByRole("tab", { name: "Work", exact: true }).click();
  await expect(page.getByText("Requests never carry patient details")).toBeVisible();
  await page.getByRole("tab", { name: "Setup", exact: true }).click();
  await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create invite code" })).toHaveAttribute("href", "/try");
  await noClassicLinks(page);
});

test("Exposure record: the schedule is the clinician's, never computed", async ({ page }) => {
  await open(page, "/next/health/bites/b1");
  await expect(page.getByText("StrayPaw does not calculate or suggest a schedule", { exact: false }).or(page.getByText("Record the category first"))).toBeVisible();
  await open(page, "/next/health/bites/b2");
  await expect(page.getByRole("list", { name: "Doses" })).toBeVisible();
  await expect(page.getByText("Every dose date here was entered by the clinician")).toBeVisible();
  await expect(page.getByText("Kaju does not read this record")).toBeVisible();
});

test("Sample record: chain of custody, and the laboratory step for its status", async ({ page }) => {
  await open(page, "/next/health/samples/x3");
  await expect(page.getByRole("heading", { name: "Chain of custody" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Record the result" })).toHaveAttribute("href", "/try");
  await open(page, "/next/health/samples/x1");
  await expect(page.getByRole("link", { name: "Receive" })).toBeVisible();
});

test("Procedure sign-off: evidence, the veterinarian's authorisation and the review, as links to the demo", async ({ page }) => {
  await open(page, "/next/health/procedures/vp1");
  await expect(page.getByRole("heading", { name: "Veterinary authorisation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Authorise the procedure" })).toHaveAttribute("href", "/try");
  await expect(page.getByText("Kaju never signs or approves", { exact: false })).toBeVisible();
  await open(page, "/next/health/procedures");
  await page.locator("button.nx-tr").first().click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Review and sign" }).first()).toHaveAttribute("href", /\/next\/health\/procedures\/vp\d$/);
});

test("Referrals: arrivals, requests to the facility and where it sends people", async ({ page }) => {
  await open(page, "/next/health/referrals");
  await expect(page.locator("button.nx-tr")).toHaveCount(1);
  await page.locator("button.nx-tr").first().click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Arrived: record the bite" })).toHaveAttribute("href", "/try");
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: /^Requests to us/ }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(1);
  await page.getByRole("tab", { name: /^All/ }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(4);
});

test("Bite and dose lists link to the new clinical record", async ({ page }) => {
  await open(page, "/next/health/bites");
  await page.locator("button.nx-tr").first().click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Open the clinical record" }).first()).toHaveAttribute("href", /\/next\/health\/bites\/b\d$/);
  await open(page, "/next/health/today");
  await noClassicLinks(page);
  await open(page, "/next/health/facilities");
  await expect(page.getByRole("link", { name: "Confirm our services" })).toHaveAttribute("href", "/next/health/facilities/ours");
});
