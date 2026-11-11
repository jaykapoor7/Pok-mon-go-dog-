import { expect, test, type Page } from "@playwright/test";

/* The One Health journey across institutions, against the LOCAL One Health
   database only (scripts/oh-local). Skipped unless OH_E2E=1, because CI has
   no such database. Each person signs in through the demonstration buttons,
   and every permission is decided by the database functions themselves.

   OH_E2E=1 E2E_BASE_URL=http://localhost:3200 npx playwright test e2e/one-health.spec.ts --project=desktop */
test.skip(process.env.OH_E2E !== "1", "Needs the local One Health database (scripts/oh-local)");
test.describe.configure({ mode: "serial" });

const HOSPITAL = "/workspace/f1000000-0000-4000-8000-000000000003";
const NGO = "/workspace/f1000000-0000-4000-8000-000000000007";
const LAB = "/workspace/f1000000-0000-4000-8000-000000000006";
test.beforeEach(async ({ context }) => { await context.addInitScript(() => { for (const k of ["straypaw.notice.storage.v1", "straypaw.tour.v2", "straypaw-install-dismissed", "straypaw.analytics.optout"]) localStorage.setItem(k, "1"); }); });
const stamp = `E2E-${Date.now().toString(36).toUpperCase()}`;

async function as(page: Page, who: RegExp) {
  await page.goto("/today");
  await page.getByRole("button", { name: who }).click();
  await expect(page.locator(".oh-top")).toBeVisible({ timeout: 20_000 });
}

test("a clinician records a bite, assesses it and prescribes the dates they set", async ({ page }) => {
  await as(page, /Hospital clinician/);
  await page.goto(`${HOSPITAL}/new`);
  await page.getByLabel("Your register number").fill(stamp);
  await page.getByLabel("Ward or locality").selectOption("HSR Layout");
  await page.locator("label").filter({ hasText: /^Street or community$/ }).click();
  await page.getByLabel("What it looked like").fill(`Tan dog, torn ear (${stamp})`);
  await page.getByLabel("Where it can be found").fill("Sector 7 bus stop");
  await page.locator("label").filter({ hasText: /^Category III$/ }).click();
  await page.getByRole("button", { name: "Save presentation" }).click();
  await expect(page.getByRole("heading", { level: 1, name: stamp })).toBeVisible();
  await expect(page.getByText("Category III", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("StrayPaw does not calculate a schedule.")).toBeVisible();
  await page.getByLabel("Regimen").fill("Facility protocol, as prescribed (test)");
  await page.getByRole("button", { name: "Add a dose date" }).click();
  const second = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Dose 2 date").fill(second);
  await page.getByRole("button", { name: "Save prescription" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Dose 2" })).toBeVisible();
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await page.getByLabel("Vaccine batch").fill("TEST-1");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/Given .* batch TEST-1/)).toBeVisible();
  await expect(page.getByText("Waiting for the team to report what they found.")).toBeVisible();
});

test("the NGO sees the follow-up without patient details, and sends a sample", async ({ page }) => {
  await as(page, /NGO field worker/);
  await page.goto(NGO);
  const row = page.locator(".oh-row").filter({ hasText: "Sector 7 bus stop" }).first();
  await expect(row).toBeVisible();
  await expect(page.getByText(stamp, { exact: true })).toHaveCount(0); // the register number never reaches the NGO
  await row.getByRole("button", { name: "Record what you found" }).click();
  await expect(page.getByText(`Tan dog, torn ear (${stamp})`)).toBeVisible(); // the animal description does
  await page.getByRole("link", { name: /sick or died: send a sample/ }).click();
  await page.getByLabel("What happened to the animal").fill(`Found dead on day 4 (${stamp})`);
  await page.getByRole("button", { name: "Send sample" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /^S-/ })).toBeVisible();
  await expect(page.getByText("Sent to the laboratory", { exact: true })).toBeVisible();
  // The hospital's workspace stays closed to the NGO.
  await page.goto(HOSPITAL);
  await expect(page.getByText("You are not part of this place")).toBeVisible();
});

test("the laboratory receives, tests and reports a positive", async ({ page }) => {
  await as(page, /Laboratory scientist/);
  await page.goto(LAB);
  const row = page.locator(".oh-row").filter({ hasText: "HSR Layout" }).filter({ hasText: "On its way" }).first();
  await row.getByRole("button", { name: "Receive" }).click();
  await expect(page.locator(".oh-row").filter({ hasText: "HSR Layout" }).getByRole("button", { name: "Start test" }).first()).toBeVisible();
  await page.locator(".oh-row").filter({ hasText: "HSR Layout" }).getByRole("button", { name: "Start test" }).first().click();
  await page.locator(".oh-row").filter({ hasText: "HSR Layout" }).getByRole("button", { name: "Record result" }).first().click();
  await page.locator("label").filter({ hasText: /^Positive$/ }).click();
  await page.getByLabel("Test method").fill("Direct fluorescent antibody test (test)");
  await page.getByRole("button", { name: "Report result" }).click();
  await expect(page.getByRole("status")).toContainText("positive");
});

test("the programme lead sees the confirmed case and the alert, but not patient records", async ({ page }) => {
  await as(page, /Programme lead/);
  await expect(page).toHaveURL(/\/programme\/bengaluru-demo/);
  await expect(page.getByText(/laboratory-confirmed rabies case/)).toBeVisible();
  await page.goto("/programme/bengaluru-demo/follow-ups");
  await expect(page.getByText("Laboratory-confirmed rabies: HSR Layout").first()).toBeVisible();
  await page.goto(`${HOSPITAL}/register`);
  await expect(page.getByText(stamp)).toHaveCount(0);
});

test("a nurse records doses but cannot prescribe or assess", async ({ page }) => {
  await as(page, /Hospital nurse/);
  await page.goto(`${HOSPITAL}/register?filter=needs_assessment`);
  await page.locator("tbody tr").first().click();
  await expect(page.getByText(/Waiting for a clinician|A clinician prescribes from this page/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Category (I|II|III)$/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save prescription" })).toHaveCount(0);
});

test("the public finds verified centres and can leave a notice that reaches the clinic", async ({ page }) => {
  await page.goto("/bite-help");
  await expect(page.getByText("Teaching Hospital Anti-Rabies Clinic")).toBeVisible();
  await expect(page.getByText("Not verified").first()).toBeVisible();
  await page.getByLabel("Area").selectOption("Jayanagar");
  await page.getByLabel("What the animal looked like").fill(`Spotted dog (${stamp})`);
  await page.getByRole("button", { name: "Send notice" }).click();
  await expect(page.getByText("The programme has your notice.")).toBeVisible();
  await as(page, /Hospital clinician/);
  await page.goto(HOSPITAL);
  await expect(page.getByText(`Spotted dog (${stamp})`, { exact: false })).toBeVisible();
});
