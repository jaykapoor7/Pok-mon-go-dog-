import { test, expect, type Page } from "@playwright/test";
import { RETIRED } from "./retired";

/* NGO submissions, programmes, team, settings, import and training in the new app, signed out (sample data).
   Every page renders, links only to new or public routes, and never scrolls sideways on a phone. */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("straypaw.notice.storage.v1", "1"); localStorage.setItem("sp.demo.tour.v1", JSON.stringify({ mode: "off", step: 0, role: null })); });
});

const open = async (page: Page, path: string) => { await page.goto(path); await page.waitForLoadState("networkidle"); };
/* Classic addresses the new app must not link to. Public pages (/community, /fundraisers/<id>, /contact) are allowed. */
const CLASSIC = RETIRED;
const classicLinks = (page: Page) => page.locator("#nx-main a[href]").evaluateAll((as, re) => as.map((a) => a.getAttribute("href") ?? "").filter((h) => new RegExp(re).test(h)), CLASSIC.source);
const noSideScroll = async (page: Page) => {
  const r = await page.evaluate(() => { const m = document.querySelector("#nx-main") as HTMLElement | null; return { doc: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, main: !m || m.scrollWidth <= m.clientWidth + 1 }; });
  expect(r).toEqual({ doc: true, main: true });
};

const PAGES: [string, RegExp][] = [
  ["/ngo/submissions", /Submissions & Reports/],
  ["/ngo/submissions?tab=evidence", /Submissions & Reports/],
  ["/ngo/submissions?tab=contracts", /Submissions & Reports/],
  ["/ngo/submissions?tab=documents", /Submissions & Reports/],
  ["/ngo/submissions?tab=exports", /Submissions & Reports/],
  ["/ngo/submissions?tab=stories", /Submissions & Reports/],
  ["/ngo/submissions?tab=quality", /Submissions & Reports/],
  ["/ngo/submissions/sample-oct", /ABC claims · October 2026/],
  ["/ngo/programmes", /Programmes/],
  ["/ngo/programmes?tab=zones", /Programmes/],
  ["/ngo/programmes?tab=surveys", /Programmes/],
  ["/ngo/programmes?tab=feeding", /Programmes/],
  ["/ngo/programmes?tab=fundraising", /Programmes/],
  ["/ngo/programmes/sample-d1", /Ward 12 vaccination drive/],
  ["/ngo/programmes/surveys/sample-sv1", /Ward 12 dog census 2026/],
  ["/ngo/programmes/surveys/sample-pj1", /School round register/],
  ["/ngo/team", /Team/],
  ["/ngo/team?tab=codes", /Team/],
  ["/ngo/team?tab=volunteers", /Team/],
  ["/ngo/settings", /Settings/],
  ["/ngo/settings?tab=deadline", /Settings/],
  ["/ngo/settings?tab=policies", /Settings/],
  ["/ngo/settings?tab=connections", /Settings/],
  ["/ngo/settings?tab=connected", /Settings/],
  ["/settings", /Your settings/],
  ["/ngo/import", /Import a register/],
  ["/ngo/training", /Training/],
];

for (const [path, heading] of PAGES) {
  test(`${path} renders on sample data and links nowhere classic`, async ({ page }) => {
    await open(page, path);
    await expect(page.locator("#nx-main h1").first()).toHaveText(heading);
    expect(await classicLinks(page)).toEqual([]);
    await noSideScroll(page);
  });
}

test.describe("at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const [path] of PAGES) {
    test(`${path} has no horizontal scroll`, async ({ page }) => {
      await open(page, path);
      await expect(page.locator("#nx-main h1").first()).toBeVisible();
      await noSideScroll(page);
    });
  }
});

test("Submissions: tabs keep their place in the address, and sample actions open the live demo", async ({ page }) => {
  await open(page, "/ngo/submissions");
  await expect(page.getByText("Sample data").first()).toBeVisible();
  await page.getByRole("tab", { name: "Contracts" }).click();
  await expect(page).toHaveURL(/\?tab=contracts$/);
  await expect(page.getByRole("table", { name: "Contract versions" })).toBeVisible();
  const add = page.getByRole("link", { name: /New contract version/ });
  await expect(add).toHaveAttribute("href", "/try");
  await expect(add).toHaveAttribute("title", "Opens the live demo, where this works");
  await page.getByRole("tab", { name: "Packages" }).click();
  await expect(page).not.toHaveURL(/tab=/);
});

test("Packages: a row previews its package and opens the record", async ({ page }) => {
  await open(page, "/ngo/submissions");
  await page.getByRole("button", { name: "Open ABC claims · October 2026" }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toContainText("The reviewing office asked a question");
  await drawer.getByRole("link", { name: "Open the package" }).last().click();
  await expect(page).toHaveURL(/\/ngo\/submissions\/sample-oct$/);
  await expect(page.getByRole("table", { name: "Claims" })).toBeVisible();
  await page.getByRole("tab", { name: "Records and evidence" }).click();
  await expect(page.getByRole("table", { name: "Records in this package" })).toBeVisible();
});

test("Evidence readiness opens on a stage from the address", async ({ page }) => {
  await open(page, "/ngo/submissions?tab=evidence&stage=returned");
  await expect(page.getByRole("tab", { name: /Returned/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("table", { name: "Procedure records" }).getByRole("row")).toHaveCount(2);
});

test("Programmes: a drive opens its record with its animals", async ({ page }) => {
  await open(page, "/ngo/programmes");
  await page.getByRole("button", { name: "Open Ward 12 vaccination drive" }).click();
  await expect(page.getByRole("dialog")).toContainText("of 75 known");
  await page.getByRole("dialog").getByRole("link", { name: "Open the drive" }).last().click();
  await expect(page).toHaveURL(/\/ngo\/programmes\/sample-d1$/);
  await expect(page.getByRole("table", { name: "Animals in this drive" })).toBeVisible();
  await page.getByRole("tab", { name: "Not recorded" }).click();
  await expect(page.getByRole("table", { name: "Animals in this drive" }).getByRole("row")).toHaveCount(3);
});

test("Zones: a zone previews its staff and next step", async ({ page }) => {
  await open(page, "/ngo/programmes?tab=zones");
  await page.getByRole("button", { name: "Open Ward 12 market and temple" }).click();
  await expect(page.getByRole("dialog")).toContainText("Supervisor review");
});

test("Training says plainly when it is not switched on", async ({ page }) => {
  await open(page, "/ngo/training");
  const off = page.getByText("Training is not switched on for this organisation");
  const on = page.getByRole("tab", { name: "My training" });
  await expect(off.or(on)).toBeVisible();
});
