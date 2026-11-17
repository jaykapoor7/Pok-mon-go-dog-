import { test, expect, type Page } from "@playwright/test";
import { RETIRED } from "./retired";

/* NGO operational records on the rebuilt app, signed out (sample data): cases with their drawer and record, a new case,
   animals and an animal record, the inbox, operations and field mode. Each page renders, links only to rebuilt routes,
   and never scrolls sideways on a phone. Read-only: nothing here signs in or writes. */

const PAGES = [
  "/ngo/cases", "/ngo/cases/c2", "/ngo/cases/new?title=Injured%20dog&zone=Ward%2012&note=Seen%20at%20the%20gate",
  "/ngo/animals", "/ngo/animals/AN-1042", "/ngo/inbox", "/ngo/operations", "/ngo/field",
];
const CLASSIC = RETIRED;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("straypaw.notice.storage.v1", "1"); localStorage.setItem("sp.demo.tour.v1", JSON.stringify({ mode: "off", step: 0, role: null })); });
});
const open = async (page: Page, path: string) => { await page.goto(path); await page.waitForLoadState("networkidle"); };
const classicLinks = (page: Page) => page.evaluate((re) => [...document.querySelectorAll<HTMLAnchorElement>("a[href]")].map((a) => a.getAttribute("href") ?? "").filter((h) => new RegExp(re).test(h)), CLASSIC.source);
const noSideScroll = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

for (const path of PAGES) {
  test(`renders on sample data with no classic link: ${path}`, async ({ page }) => {
    await open(page, path);
    await expect(page.locator(".nx-sample").first()).toBeVisible();
    await expect(page.locator("h1").first()).toBeVisible();
    expect(await classicLinks(page)).toEqual([]);
  });
  test(`no sideways scroll at 390px: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, path);
    await noSideScroll(page);
  });
}

test("Cases: the drawer carries the next step, and its actions open the live demo", async ({ page }) => {
  await open(page, "/ngo/cases");
  await expect(page.getByRole("tab", { name: /^Needs a decision/ })).toBeVisible();
  await page.getByRole("tab", { name: /^Unassigned/ }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(1);
  await page.locator("button.nx-tr").first().click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toContainText("Next step");
  await expect(drawer.getByRole("link", { name: "Take it" })).toHaveAttribute("href", "/try");
  await expect(drawer.getByRole("link", { name: "Open the full case" }).first()).toHaveAttribute("href", "/ngo/cases/c1");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Cases: j and k move between rows and Enter opens one", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "A keyboard path");
  await open(page, "/ngo/cases");
  await page.locator("button.nx-tr").first().focus();
  await page.keyboard.press("j");
  await expect(page.locator("button.nx-tr").nth(1)).toBeFocused();
  await page.keyboard.press("k");
  await expect(page.locator("button.nx-tr").first()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toContainText("CASE-0278");
});

test("Case record: follow-ups, history and care tabs", async ({ page }) => {
  await open(page, "/ngo/cases/c2");
  await expect(page.locator("h1")).toContainText("CASE-0241");
  await expect(page.getByText("Recovery check at the centre")).toBeVisible();
  await page.getByRole("tab", { name: /^History/ }).click();
  await expect(page.getByText("Recovery observed: eating, wound clean")).toBeVisible();
  await page.getByRole("tab", { name: "Care and movements" }).click();
  await expect(page.getByRole("link", { name: "Record care or movement" })).toHaveAttribute("href", "/try");
});

test("New case: the form starts filled from the address", async ({ page }) => {
  await open(page, "/ngo/cases/new?title=Injured%20dog&zone=Ward%2012&note=Seen%20at%20the%20gate&lat=12.97&lng=77.59");
  await expect(page.getByLabel("In a few words")).toHaveValue("Injured dog");
  await expect(page.getByLabel("Area, street or landmark (optional)")).toHaveValue("Ward 12");
  await expect(page.getByLabel("Latitude")).toHaveValue("12.97");
  await expect(page.getByRole("link", { name: "Open the case" })).toHaveAttribute("href", "/try");
});

test("Animals: lenses narrow the register and identity review is a view", async ({ page }) => {
  await open(page, "/ngo/animals");
  await page.getByRole("tab", { name: /^Not sterilised/ }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(3);
  await page.getByRole("tab", { name: /^Identity to review/ }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(1);
  await page.locator("button.nx-tr").first().click();
  await expect(page.getByRole("dialog")).toContainText("Activity and medical history");
});

test("Animals: each is named by its name and number, with a photo place, and the register can be a map", async ({ page }) => {
  await open(page, "/ngo/animals");
  await expect(page.getByText("Unnamed")).toHaveCount(0);
  const first = page.locator("button.nx-tr").first();
  await expect(first.locator(".am-ph")).toBeVisible();
  await expect(first.locator(".am-tag")).toHaveText("1042");
  /* On a phone, list or map sits in the Filter sheet with the place and the download (docs/rebuild/MOBILE.md). */
  const phone = test.info().project.name === "mobile";
  const tools = async () => { if (phone) await page.getByRole("button", { name: "Filter" }).click(); };
  const done = async () => { if (phone) await page.getByRole("dialog", { name: "Filter" }).getByRole("button", { name: "Done" }).click(); };
  await tools();
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await done();
  await expect(page).toHaveURL(/view=map/);
  await expect(page.getByText(/Sign in as a member of an NGO to see your organisation/)).toBeVisible();
  await expect(page.locator("button.nx-tr")).toHaveCount(0);
  await tools();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await done();
  await expect(page.locator("button.nx-tr")).toHaveCount(9);
});

test("Inbox: reports can be chosen together, and WhatsApp conversations are their own tab", async ({ page }) => {
  await open(page, "/ngo/inbox");
  await page.getByRole("button", { name: /^Select the report from Ward 12/ }).click();
  await expect(page.getByText("1 chosen")).toBeVisible();
  await page.getByRole("tab", { name: "WhatsApp" }).click();
  await expect(page.getByText("Field team A").filter({ visible: true }).first()).toBeVisible();
  /* Messages arrive from WhatsApp itself; there is no pasting. */
  await expect(page.getByRole("tab", { name: "Paste a message" })).toHaveCount(0);
});

test("Operations: care log and the two lanes sit beside the visits, with field mode a tap away", async ({ page }) => {
  await open(page, "/ngo/operations");
  await page.getByRole("tab", { name: "Care log" }).click();
  await expect(page.locator("button.nx-tr")).toHaveCount(4);
  const parts = page.getByRole("tablist", { name: "Operations" });
  await parts.getByRole("tab", { name: "Sterilisation" }).click();
  await expect(page.getByRole("heading", { name: /Vet sign-off/ })).toBeVisible();
  await parts.getByRole("tab", { name: "Rescues" }).click();
  await expect(page.getByRole("heading", { name: /In care/ })).toBeVisible();
  /* On a phone, field mode is in the "+" sheet, one tap from every page, so Operations does not repeat it. */
  if (test.info().project.name === "mobile") {
    await page.getByRole("button", { name: /^New: record/ }).click();
    await expect(page.getByRole("dialog", { name: "New" }).getByRole("link", { name: /^Field mode/ })).toHaveAttribute("href", "/ngo/field");
  } else await expect(page.getByRole("link", { name: "Open field mode" })).toHaveAttribute("href", "/ngo/field");
});

test("Field mode: the round on a phone, every action opening the live demo", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "/ngo/field");
  await expect(page.getByRole("heading", { name: "Your round" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Record an animal" })).toHaveAttribute("href", "/try");
  const done = page.getByRole("link", { name: "Done" }).first();
  await expect(done).toBeVisible();
  expect((await done.boundingBox())!.height).toBeGreaterThanOrEqual(43);
});
