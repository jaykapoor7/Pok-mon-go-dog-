import { expect, test, type Page } from "@playwright/test";

/* The programme journey across institutions, against the STAGING demo
   (illustrative data only). Skipped unless OH_E2E=1: it needs a build pointed
   at staging with DEMO_ONEHEALTH_PASSWORD set, because each person signs in
   through the demonstration buttons and every permission is decided by the
   database functions themselves.

   OH_E2E=1 E2E_BASE_URL=http://localhost:3300 npx playwright test e2e/one-health.spec.ts */
test.skip(process.env.OH_E2E !== "1", "Needs a build pointed at the staging demonstration");
test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);

const HOSPITAL = "/workspace/f1000000-0000-4000-8000-000000000004";
const NGO = "/workspace/f1000000-0000-4000-8000-000000000010";
const LAB = "/workspace/f1000000-0000-4000-8000-000000000009";
const PROGRAMME = "/programme/bengaluru-demo";
const stamp = `E2E-${Date.now().toString(36).toUpperCase()}`;
/* Phone and desktop runs share staging, so each follows its own sample by code. */
let sampleCode = "";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => { for (const k of ["straypaw.notice.storage.v1", "straypaw.tour.v2", "straypaw-install-dismissed", "straypaw.analytics.optout"]) localStorage.setItem(k, "1"); });
});

async function as(page: Page, who: RegExp) {
  await page.goto("/today");
  await page.getByRole("button", { name: who }).click();
  await expect(page.getByText("Explore the demonstration")).toHaveCount(0, { timeout: 60_000 });
}
const seg = (page: Page, text: string) => page.locator("label").filter({ hasText: new RegExp(`^${text}$`) }).first().click();

test("clinician records a category III bite; the area's NGO is asked to follow up", async ({ page }) => {
  await as(page, /Hospital clinician/);
  await page.goto(`${HOSPITAL}/new`);
  await page.getByRole("textbox", { name: "Your register number" }).fill(stamp);
  await expect(page.getByRole("combobox", { name: /^Area/ })).toBeEnabled();
  await page.getByRole("combobox", { name: /^Area/ }).selectOption({ label: "HSR Layout" });
  await seg(page, "Washed before arrival");
  await seg(page, "Street or community");
  await page.getByRole("textbox", { name: "What it looked like" }).fill(`Tan dog, torn ear (${stamp})`);
  await seg(page, "Category III");
  await page.getByRole("button", { name: "Save presentation" }).click();
  await expect(page.getByRole("heading", { level: 1, name: stamp })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Category III", { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/Waiting for the team|In progress|New/).first()).toBeVisible();
});

test("the NGO sees the request without patient details and sends a sample", async ({ page }) => {
  await as(page, /NGO field worker/);
  await page.goto(NGO);
  const row = page.locator(".oh-row").filter({ hasText: `torn ear (${stamp})` }).first();
  await expect(row).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".oh-row-main b").filter({ hasText: stamp })).toHaveCount(0); // no patient identifier in the request itself
  await row.getByRole("button", { name: "Record what you found" }).click();
  await page.getByRole("textbox", { name: "What you found" }).fill(`Dog found dead; sample collected (${stamp})`);
  await page.getByRole("button", { name: "Close follow-up" }).click();
  await expect(page.getByText("The sender can see what you found")).toBeVisible();
  await page.goto(`${NGO}/sample`);
  await page.getByRole("combobox", { name: /^Area/ }).selectOption({ label: "HSR Layout" });
  await page.getByRole("textbox", { name: "What happened to the animal" }).fill(`Died during observation (${stamp})`);
  await page.getByRole("button", { name: "Send sample" }).click();
  await expect(page.getByText("Chain of custody")).toBeVisible({ timeout: 30_000 });
  sampleCode = (await page.getByRole("heading", { level: 1 }).textContent())?.trim() ?? "";
  expect(sampleCode).toMatch(/^S/);
});

test("the laboratory receives, tests and reports the sample positive", async ({ page }) => {
  await as(page, /Laboratory scientist/);
  await page.goto(LAB);
  const mine = () => page.locator(".oh-row").filter({ hasText: sampleCode });
  const row = mine().filter({ has: page.getByRole("button", { name: "Receive" }) }).first();
  await row.getByRole("button", { name: "Receive" }).click();
  await expect(page.getByText(/received\./)).toBeVisible();
  const r2 = mine().filter({ has: page.getByRole("button", { name: "Start test" }) }).first();
  await r2.getByRole("button", { name: "Start test" }).click();
  const r3 = mine().filter({ has: page.getByRole("button", { name: "Record result" }) }).first();
  await r3.getByRole("button", { name: "Record result" }).click();
  await seg(page, "Positive");
  await page.getByRole("textbox", { name: "Test method" }).fill("Direct fluorescent antibody test (E2E)");
  await page.getByRole("button", { name: "Report result" }).click();
  await expect(page.getByText(/positive\. The sender and programme coordinators/)).toBeVisible();
});

test("the programme lead sees the confirmed case and the care network", async ({ page }) => {
  await as(page, /Programme lead/);
  await page.goto(PROGRAMME);
  await expect(page.getByText(/Rabies confirmed in HSR Layout/).first()).toBeVisible({ timeout: 30_000 });
  await page.goto(`${PROGRAMME}/network`);
  await expect(page.getByRole("region", { name: "Map of the care network" })).toBeVisible();
  await expect(page.getByText("Referral pathways")).toBeVisible();
});

test("a nurse records doses but cannot assess or prescribe", async ({ page }) => {
  await as(page, /Hospital nurse/);
  await page.goto(HOSPITAL);
  await expect(page.getByRole("heading", { name: /daily brief/ })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".dy-place", { hasText: "Teaching hospital" })).toBeVisible();
  await page.goto(`${HOSPITAL}/register`);
  await page.getByRole("link", { name: stamp }).click();
  await expect(page.getByRole("button", { name: "Prescribe a course" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Category (I|II|III)$/ })).toHaveCount(0);
});

test("another city's lead cannot open this programme", async ({ page }) => {
  await as(page, /Another city's lead/);
  await page.goto(PROGRAMME);
  await expect(page.getByText("This programme is not visible to you")).toBeVisible({ timeout: 30_000 });
});

test("the public finder lists centres and refers for what each lacks", async ({ page }) => {
  await page.goto("/bite-help");
  await expect(page.getByRole("heading", { name: "Wound-Washing Unit · Koramangala" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Sends people to/).first()).toBeVisible();
  await page.getByLabel("I need").selectOption("wound_care");
  await expect(page.getByRole("heading", { name: /Whitefield/ })).toBeVisible();
});
