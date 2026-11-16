import { expect, test, type Page } from "@playwright/test";

/* The rebuilt app, signed in, on staging's illustrative data. Each sample role signs in the way a visitor does on /try,
   then reads its own workspace. Read-only: nothing here creates, changes or deletes a record, so it is safe to run
   against the shared demonstration.

   Off unless E2E_SIGNED_IN=1, because it needs a deployment where the sample accounts can sign in: demo.straypaw.org,
   or a local build pointed at staging with the demo passwords. E2E_ROLES=oh-ngo,oh-lab limits a run to some roles.

     E2E_SIGNED_IN=1 E2E_BASE_URL=https://demo.straypaw.org npx playwright test e2e/rebuild-signed-in.spec.ts */
test.skip(process.env.E2E_SIGNED_IN !== "1", "Needs a deployment where the sample accounts can sign in (E2E_SIGNED_IN=1)");

test.setTimeout(180_000);

const only = (process.env.E2E_ROLES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const role = (key: string) => (only.length && !only.includes(key) ? test.skip : test);

async function signIn(page: Page, label: string) {
  await page.addInitScript(() => { for (const k of ["straypaw.notice.storage.v1", "sp.firstday.v1", "sp.firstday.offer.v1", "sp.onboard.done"]) localStorage.setItem(k, "1"); });
  await page.goto("/try");
  await page.getByRole("button", { name: new RegExp(label) }).first().click();
  await page.waitForURL(/\//, { timeout: 90_000 });
  await page.waitForLoadState("networkidle");
}
/** A signed-in page shows the organisation's own name and never the sample-data chip. */
async function live(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".nx-sub").first()).not.toContainText(/^Reading|^Opening/, { timeout: 30_000 });
  await expect(page.locator(".nx-sample")).toHaveCount(0);
}
const rows = (page: Page) => page.locator("button.nx-tr");

role("oh-ngo")("NGO coordinator: lands in the NGO workspace and reads its own cases, animals and Kaju's checks", async ({ page }) => {
  await signIn(page, "NGO coordinator");
  await expect(page).toHaveURL(/\/ngo\/today/);
  await expect(page.locator(".nx-org b")).not.toHaveText("Kind Hour");
  await live(page, "/ngo/cases");
  await expect(rows(page).first()).toBeVisible();
  await live(page, "/ngo/animals");
  await expect(rows(page).first()).toBeVisible();
  await expect(page.getByText("Unnamed")).toHaveCount(0);
  /* The register as a map: the organisation's own animals, framed to them, a tap away from each record. */
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.locator(".am-map canvas")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("#am-note")).toContainText("Only your organisation's animals are on it.");
  await live(page, "/kaju/insights");
  await expect(page.locator(".nx-chk")).toHaveCount(6);
  await expect(page.locator("a.nx-classic")).toHaveCount(0);
});

role("oh-clinician")("Hospital clinician: health workspace with referrals and facilities, and no NGO case list", async ({ page }) => {
  await signIn(page, "Hospital clinician");
  await expect(page).toHaveURL(/\/health\/today/);
  await live(page, "/health/facilities");
  await expect(rows(page).first()).toBeVisible();
  await live(page, "/health/referrals");
  await expect(page.locator(".nx-sub").first()).toContainText("names and phone numbers stay with the sending facility");
  await page.goto("/ngo/cases");
  await expect(page.locator(".nx-sub").first()).toContainText("not an NGO workspace");
});

role("oh-lab")("Laboratory scientist: samples, testing and results from the laboratory's own register", async ({ page }) => {
  await signIn(page, "Laboratory scientist");
  await live(page, "/health/samples");
  await expect(rows(page).first()).toBeVisible();
  await live(page, "/health/results");
  await expect(page.locator(".nx-sub").first()).toContainText("validates it");
  await live(page, "/health/quality");
  await expect(page.locator(".nx-fig")).toHaveCount(5);
});

role("oh-programme")("Programme lead: programme coverage, partners and surveillance with suppressed counts", async ({ page }) => {
  await signIn(page, "Programme lead");
  await expect(page).toHaveURL(/\/gov\/overview/);
  await live(page, "/gov/programmes");
  await expect(rows(page).first()).toBeVisible();
  await live(page, "/gov/partners");
  await expect(rows(page).first()).toBeVisible();
  await live(page, "/gov/surveillance");
  await expect(page.locator(".nx-sub").first()).toContainText("none of them declares an outbreak");
});

role("municipal")("Municipal reviewer: the office's own verification queue", async ({ page }) => {
  await signIn(page, "Municipal reviewer");
  await expect(page).toHaveURL(/\/gov\//);
  await live(page, "/gov/verification");
  await expect(page.locator(".nx-sub").first()).toContainText("Decisions are signed by a named reviewer");
});

role("vet")("Veterinarian: the veterinary view of the NGO's animals", async ({ page }) => {
  await signIn(page, "Veterinarian");
  await expect(page).toHaveURL(/\/health\/today/);
  await expect(page.locator(".nx-org small")).toContainText("Veterinary");
  await live(page, "/health/procedures");
  await expect(page.locator(".nx-sub").first()).toContainText("Only a veterinarian can sign");
  await live(page, "/health/care");
});
