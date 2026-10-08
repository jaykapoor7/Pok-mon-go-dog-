/* GPU fallback and reporting dry-run. Never submits a report or private write. */
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.BASE || "http://127.0.0.1:3000";
const output = process.env.QA_OUTPUT || "/tmp/straypaw-atlas-result";
await mkdir(output, { recursive: true });
const proxy = process.env.HTTPS_PROXY;
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--enable-unsafe-swiftshader", ...(proxy ? [`--proxy-server=${proxy}`, "--proxy-bypass-list=localhost;127.0.0.1"] : [])] });
const results = [];
try {
  const fallback = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true, reducedMotion: "reduce" });
  await fallback.addInitScript(() => {
    localStorage.setItem("straypaw.notice.storage.v1", "1");
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(kind, ...args) { return /webgl/i.test(kind) ? null : original.call(this, kind, ...args); };
  });
  const page = await fallback.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/map?city=Ranchi");
  await page.locator(".sm-insp-head h2").waitFor({ timeout: 60000 });
  assert(await page.locator(".sm-fallback-map").isVisible());
  await page.locator(".atlas-lenses button").filter({ hasText: "Care" }).click();
  assert.equal(await page.locator(".atlas").getAttribute("data-lens"), "care");
  await page.screenshot({ path: `${output}/gpu-fallback.png` });
  assert.deepEqual(errors, []);
  results.push({ webglUnavailable: "live SVG, city inspector and Lens controls retained", errors });
  await fallback.close();
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, ignoreHTTPSErrors: true, reducedMotion: "reduce" });
    await context.addInitScript(() => localStorage.setItem("straypaw.notice.storage.v1", "1"));
    const p = await context.newPage(), mutations = [];
    await context.route("**/*", (route) => {
      if (/\/api\//.test(route.request().url()) && route.request().method() !== "GET") { mutations.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    const cities = await p.request.get(base + "/api/spatial?kind=cities");
    const { cities: rows } = await cities.json();
    const delhi = rows.find((city) => city.city === "Delhi");
    await p.goto(base + `/report?lat=${delhi.lat}&lng=${delhi.lng}`);
    await p.getByRole("button", { name: "I can't take one", exact: true }).click();
    await p.getByRole("button", { name: "That's right", exact: true }).click();
    await p.getByRole("radio", { name: /Seems fine/ }).click();
    await p.getByRole("radio", { name: /Can't see/ }).click();
    await p.getByRole("heading", { name: "Ready to share" }).waitFor();
    assert((await p.locator(".rq-sum").textContent()).includes("Can't see"));
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    assert.deepEqual(mutations, []);
    await p.screenshot({ path: `${output}/report-review-${width}.png` });
    results.push({ width, reportDryRun: "all five steps and unknown ear status preserved", writes: 0 });
    await context.close();
  }
} finally { await writeFile(`${output}/safety.json`, JSON.stringify(results, null, 2)); await browser.close(); }
console.log(JSON.stringify(results));
