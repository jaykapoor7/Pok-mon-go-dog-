import { expect, test, type Page } from "@playwright/test";

/* The One Health guided demo, driven as a presenter drives it: Start Demo, then every stage on the real workspaces
   with the guide's examples, the highlighted controls and every confirmation, to the closing card. It writes
   fictional records to the demonstration database (a notice, a bite, a request, a Kaju case), so it is skipped
   unless OH_E2E=1:

     OH_E2E=1 E2E_BASE_URL=https://demo.straypaw.org npx playwright test e2e/demo-story.spec.ts --project desktop --trace off

   docs/one-health/LOOM-SCRIPT.md is the same path, with narration. */
test.skip(process.env.OH_E2E !== "1", "Needs the demonstration site or a build pointed at staging");
test.setTimeout(600_000);

const card = (page: Page) => page.locator("aside.dt").first();
const act = (page: Page, title: string) => expect(card(page).locator("h2", { hasText: title })).toBeVisible({ timeout: 90_000 });
const on = (page: Page, re: RegExp) => card(page).getByRole("button", { name: re }).click();

test("one bite, six stages: the guide points at each control, notices each step and hands over to the next role", async ({ page, isMobile }) => {
  test.skip(isMobile, "the recording is made on a desktop");
  await page.addInitScript(() => { for (const k of ["straypaw.notice.storage.v1", "straypaw.analytics.optout"]) localStorage.setItem(k, "1"); });
  await page.goto("/try");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("One Health. One Connected Response.");
  await expect(page.getByRole("list", { name: "The six stages" }).getByRole("listitem")).toHaveCount(6);
  await page.getByRole("button", { name: /Start Demo/ }).click();

  /* 1 · Citizen: Kaju reads the words, asks what is missing, the person confirms, the clinic is told. */
  await page.waitForURL(/\/bite-help/, { timeout: 90_000 });
  await act(page, "Tell Kaju what happened");
  await expect(page.locator(".sp-tour-hl")).toBeVisible();
  await on(page, /Use the example words/);
  await page.getByRole("button", { name: "Tell Kaju" }).click();
  const read = page.locator('[data-tour="bite-understood"]');
  for (const w of ["Dog, street or community", "Indiranagar", "this morning", "Medical help", "what the animal looked like"]) await expect(read).toContainText(w);
  await act(page, "Answer the safety question");
  await page.getByRole("button", { name: "No, none of these" }).click();
  await act(page, "See where to go");
  await page.getByRole("button", { name: "Tell the programme about the animal" }).click();
  await act(page, "Add what Kaju asked for");
  await on(page, /Use the example description/);
  await page.locator('[data-tour="bite-answer"] input').press("Enter");
  await page.getByRole("button", { name: "No, just send it" }).click();
  await act(page, "Confirm and send");
  await page.getByRole("button", { name: "Send the notice" }).click();
  await expect(page.locator('[data-tour="bite-sent"]')).toContainText("Sent to", { timeout: 30_000 });
  await on(page, /Next role: Hospital/);

  /* 2 · Hospital: the notice becomes the bite record; the clinician's category and course; the NGO is asked. */
  await act(page, "The notice is waiting");
  await page.locator('[data-tour="notice"][data-area="Indiranagar"] [data-tour="notice-came"]').first().click();
  await act(page, "Record the presentation");
  await on(page, /Fill the example entry/);
  await page.getByRole("button", { name: "Save presentation" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  await act(page, "Prescribe the course");
  await on(page, /Fill the example prescription/);
  await page.getByRole("button", { name: "Save prescription" }).click();
  await page.getByRole("dialog").locator("input[type=checkbox]").check();
  await page.getByRole("dialog").getByRole("button", { name: "Save prescription" }).click();
  await expect(page.locator('ul[aria-label="Doses"] li')).toHaveCount(4, { timeout: 30_000 });
  await act(page, "The animal team is asked");
  await expect(page.locator('[data-tour="exposure-handoff"]')).toContainText("Animal Care Trust");
  await on(page, /Next action/);
  await act(page, "Vaccine, immunoglobulin and wound washing");
  await on(page, /Next role: Animal health/);

  /* 3 · Animal health: accept the request, find the dog, read its history, link it. */
  await act(page, "The hospital's request arrives");
  await page.locator('[data-tour="request"][data-area="Indiranagar"][data-status="open"] [data-tour="request-accept"]').first().click();
  await act(page, "Find the dog on the register");
  await on(page, /Take me there/);
  await page.locator("main button, main a", { hasText: "Simba" }).first().click();
  await page.getByRole("link", { name: /Open full record/ }).first().click();
  await act(page, "Its vaccination and ABC history");
  await expect(page.locator("main")).toContainText("Vaccination");
  await on(page, /Next action/);
  await act(page, "Link the dog to the request");
  await page.locator('[data-tour="request"][data-area="Indiranagar"][data-status="accepted"] [data-tour="request-link"]').first().click();
  await page.getByRole("dialog").locator("label", { hasText: "Simba" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Link the animal" }).click();
  await act(page, "Reports on WhatsApp");
  await expect(page.locator('[data-tour="request"][data-area="Indiranagar"]').first()).toContainText("animal linked: Simba");
  await on(page, /Next role: Kaju/);

  /* 4 · Kaju: the briefing from records, what is missing, who does what, prepared work confirmed. */
  await act(page, "Ask Kaju about the incident");
  await on(page, /Use the example question/);
  await page.locator('textarea[aria-label="Ask Kaju"]').press("Enter");
  const answer = page.locator('[data-tour="kaju-answer"]', { hasText: "Who does what" });
  await expect(answer).toBeVisible({ timeout: 60_000 });
  for (const w of ["Indiranagar bite", "Simba (IND-112)", "Missing", "does not read patient or dose records"]) await expect(answer).toContainText(w);
  await act(page, "What is missing, and who does what");
  await on(page, /Next action/);
  await act(page, "Approve what Kaju prepared");
  while (await page.locator(".nx-kprop .nx-btn", { hasText: "Confirm" }).count()) { await page.locator(".nx-kprop .nx-btn", { hasText: "Confirm" }).first().click(); await page.waitForTimeout(2000); }
  await act(page, "What Kaju can use");
  await on(page, /Next role: Municipality/);

  /* 5 · Municipality and 6 · One Health: oversight, coverage, the network, suppressed data, the report. */
  for (const t of ["What needs a decision", "The incident, followed up", "Vaccination coverage and gaps", "Reports and exports"]) { await act(page, t); await on(page, /^(Next action|Next role)/); }
  for (const t of ["Where to act", "The care network", "Privacy-protected research data", "Evaluate the pilot"]) { await act(page, t); await on(page, /^(Next action|Finish)/); }
  await expect(page.locator("aside.dt.is-end")).toContainText("One incident becomes a coordinated response");
  await page.locator("aside.dt.is-end").getByRole("button", { name: /Explore freely/ }).click();
  await expect(page.locator(".dt-pill")).toBeVisible();
});
