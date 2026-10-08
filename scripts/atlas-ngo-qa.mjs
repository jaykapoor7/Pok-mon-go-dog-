/* Authorized NGO session QA. Credentials remain in environment and ephemeral
   browser memory. Private screenshots must never be committed or published. */
import { chromium, request } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.BASE || "http://127.0.0.1:3000";
const email = process.env.NGO_QA_EMAIL, code = process.env.NGO_QA_CODE;
if (!email || !code) throw new Error("Supply the authorized account through NGO_QA_EMAIL and NGO_QA_CODE.");
const output = "/tmp/straypaw-private-qa";
await mkdir(output, { recursive: true, mode: 0o700 });
const proxy = process.env.HTTPS_PROXY;
const remote = await request.newContext({ ignoreHTTPSErrors: true, ...(proxy ? { proxy: { server: proxy } } : {}) });
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--enable-unsafe-swiftshader", ...(proxy ? [`--proxy-server=${proxy}`, "--proxy-bypass-list=localhost;127.0.0.1"] : [])] });
const results = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce", ignoreHTTPSErrors: true });
  await context.addInitScript(() => { try { localStorage.setItem("straypaw.notice.storage.v1", "1"); localStorage.setItem("straypaw.analytics.optout", "1"); } catch { /* Embedded reference documents can deny browser storage. */ } });
  // Local development has no administrative secret. Only the real sign-in
  // endpoint uses the existing account service; UI and reads remain local.
  await context.route("**/api/join", async (route) => {
    const r = route.request(), headers = { "Content-Type": "application/json" };
    if (r.headers().authorization) headers.Authorization = r.headers().authorization;
    const response = await remote.fetch("https://www.straypaw.org/api/join", { method: r.method(), headers, data: r.postData() });
    await route.fulfill({ status: response.status(), contentType: "application/json", body: await response.body() });
  });
  const page = await context.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/join");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Your six-character code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForURL("**/partner", { timeout: 60000 }).catch(async () => {
    const error = await page.locator("#join-error").textContent().catch(() => "Account service did not complete sign-in.");
    throw new Error(error);
  });
  await page.waitForFunction(() => document.querySelector(".ops-masthead-meta")?.textContent && !document.querySelector(".ops-setup"), { timeout: 60000 });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + "/partner");
    await page.waitForFunction(() => !document.querySelector(".ops-list.is-loading"), { timeout: 60000 });
    await page.waitForTimeout(2000);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    if (width < 760) assert(await page.evaluate(() => [...document.querySelectorAll(".ops-age")].every((age) => {
      const bar = age.querySelector("i"), text = age.querySelector("small");
      return (!bar || bar.getBoundingClientRect().width <= age.getBoundingClientRect().width + 1) && (!text || getComputedStyle(text).whiteSpace === "normal");
    })), "Mobile queue status and waiting bars must fit their column.");
    await page.screenshot({ path: `${output}/operations-${width}.png` });
    await page.goto(base + "/partner/records");
    await page.locator(".rec-inspect").first().waitFor({ timeout: 60000 });
    const rowCount = await page.locator(".rec-row").count();
    await page.locator(".rec-inspect").first().click();
    await page.locator(".rec-inspector").waitFor();
    assert.equal(await page.locator(".rec-inspector-facts > div").count(), 5);
    assert((await page.locator(".rec-inspector-actions a").first().getAttribute("href")).startsWith("/partner/"));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    await page.screenshot({ path: `${output}/record-inspector-${width}.png`, mask: [page.locator(".rec-inspector-detail"), page.locator(".rec-who em")] });
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".rec-inspector").count(), 0);
    await page.goto(base + "/partner/map?mode=cases");
    await page.locator(".sm-insp-head h2").waitFor({ timeout: 60000 });
    assert.equal(await page.locator(".atlas").getAttribute("data-lens"), "cases");
    await page.screenshot({ path: `${output}/field-map-${width}.png` });
    if (process.env.NGO_CASE_QA === "1") {
      await page.goto(base + "/partner/cases");
      await page.locator(".cr-inspect").first().waitFor({ timeout: 60000 });
      await page.screenshot({ path: `${output}/case-desk-${width}.png` });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
      await page.getByRole("button", { name: /^Critical \d+/ }).click();
      await page.locator(".cr-inspect").first().click();
      await page.locator(".cr-inspector").waitFor();
      assert.equal(await page.locator(".cr-inspector-facts > div").count(), 6);
      await page.screenshot({ path: `${output}/case-preview-${width}.png` });
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".cr-inspector").count(), 0);
      const caseHref = await page.locator(".cr-name").first().getAttribute("href");
      await page.goto(base + caseHref);
      await page.locator(".cf-mast h1").waitFor({ timeout: 60000 });
      assert.equal(await page.locator(".cf-sec").count(), 4);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
      await page.getByRole("link", { name: "Next decision", exact: true }).click();
      await page.screenshot({ path: `${output}/case-file-${width}.png`, mask: [page.locator(".cf-prose"), page.locator(".cf-hist-note"), page.locator("textarea"), page.locator("input")] });
      await page.goto(base + "/partner/cases/new");
      await page.locator("#nc-title").waitFor({ timeout: 60000 });
      await page.getByRole("button", { name: "New animal", exact: true }).click();
      assert.equal(await page.getByRole("button", { name: "New animal", exact: true }).getAttribute("aria-pressed"), "true");
      await page.getByRole("button", { name: "Existing animal", exact: true }).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
      await page.screenshot({ path: `${output}/case-intake-${width}.png` });
    }
    if (process.env.NGO_SECONDARY_QA === "1") {
      const secondaryRoutes = process.env.NGO_SECONDARY_ROUTES?.split(",") ?? ["animals", "review", "field", "incoming", "import", "quality", "projects", "reports", "team", "settings", "resources", "operations", "feeding", "drives", "volunteers", "medical", "fundraising", "stories"];
      for (const route of secondaryRoutes) {
        const response = await page.goto(base + `/partner/${route}`);
        await page.waitForFunction(() => !document.querySelector(".animate-spin,.xs-spin,.imp-spin"), { timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(1500);
        assert.equal(response.status(), 200, route);
        if (route === "reports") {
          await page.locator(".ib-period").waitFor({ timeout: 60000 });
          assert.equal(await page.locator(".xs").count(), 1, "NGO analysis must retain its export studio.");
          assert.equal(await page.locator(".atlas,.bsm").count(), 0, "NGO Reports must not be a replacement map dashboard.");
          await page.getByRole("button", { name: "Last 90 days", exact: true }).click();
          assert.equal(await page.getByRole("button", { name: "Last 90 days", exact: true }).getAttribute("aria-pressed"), "true");
          await page.getByRole("button", { name: "All time", exact: true }).click();
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, `Overflow on ${route} at ${width}px`);
        await page.screenshot({ path: `${output}/secondary-${route}-${width}.png` });
        console.log(JSON.stringify({ route, width, status: response.status(), overflow: 0, operationalWrites: 0 }));
      }
    }
    results.push({ width, authorizedSession: true, registerRowsVisible: rowCount, inspector: true, keyboardDismissal: true, scopedMap: true, operationalWrites: 0 });
  }
  assert.deepEqual(errors, []);
  await context.close();
} finally { await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2), { mode: 0o600 }); await browser.close(); await remote.dispose(); }
console.log(JSON.stringify(results));
