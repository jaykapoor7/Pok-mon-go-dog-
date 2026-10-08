/* Read-only browser regression against the actual Atlas and live public data. */
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.BASE || "http://127.0.0.1:3000";
const output = process.env.QA_OUTPUT || "/tmp/straypaw-atlas-result";
const proxy = process.env.HTTPS_PROXY;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--enable-unsafe-swiftshader", ...(proxy ? [`--proxy-server=${proxy}`, "--proxy-bypass-list=localhost;127.0.0.1"] : [])] });
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce", ignoreHTTPSErrors: true });
    await context.addInitScript(() => { localStorage.setItem("straypaw.notice.storage.v1", "1"); localStorage.setItem("straypaw.analytics.optout", "1"); localStorage.setItem("straypaw.tour.v2", "1"); });
    const page = await context.newPage();
    const errors = [], requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => { if (r.url().includes("/api/spatial")) requests.push(r.url()); });
    await page.goto(base + "/map");
    await page.waitForFunction(() => document.querySelectorAll(".atlas-directory li").length > 0);
    assert(!requests.some((url) => url.includes("kind=dataset")), "India must not preload a rich city dataset");
    const photo = page.locator(".atlas-encounter");
    await photo.waitFor({ timeout: 60000 });
    const profile = await photo.getAttribute("href");
    if (width < 700) await page.locator(".atlas-mobile-toggle").click();
    await page.locator(".atlas-directory button").filter({ hasText: "Coimbatore" }).click();
    await page.waitForFunction(() => document.querySelector(".sm-insp-head h2")?.textContent?.includes("Coimbatore"), { timeout: 60000 });
    await page.waitForFunction(() => Number(document.querySelector(".sm-scale")?.dataset.zoom) > 7);
    const zoomBefore = Number(await page.locator(".sm-scale").getAttribute("data-zoom"));
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.waitForFunction((z) => Number(document.querySelector(".sm-scale")?.dataset.zoom) > z + .5, zoomBefore);
    await page.getByRole("button", { name: "Zoom out", exact: true }).click();
    await page.waitForFunction((z) => Math.abs(Number(document.querySelector(".sm-scale")?.dataset.zoom) - z) < .1, zoomBefore);
    for (const lens of ["Care", "Cases", "Evidence", "Animals"]) {
      await page.locator(".atlas-lenses button").filter({ hasText: lens }).click();
      assert.equal(await page.locator(".atlas").getAttribute("data-lens"), lens.toLowerCase());
      assert.equal(await page.locator(".atlas-lenses button[aria-pressed=true]").count(), 1);
    }
    await page.locator(".atlas-lenses button").filter({ hasText: "Care" }).click();
    await page.getByLabel("Map representation", { exact: true }).selectOption("arv");
    assert.equal(await page.getByLabel("Map representation", { exact: true }).inputValue(), "arv");
    if (width < 700) {
      await page.locator(".sm-sheet-grip").click();
      assert(await page.locator(".sm-sheet").evaluate((e) => e.classList.contains("is-open")));
      assert(await page.locator(".atlas-readout").isVisible());
    }
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    await page.getByRole("dialog", { name: "Filters" }).waitFor();
    await page.getByRole("button", { name: "Close filters" }).click();
    // Clear is an explicit national return, not a hard page reload.
    await page.getByRole("button", { name: "Clear city", exact: true }).click();
    await page.locator(".atlas-india .atlas-register").waitFor();
    await page.goBack();
    await page.waitForFunction(() => document.querySelector(".sm-insp-head h2")?.textContent?.includes("Coimbatore"), { timeout: 60000 });
    const search = page.locator(".sm-city-ss input");
    await search.fill("Jamshedpur");
    await search.press("Enter");
    await page.waitForFunction(() => document.querySelector(".sm-insp-head h2")?.textContent?.includes("Jamshedpur"), { timeout: 60000 });
    await page.screenshot({ path: `${output}/interaction-jamshedpur-${width}.png` });
    const cellResponse = await page.request.get(base + "/api/spatial?kind=cells&city=Delhi");
    assert(cellResponse.ok());
    const cellData = await cellResponse.json();
    const cell = cellData.cells[0].h3_r8;
    await page.goto(base + `/map?city=Delhi&cell=${cell}`);
    await page.locator(".sm-insp-head h2").waitFor();
    const canvas = page.locator(".maplibregl-canvas");
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -1200);
    await page.locator(".sm-pin").first().waitFor({ timeout: 30000 });
    const pins = page.locator(".sm-pin");
    let clicked = false;
    for (let i = 0; i < await pins.count(); i++) {
      const pin = pins.nth(i);
      const reachable = await pin.evaluate((e) => { const r = e.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2; return x > 0 && x < innerWidth && y > 0 && y < innerHeight && document.elementFromPoint(x, y)?.closest(".sm-pin") === e; });
      if (reachable) { await pin.click(); clicked = true; break; }
    }
    assert(clicked, "A real animal marker must be reachable on the exposed map");
    await page.locator(".sm-card").waitFor();
    assert((await page.locator(".sm-card-go").getAttribute("href")).startsWith("/dog/"));
    assert((await page.locator(".atlas-preview-note").textContent()).includes("cell"));
    await page.screenshot({ path: `${output}/animal-preview-${width}.png` });
    await page.goto(base + profile);
    await page.locator(".lr-hero h1").waitFor({ timeout: 60000 });
    await page.waitForFunction(() => [...document.querySelectorAll(".lr-documentary-photo img")].every((img) => img.complete), { timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${output}/animal-${width}.png`, fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    assert.deepEqual(errors, []);
    results.push({ width, profile, errors, nationalRichPrefetch: false, zoomButtons: true, lenses: 4, cityTransition: true, backNavigation: true, cellToAnimalPreview: true, mobileSheet: width < 700 });
    console.log(JSON.stringify(results.at(-1)));
    await context.close();
  }
} finally { await writeFile(`${output}/interactions.json`, JSON.stringify(results, null, 2)); await browser.close(); }
