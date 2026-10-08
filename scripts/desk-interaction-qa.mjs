/* Read-only public workspace QA. No report submission or operational writes. */
import { chromium, request } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.BASE || "http://127.0.0.1:3001";
const output = process.env.QA_OUTPUT || "/tmp/straypaw-desk-interactions";
await mkdir(output, { recursive: true });
const proxy = process.env.HTTPS_PROXY;
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--enable-unsafe-swiftshader", ...(proxy ? [`--proxy-server=${proxy}`, "--proxy-bypass-list=localhost;127.0.0.1"] : [])] });
const results = [];
const remote = process.env.QA_PUBLIC_PROXY === "1" ? await request.newContext({ ignoreHTTPSErrors: true, ...(proxy ? { proxy: { server: proxy } } : {}) }) : null;
const responses = new Map();
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce", ignoreHTTPSErrors: true });
    await context.addInitScript(() => { localStorage.setItem("straypaw.notice.storage.v1", "1"); localStorage.setItem("straypaw.analytics.optout", "1"); });
    if (remote) await context.route("**/api/spatial**", async (intercept) => {
      const url = new URL(intercept.request().url());
      if (intercept.request().method() !== "GET" || url.searchParams.get("scope") === "org") return intercept.continue();
      const key = url.pathname + url.search;
      if (!responses.has(key)) responses.set(key, remote.get(`https://www.straypaw.org${key}`).then(async (r) => ({ status: r.status(), contentType: "application/json", body: await r.body() })));
      await intercept.fulfill(await responses.get(key));
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/municipality?city=Ranchi");
    await page.locator(".sm-insp-head h2").waitFor({ timeout: 60000 });
    await page.evaluate(() => { window.qaMapCanvas = document.querySelector(".maplibregl-canvas"); });
    for (const [name, lens] of [["Recorded care", "care"], ["Case activity", "cases"], ["Evidence quality", "evidence"]]) {
      await page.getByRole("link", { name, exact: true }).click();
      await page.waitForFunction((expected) => document.querySelector(".atlas")?.dataset.lens === expected, lens);
      assert(await page.evaluate(() => window.qaMapCanvas === document.querySelector(".maplibregl-canvas")), "Question changes must keep the map alive.");
      assert.equal(new URL(page.url()).searchParams.get("city"), "Ranchi");
    }
    await page.getByText("Planning limits", { exact: true }).click();
    assert(await page.locator(".mc-protocol details").getAttribute("open") !== null);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    await page.screenshot({ path: `${output}/municipal-questions-${width}.png` });
    await page.goto(base + "/app?city=Delhi");
    assert.equal(await page.locator(".atlas").count(), 0, "Community home must not be replaced by the Atlas.");
    await page.getByRole("dialog").filter({ hasText: "How will you use StrayPaw?" }).waitFor();
    assert.equal(await page.locator(".wc-role").count(), 4);
    await page.getByRole("button", { name: /I want to report or follow street animals/ }).click();
    while (await page.getByRole("button", { name: "Next", exact: true }).count()) await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Begin", exact: true }).click();
    await page.locator(".wc-role").waitFor({ state: "hidden" });
    assert.equal(await page.evaluate(() => localStorage.getItem("straypaw.role")), "individual");
    await page.getByRole("combobox", { name: "Or type a place", exact: true }).fill("Delhi");
    await page.getByRole("option").filter({ hasText: /^Delhi/ }).first().click();
    await page.locator(".cp-journey").waitFor({ timeout: 60000 });
    await page.getByRole("button", { name: "Seen lately", exact: true }).click();
    assert.equal(await page.locator(".cp-tabs button.is-on").getAttribute("aria-pressed"), "true");
    assert((await page.locator(".cp-journey a").first().getAttribute("href")).includes("city=Delhi"));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    await page.waitForFunction(() => !document.querySelector(".cp-register")?.textContent.includes("Reading the patch"), { timeout: 60000 });
    await page.waitForTimeout(1500);
    assert(await page.locator(".cp-home-map").isVisible(), "Community geography must be visible without a disclosure.");
    await page.locator(".cp-home-map").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    const mapHeight = await page.locator(".cp-home-map .lm").evaluate((e) => e.getBoundingClientRect().height);
    assert(mapHeight <= (width < 700 ? 220 : 320), "Home map must stay compact, not consume the page.");
    assert.equal(await page.locator(".spa-search-key").count(), 0, "No decorative shortcut badge.");
    await page.locator(".cp-home-map").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/community-patch-${width}.png` });
    await page.goto(base + "/resources");
    assert.equal(await page.locator(".rd-contact[href^='tel:']").count(), 6);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    await page.goto(base + "/insights?city=Coimbatore");
    await page.locator(".ib-period").waitFor({ timeout: 60000 });
    assert.equal(await page.locator(".atlas").count(), 0, "Insights must retain its analytical brief.");
    await page.getByRole("button", { name: "Last 90 days", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "Last 90 days", exact: true }).getAttribute("aria-pressed"), "true");
    assert.equal(new URL(page.url()).searchParams.get("p"), "90d");
    await page.getByRole("button", { name: "All time", exact: true }).click();
    assert(await page.locator(".ib-q").count() > 0, "The actual insight findings must remain accessible.");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    await page.screenshot({ path: `${output}/restored-insights-${width}.png` });
    results.push({ width, municipalQuestions: 3, mapRetained: true, communityPlaceSelection: true, firstVisitRoleChoice: true, insightsBrief: true, periodFilters: true, lenses: true, referenceActions: true, errors });
    assert.deepEqual(errors, []);
    await context.close();
  }
} finally { await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2)); await browser.close(); await remote?.dispose(); }
console.log(JSON.stringify(results));
