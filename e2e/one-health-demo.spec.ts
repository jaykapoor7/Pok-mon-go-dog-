import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/* The One Health product demo (/demo/one-health): one dog bite followed from a Kannada call through the hospital, the
   veterinary team and NGO, the municipality and researchers, with Kaju alongside. It is illustrative from start to
   finish and reads no database, so it runs the same in CI, on previews and in production. */

const URL = "/demo/one-health";
const CHAPTERS = ["Citizen", "Hospital", "Vet & NGO", "Municipality", "Researchers", "Kaju"];
const BEATS = 28;

async function open(page: Page, path = URL) {
  await page.addInitScript(() => { try { for (const k of ["straypaw.notice.storage.v1", "straypaw.analytics.optout"]) localStorage.setItem(k, "1"); } catch {} });
  await page.goto(path);
}

test("the cover names the case, the six roles and what is proposed", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("One dog bite, one shared record.");
  await expect(page.getByText("Illustrative data", { exact: true })).toBeVisible();
  const chapters = page.getByRole("navigation", { name: "Chapters" }).getByRole("button");
  await expect(chapters).toHaveCount(CHAPTERS.length);
  for (const [i, c] of CHAPTERS.entries()) await expect(chapters.nth(i)).toContainText(c);
  await expect(page.locator(".ohd-legend-c")).toContainText("In StrayPaw today");
  await expect(page.locator(".ohd-legend-c")).toContainText("Proposed");
});

test("it reads no database and calls no service", async ({ page }) => {
  const calls: string[] = [];
  page.on("request", (r) => { if (/supabase|\/rest\/v1\/|\/api\/(ai|kaju|demo)/.test(r.url())) calls.push(r.url()); });
  await open(page, `${URL}#hospital/3`);
  await page.waitForLoadState("networkidle");
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(800);
  expect(calls).toEqual([]);
});

test("the arrow keys walk every step from the Kannada call to Kaju's summary", async ({ page }) => {
  await open(page);
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/#citizen$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reports a dog bite in Kannada");
  const kannada = page.locator('.ohd-call [lang="kn"]').first();
  await expect(kannada).toContainText("ನಮಸ್ಕಾರ");
  await expect(page.locator(".ohd-tell .ohd-avail.is-proposed")).toBeVisible();

  for (let i = 1; i < BEATS; i++) await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/#kaju\/3$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Supports coordination from the first call to the evaluation");
  await expect(page.locator(".ohd-sum")).toContainText("Kaju never");
  await expect(page.locator(".ohd-sum")).toContainText("Before real use");
  await expect(page.locator(".ohd-ctl").getByRole("button", { name: /Play again/ })).toBeVisible();

  /* And back again, chapter by chapter. */
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowLeft");
  await expect(page).toHaveURL(/#research\/5$/);
});

test("a link opens its step: the clinician signs the category, and StrayPaw never sets the schedule", async ({ page }) => {
  await open(page, `${URL}#hospital/3`);
  await expect(page.getByRole("dialog", { name: "Record category III" })).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("This is my clinical assessment of this exposure.");
  await expect(page.locator(".ohd-app .ohd-chip.is-bad", { hasText: "Category III" })).toBeVisible({ timeout: 8_000 });
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".ohd-app")).toContainText("StrayPaw does not calculate a schedule. Every dose date here was entered by the clinician.");
  await expect(page.locator(".ohd-app")).toContainText("Kaju does not read this record.");
});

test("the NGO sees the animal and its vaccination, never the patient", async ({ page }) => {
  await open(page, `${URL}#vet-ngo`);
  await expect(page.locator(".ohd-app")).toContainText("Patient details stay with the hospital");
  await expect(page.locator(".ohd-app")).not.toContainText("OPD-ILL-0412");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".ohd-app")).toContainText("Anti-rabies vaccine");
  await expect(page.locator(".ohd-app")).toContainText("ARV-ILL-0326");
});

test("research shows hidden counts as hidden, never as numbers", async ({ page }) => {
  await open(page, `${URL}#research/4`);
  await expect(page.locator(".ohd-sup").first()).toHaveText("fewer than 5");
  await expect(page.locator(".ohd-app")).toContainText("2 hidden counts that are not added in");
});

test("Play advances on its own and Pause holds it", async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, `${URL}?play=1`);
  await expect(page).toHaveURL(/#citizen$/);
  await expect(page).toHaveURL(/#citizen\/2$/, { timeout: 12_000 });
  await page.getByRole("button", { name: "Pause" }).click();
  await page.waitForTimeout(9_000);
  await expect(page).toHaveURL(/#citizen\/2$/);
});

test("nothing moves under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, `${URL}#research/2`);
  await page.waitForTimeout(1500);
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running" && (a.effect as KeyframeEffect | null)?.target instanceof Element && ((a.effect as KeyframeEffect).target as Element).closest(".ohd")).length);
  expect(running).toBe(0);
});

test("on a phone every chapter fits the width", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone layout");
  await open(page);
  for (const id of ["citizen/5", "hospital/5", "vet-ngo/3", "municipality/5", "research/4", "kaju/3"]) {
    await page.evaluate((h) => { location.hash = h; }, id);
    await page.waitForTimeout(600);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(over, id).toBeLessThanOrEqual(0);
  }
  await expect(page.locator(".ohd-ctl").getByRole("button", { name: /Next|Play again/ })).toBeInViewport();
});

for (const step of ["", "#citizen/5", "#hospital/3", "#municipality/5", "#kaju/3"]) {
  test(`no serious accessibility problems (${step || "cover"})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, `${URL}${step}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(4_000);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    if (bad.length) console.log(bad.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.slice(0, 4).map((n) => n.target.join(" ")).join("\n  ")}`).join("\n"));
    expect(bad.map((v) => v.id)).toEqual([]);
  });
}
