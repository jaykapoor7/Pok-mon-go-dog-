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
/** The guide's one-click example; the label returns once every field is filled. */
const example = async (page: Page, re: RegExp) => { await on(page, re); await expect(card(page).getByRole("button", { name: re })).toBeEnabled({ timeout: 15_000 }); };

test("one bite, six stages: the guide points at each control, notices each step and hands over to the next role", async ({ page, isMobile }) => {
  test.skip(isMobile, "the recording is made on a desktop");
  await page.addInitScript(() => { for (const k of ["straypaw.notice.storage.v1", "straypaw.analytics.optout"]) localStorage.setItem(k, "1"); });
  await page.goto("/try");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("One Health. One Connected Response.");
  await expect(page.getByRole("list", { name: "The six stages" }).getByRole("listitem")).toHaveCount(6);
  await page.getByRole("button", { name: /Start Demo/ }).click();

  /* 1 · Citizen: the chat. Kaju reads the words, asks the safety question, offers to tell the clinic, asks only
     what is missing, the person confirms, the clinic is told and Kaju shows where to go. */
  await page.waitForURL(/\/bite-help/, { timeout: 90_000 });
  await act(page, "Chat with Kaju, or call");
  await expect(page.locator(".sp-tour-hl")).toBeVisible();
  await example(page, /Use the example words/);
  await page.getByRole("button", { name: "Send to Kaju" }).click();
  const report = page.locator('[data-tour="bite-report"]');
  for (const w of ["A bite", "Dog, street or community", "Indiranagar", "Today (this morning)", "Someone else"]) await expect(report).toContainText(w, { timeout: 20_000 });
  await act(page, "Answer the safety question");
  await page.getByRole("button", { name: "No, none of these" }).click();
  await act(page, "Let Kaju tell the clinic");
  await page.getByRole("button", { name: "Yes, tell the clinic" }).click();
  await act(page, "Add what Kaju asks for");
  await example(page, /Use the example description/);
  await page.getByRole("button", { name: "Send to Kaju" }).click();
  await page.getByRole("button", { name: "No, don't call me" }).click();
  await act(page, "Confirm and send");
  await expect(report).toContainText("the bus stop on 100 Feet Road");
  await page.getByRole("button", { name: "Send the report" }).click();
  await expect(page.locator('[data-tour="bite-sent"]')).toContainText("Sent to", { timeout: 30_000 });
  await expect(page.locator(".kb-centres li.is-first")).toContainText("Expecting you", { timeout: 20_000 });
  await on(page, /Next role: Hospital/);

  /* 2 · Hospital: the notice becomes the bite record; the clinician's category and course; the NGO is asked. */
  await act(page, "The notice is waiting");
  await page.locator('[data-tour="notice"][data-area="Indiranagar"] [data-tour="notice-came"]').first().click();
  await act(page, "Record the presentation");
  await example(page, /Fill the example entry/);
  await page.getByRole("button", { name: "Save presentation" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  await act(page, "Prescribe the course");
  await example(page, /Fill the example prescription/);
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
  /* A new person starts with no open tabs: the hospital's patient record never follows into the NGO's screens. */
  await expect(page.getByRole("navigation", { name: "Open records" })).not.toContainText("OPD-DEMO");
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
  await on(page, /Take me there/);
  await page.waitForURL(/\/ngo\/inbox/, { timeout: 60_000 });
  await on(page, /Next role: Kaju/);

  /* 4 · Kaju: the briefing from records, what is missing, who does what, prepared work confirmed. */
  await act(page, "Ask Kaju about the incident");
  await example(page, /Use the example question/);
  await page.locator('textarea[aria-label="Ask Kaju"]').press("Enter");
  const answer = page.locator('[data-tour="kaju-answer"]', { hasText: "Who does what" });
  await expect(answer).toBeVisible({ timeout: 60_000 });
  for (const w of ["Indiranagar bite", "Simba (IND-112)", "Missing", "does not read patient or dose records"]) await expect(answer).toContainText(w);
  await act(page, "What is missing, and who does what");
  await on(page, /Next action/);
  await act(page, "Approve what Kaju prepared");
  const props = page.locator(".nx-kprop");
  const prepared = await props.count();
  expect(prepared).toBeGreaterThan(0);
  for (let i = 0; i < prepared; i++) {
    await props.nth(i).getByRole("button", { name: "Confirm" }).click();
    await expect(props.nth(i).locator(".nx-kok")).toBeVisible({ timeout: 30_000 });
  }
  await act(page, "What Kaju can use");
  await on(page, /Next role: Municipality/);

  /* 5 · Municipality and 6 · One Health: oversight, coverage, the network, suppressed data, the report. */
  for (const t of ["What needs a decision", "The incident, followed up", "Vaccination coverage and gaps", "Reports and exports"]) { await act(page, t); await on(page, /^(Next action|Next role)/); }
  for (const t of ["Where to act", "The care network", "Privacy-protected research data", "Evaluate the pilot"]) { await act(page, t); await on(page, /^(Next action|Finish)/); }
  await expect(page.locator("aside.dt.is-end")).toContainText("One incident becomes a coordinated response");
  await page.locator("aside.dt.is-end").getByRole("button", { name: /Explore freely/ }).click();
  await expect(page.locator(".dt-pill")).toBeVisible();
});

/* The same citizen stage as a call. The browser's speech recognition and speech synthesis are replaced by stand-ins
   that answer each of Kaju's questions as a person would and record what Kaju says, so the agent's turn-taking is
   tested without a microphone. Then the guide's "Next action" alone must carry an untouched stage to the hospital. */
test("Kaju's call: it says each question aloud, hears the answers, fills the report and sends it", async ({ page }) => {
  await page.addInitScript(() => {
    for (const k of ["straypaw.notice.storage.v1", "straypaw.analytics.optout"]) localStorage.setItem(k, "1");
    const answers: Record<string, string> = { tell: "a person was bitten by a stray dog near Indira Nagar this morning they need medical assistance", danger: "no", notify: "yes please tell them", looks: "brown dog no collar usually near the bus stop on 100 Feet Road", call: "no", review: "yes send it" };
    const w = window as unknown as Record<string, unknown> & { __said: string[] };
    w.__said = [];
    class Rec {
      onresult: ((e: unknown) => void) | null = null; onerror: ((e: unknown) => void) | null = null; onend: (() => void) | null = null;
      start() { const t = answers[document.querySelector(".kb")?.getAttribute("data-at") ?? ""] ?? ""; setTimeout(() => { if (t) this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: t }], { isFinal: true })] }); else this.onerror?.({ error: "no-speech" }); this.onend?.(); }, 400); }
      stop() { /* ends on its own */ } abort() { this.onend?.(); }
    }
    w.SpeechRecognition = Rec; w.webkitSpeechRecognition = Rec;
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u: { text: string; onend?: () => void }) { w.__said.push(u.text); setTimeout(() => u.onend?.(), 60); }, cancel() { /* nothing queued */ }, getVoices: () => [], addEventListener() { /* no voices */ } } });
  });
  await page.context().grantPermissions(["microphone"]).catch(() => undefined);
  await page.goto("/try");
  await page.getByRole("button", { name: /Start Demo/ }).click();
  await page.waitForURL(/\/bite-help/, { timeout: 90_000 });
  await page.locator('[data-tour="mode-call"]').click();
  await page.locator('[data-tour="bite-call"]').click();
  await expect(page.locator(".kv.is-live")).toBeVisible();
  const report = page.locator('[data-tour="bite-report"]');
  await expect(report).toContainText("Indiranagar", { timeout: 30_000 });
  await expect(report).toContainText("the bus stop on 100 Feet Road", { timeout: 30_000 });
  await expect(page.locator(".kb[data-reached~=\"sent\"]")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".kv")).toContainText("Report sent", { timeout: 30_000 });
  const said = (await page.evaluate(() => (window as unknown as { __said: string[] }).__said)).join(" ");
  for (const w of ["wash the wound", "I understood a bite, by a street dog, in Indiranagar, this morning", "One safety question", "What did the animal look like", "Shall I send it", "Sent to"]) expect(said).toContain(w);
  /* The person's own words: none of them is taken for a landmark. */
  await expect(report).not.toContainText("a stray dog near");
});

test("the guide's Next action answers an untouched citizen stage and opens the hospital", async ({ page, isMobile }) => {
  await page.addInitScript(() => { for (const k of ["straypaw.notice.storage.v1", "straypaw.analytics.optout"]) localStorage.setItem(k, "1"); });
  await page.goto("/try");
  await page.getByRole("button", { name: /Start Demo/ }).click();
  await page.waitForURL(/\/bite-help/, { timeout: 90_000 });
  await expect(page.getByRole("button", { name: "Send to Kaju" })).toBeVisible({ timeout: 30_000 });
  /* On a phone the card is a short sheet that never covers the chat's composer. */
  if (isMobile) {
    const sheet = await card(page).boundingBox(), compose = await page.locator('[data-tour="bite-compose"]').boundingBox();
    expect(sheet && sheet.height < page.viewportSize()!.height * 0.5).toBeTruthy();
    expect(compose && sheet && compose.y + compose.height <= sheet.y + 1).toBeTruthy();
  }
  for (const t of ["Chat with Kaju, or call", "Answer the safety question", "Let Kaju tell the clinic", "Add what Kaju asks for", "Confirm and send"]) {
    await act(page, t);
    await card(page).locator(".dt-btn.is-go").click();
  }
  await page.waitForURL(/\/health\/today/, { timeout: 90_000 });
  await act(page, "The notice is waiting");
  await expect(page.locator('[data-tour="notice"][data-area="Indiranagar"]').first()).toBeVisible({ timeout: 30_000 });
});
