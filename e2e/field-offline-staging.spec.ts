import { expect, test, type Request } from "@playwright/test";

/* Scenario 13, end to end in a phone browser against the staging database: a field worker records an animal with no
   signal, the record waits on the phone encrypted, the first send loses the server's answer after the server has saved
   it, and the retry with the same request id is answered from the first save instead of creating a second animal.

   It WRITES one provisional animal ("Offline check") and its case on staging's sample NGO. The app never deletes a
   field intake (its operational event is an audit record), so the rows are cleared afterwards with
   docs/rebuild/sql/STAGING_cleanup_offline_checks.sql. It never runs in the read-only demo suite. Off unless
   E2E_STAGING_WRITES=1, against a build pointed at staging where the sample accounts can sign in:

     E2E_STAGING_WRITES=1 E2E_BASE_URL=http://localhost:3100 npx playwright test e2e/field-offline-staging.spec.ts --project=mobile */
test.skip(process.env.E2E_STAGING_WRITES !== "1", "Writes on staging; needs E2E_STAGING_WRITES=1 and a build pointed at staging");
test.setTimeout(240_000);

const PIN = "246810";
// A 1×1 JPEG: enough for the photo step, the encrypted draft and the upload.
const JPEG = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP////////////////////////////////////////////////////////////////////////////////////8AAAsIAAEAAQEBEQD/xAAUAAEAAAAAAAAAAAAAAAAAAAAD/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAAPwBH/9k=", "base64");

test("an offline intake waits on the phone, survives a lost answer, and is saved once", async ({ page, context }) => {
  const marker = `Automated offline check ${Date.now()} (test record, removed after the run)`;
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 12.9116, longitude: 77.6389, accuracy: 12 });
  await page.addInitScript(() => { for (const k of ["straypaw.notice.storage.v1", "sp.firstday.v1", "sp.firstday.offer.v1", "sp.onboard.done"]) localStorage.setItem(k, "1"); });

  // The One Health field worker is not on /try's list; the sign-in asks for that sample account instead.
  await page.route("**/api/demo/session", (r) => r.continue({ postData: JSON.stringify({ role: "oh-field" }) }));
  await page.goto("/try");
  await page.getByRole("button", { name: /NGO coordinator/ }).first().click();
  await page.waitForURL(/\/ngo\//, { timeout: 90_000 });

  await page.goto("/ngo/field");
  await expect(page.getByRole("heading", { name: "Your round" })).toBeVisible({ timeout: 30_000 });

  // Choose to work offline and set this phone's PIN.
  await page.locator(".nf-net").click();
  await page.getByRole("switch", { name: "Work offline" }).click();
  await page.getByLabel("New PIN").fill(PIN);
  await page.getByLabel("Repeat the PIN").fill(PIN);
  await page.getByRole("button", { name: "Set the PIN" }).click();
  await expect(page.getByRole("heading", { name: "Your round" })).toBeVisible({ timeout: 30_000 });

  // No signal from here on.
  await context.setOffline(true);
  await expect(page.locator(".nf-net")).toContainText(/Offline|No signal/);

  await page.getByRole("button", { name: /Record an animal/ }).click();
  const sheet = page.getByRole("dialog", { name: "Record an animal" });
  await sheet.getByRole("radio", { name: /Vaccinate/ }).click();
  await sheet.locator('input[type="file"]').setInputFiles({ name: "dog.jpg", mimeType: "image/jpeg", buffer: JPEG });
  await sheet.getByRole("button", { name: "Next" }).click();
  await expect(sheet.getByText("Location found")).toBeVisible();
  await sheet.getByLabel("Area or street").fill("HSR Layout, 14th Main");
  await sheet.getByLabel("City").fill("Bengaluru");
  await sheet.getByRole("button", { name: "Next" }).click();
  await sheet.getByLabel("Name or tag, if it has one").fill("Offline check");
  await sheet.getByRole("button", { name: "Next" }).click();
  await sheet.getByLabel("Anything to add? (optional)").fill(marker);
  await expect(sheet.getByText("It is kept on this phone, encrypted, and sent when you choose.")).toBeVisible();
  await sheet.getByRole("button", { name: "Save" }).click();
  await expect(sheet).toBeHidden();

  const phone = page.getByRole("region", { name: "This phone" });
  await expect(phone).toContainText("1 record not sent yet");
  await expect(phone.getByRole("button", { name: /Waiting/ })).toBeDisabled();

  // What sits in the browser's storage is ciphertext, not the words typed.
  const stored = await page.evaluate(() => new Promise<string>((resolve, reject) => {
    const r = indexedDB.open("straypaw-field-v1", 3);
    r.onsuccess = () => { const q = r.result.transaction("drafts").objectStore("drafts").getAll(); q.onsuccess = () => { resolve(JSON.stringify(q.result)); r.result.close(); }; q.onerror = () => reject(q.error); };
    r.onerror = () => reject(r.error);
  }));
  expect(stored).toContain("encrypted");
  expect(stored).not.toContain(marker);
  expect(stored).not.toContain("HSR Layout");

  // The first send reaches the server and is saved there, but its answer is lost on the way back.
  const intakes: { request: string; record?: string; caseId?: string; replayed?: boolean; status: number }[] = [];
  let rpcBase = "", apikey = "";
  await page.route("**/rest/v1/rpc/operations_intake", async (route) => {
    rpcBase = route.request().url().replace(/operations_intake$/, "");
    apikey = (await route.request().allHeaders())["apikey"] ?? "";
    const body = JSON.parse(route.request().postData() ?? "{}") as { p_request?: string };
    const res = await route.fetch();
    const json = await res.json().catch(() => null) as { record_id?: string; case_id?: string; replayed?: boolean } | null;
    const seen = { request: String(body.p_request), record: json?.record_id, caseId: json?.case_id, replayed: json?.replayed };
    if (!intakes.length) {
      intakes.push({ ...seen, status: 503 });
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "The connection dropped before the answer arrived." }) });
      return;
    }
    intakes.push({ ...seen, status: res.status() });
    await route.fulfill({ response: res });
  });

  await context.setOffline(false);
  await expect(page.getByText(/Signal is back\. 1 record waits to be sent\./)).toBeVisible();
  await phone.getByRole("button", { name: "Send it" }).click();

  // The failure is shown on the record itself, with a way to try again; nothing was removed from the phone.
  const draft = phone.locator("details.nf-draft");
  await expect(draft).toHaveAttribute("open", "");
  await expect(draft.locator('.nf-dot[data-s="failed"]')).toHaveCount(1);
  await expect(draft).toContainText("The connection dropped before the answer arrived.");
  await expect(phone).toContainText("1 record not sent yet");

  const sends: Request[] = [];
  page.on("request", (r) => { if (r.url().includes("/rest/v1/rpc/field_confirm_evidence")) sends.push(r); });
  await draft.getByRole("button", { name: "Try again" }).click();
  await expect(phone.getByText(/Sent from this phone · 1/)).toBeVisible({ timeout: 60_000 });
  await expect(phone).not.toContainText("not sent yet");

  // Both sends carried the same request id, and the server answered the second from the first save.
  expect(intakes).toHaveLength(2);
  expect(intakes[1].request).toBe(intakes[0].request);
  expect(intakes[0].record).toBeTruthy();
  expect(intakes[0].replayed).toBe(false);
  expect(intakes[1].record).toBe(intakes[0].record);
  expect(intakes[1].replayed).toBe(true);
  expect(sends).toHaveLength(1);

  // The intake's operational event is an audit record the app never deletes, so the test case stays; its id is noted
  // for the staging clean-up (docs/rebuild/sql/STAGING_cleanup_offline_checks.sql).
  test.info().annotations.push({ type: "staging case", description: String(intakes[0].caseId) });
});
