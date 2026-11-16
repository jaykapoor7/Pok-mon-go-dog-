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

test("one bite, six stages: Next alone walks the whole response, and every step really happens", async ({ page, isMobile }) => {
  test.skip(isMobile, "the recording is made on a desktop");
  await page.addInitScript(() => { for (const k of ["straypaw.notice.storage.v1", "straypaw.analytics.optout"]) localStorage.setItem(k, "1"); });
  await page.goto("/try");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("One Health. One Connected Response.");
  await expect(page.getByRole("list", { name: "The six stages" }).getByRole("listitem")).toHaveCount(6);
  await page.getByRole("button", { name: /Start Demo/ }).click();
  const next = async (title: string) => { await act(page, title); await card(page).locator(".dt-btn.is-go:not([disabled])").click(); };

  /* 1 · Citizen: Kaju takes the report and tells the clinic. */
  await page.waitForURL(/\/bite-help/, { timeout: 90_000 });
  await expect(page.locator(".sp-tour-hl")).toBeVisible({ timeout: 30_000 });
  await next("Tell Kaju what happened");
  const report = page.locator('[data-tour="bite-report"]');
  for (const w of ["Indiranagar", "Today (this morning)", "None of the listed signs"]) await expect(report).toContainText(w, { timeout: 30_000 });
  await next("Send it to the clinic");

  /* 2 · Hospital: the notice, the bite record, the course. */
  await act(page, "The clinic is ready");
  await expect(page.locator('[data-tour="notice"][data-area="Indiranagar"]').first()).toBeVisible({ timeout: 30_000 });
  await next("The clinic is ready");
  await next("Record the bite");
  await page.waitForURL(/\/health\/bites\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  await next("Prescribe the course");

  /* 3 · Animal health: the request, Simba, the link, WhatsApp. */
  await act(page, "A request arrives");
  await next("A request arrives");
  await act(page, "Simba's record");
  await page.waitForURL(/\/ngo\/animals\/[0-9a-f-]{36}/, { timeout: 60_000 });
  await expect(page.locator("main")).toContainText("Vaccination");
  await next("Simba's record");
  await next("Link Simba to the bite");
  await act(page, "Reports on WhatsApp");
  await page.waitForURL(/\/ngo\/inbox/, { timeout: 60_000 });
  await card(page).locator(".dt-btn.is-go:not([disabled])").click();

  /* 4 · Kaju: the briefing and the prepared work, confirmed. */
  await next("Ask Kaju");
  const answer = page.locator('[data-tour="kaju-answer"]', { hasText: "Who does what" });
  await expect(answer).toBeVisible({ timeout: 60_000 });
  for (const w of ["Indiranagar bite", "Simba (IND-112)", "Missing"]) await expect(answer).toContainText(w);
  await next("Approve the next steps");

  /* 5 · Municipality and 6 · One Health. */
  for (const t of ["What needs a decision", "Coverage and gaps", "Where to act", "Research-ready data"]) await next(t);
  await expect(page.locator("aside.dt.is-end")).toContainText("One incident becomes a coordinated response", { timeout: 60_000 });
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
    /* A microphone that is there and allowed (the test browser has none). */
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [] }) } });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u: { text: string; onend?: () => void }) { w.__said.push(u.text); setTimeout(() => u.onend?.(), 60); }, cancel() { /* nothing queued */ }, getVoices: () => [], addEventListener() { /* no voices */ } } });
  });
  await page.context().grantPermissions(["microphone"]).catch(() => undefined);
  /* This test is the browser's own speech; the Sarvam path has its own test below. */
  await page.route("**/api/oh/voice*", (r) => r.fulfill({ json: { sarvam: false } }));
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
  for (const w of ["wash the wound", "Got it: a street dog bite in Indiranagar, this morning", "Quick safety check", "What did the dog look like", "Shall I send it?", "knows you're coming"]) expect(said).toContain(w);
  /* The person's own words: none of them is taken for a landmark. */
  await expect(report).not.toContainText("a stray dog near");
});

/* The call through Sarvam: the route is answered by stand-ins (a short clip for Kaju's voice, a caller's words for
   each answer), and the microphone is a tone that speaks for a second and pauses, so the recorder's own pause
   detection ends each answer and the recorded WAV is what is sent. */
test("Kaju's call with Sarvam: one voice, each answer recorded until the caller pauses, the report sent", async ({ page }) => {
  const answers: Record<string, string> = { tell: "A person was bitten by a stray dog near Indiranagar this morning. They need medical help.", danger: "No.", notify: "Yes, please tell them.", looks: "Brown dog, no collar, near the bus stop on 100 Feet Road.", call: "No.", review: "Yes, send it." };
  const spoken: string[] = [], sizes: number[] = [];
  const clip = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=";
  await page.route("**/api/oh/voice*", async (r) => {
    const req = r.request(), op = new URL(req.url()).searchParams.get("op");
    if (req.method() === "GET") return r.fulfill({ json: { sarvam: true } });
    if (op === "hear") {
      sizes.push(req.postDataBuffer()?.length ?? 0);
      const at = await page.locator(".kb").getAttribute("data-at");
      return r.fulfill({ json: { transcript: answers[at ?? ""] ?? "", lang: "en-IN", p: 0.99 } });
    }
    const body = JSON.parse(req.postData() ?? "{}") as { text: string };
    spoken.push(body.text);
    return r.fulfill({ json: { audio: clip, type: "audio/wav", text: body.text } });
  });
  await page.addInitScript(() => {
    for (const k of ["straypaw.notice.storage.v1", "straypaw.analytics.optout"]) localStorage.setItem(k, "1");
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: async () => {
      const ac = new AudioContext(), osc = ac.createOscillator(), gain = ac.createGain(), out = ac.createMediaStreamDestination();
      osc.frequency.value = 220; osc.connect(gain); gain.connect(out); osc.start();
      const talk = () => { const t = ac.currentTime; gain.gain.setValueAtTime(0, t); gain.gain.setValueAtTime(0.5, t + 0.4); gain.gain.setValueAtTime(0, t + 1.6); };
      talk(); setInterval(talk, 3500);
      return out.stream;
    } } });
  });
  await page.goto("/try");
  await page.getByRole("button", { name: /Start Demo/ }).click();
  await page.waitForURL(/\/bite-help/, { timeout: 90_000 });
  await page.locator('[data-tour="mode-call"]').click();
  await expect(page.getByText("Voice by Sarvam AI").first()).toBeVisible({ timeout: 20_000 });
  await page.locator('[data-tour="bite-call"]').click();
  await expect(page.locator(".kb[data-reached~=\"sent\"]")).toBeVisible({ timeout: 120_000 });
  await expect(page.locator(".kv")).toContainText("Report sent", { timeout: 30_000 });
  await expect(page.locator('[data-tour="bite-report"]')).toContainText("the bus stop on 100 Feet Road");
  expect(sizes.length).toBeGreaterThanOrEqual(6);
  for (const n of sizes) expect(n).toBeGreaterThan(8_000); /* real recordings, not empty files */
  const said = spoken.join(" ");
  for (const w of ["Hi, I'm Kaju", "Got it: a street dog bite in Indiranagar", "Quick safety check", "Shall I send it?", "knows you're coming"]) expect(said).toContain(w);
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
  for (const t of ["Tell Kaju what happened", "Send it to the clinic"]) {
    await act(page, t);
    await card(page).locator(".dt-btn.is-go").click();
  }
  await page.waitForURL(/\/health\/today/, { timeout: 90_000 });
  await act(page, "The clinic is ready");
  await expect(page.locator('[data-tour="notice"][data-area="Indiranagar"]').first()).toBeVisible({ timeout: 30_000 });
});
