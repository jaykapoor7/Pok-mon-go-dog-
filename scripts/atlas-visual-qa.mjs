/* Production-render QA. Optional QA_PUBLIC_PROXY=1 replays read-only public
   production responses through Playwright when the local server has no DB key.
   No synthetic data, write requests, or authenticated endpoints are used. */
import { chromium, request } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.BASE || "http://127.0.0.1:3000";
const output = process.env.QA_OUTPUT || "/tmp/straypaw-atlas-result";
const proxy = process.env.HTTPS_PROXY;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || "/usr/bin/chromium", args: ["--enable-unsafe-swiftshader", ...(proxy ? [`--proxy-server=${proxy}`, "--proxy-bypass-list=localhost;127.0.0.1"] : [])] });
const remote = await request.newContext({ ignoreHTTPSErrors: true, ...(proxy ? { proxy: { server: proxy } } : {}) });
const cache = new Map();
const results = [];
const specs = process.env.QA_ROUTES ? process.env.QA_ROUTES.split("|") : ["/app", "/map?city=Coimbatore", "/map?city=Ranchi", "/map?city=Jamshedpur", "/municipality?city=Coimbatore", "/partner", "/partner/records"];
const widths = (process.env.QA_WIDTHS || "1440,390").split(",").map(Number);
try {
  for (const route of specs) for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 900 }, deviceScaleFactor: 1, reducedMotion: "reduce", ignoreHTTPSErrors: true, hasTouch: width < 700 });
    await context.addInitScript(() => { localStorage.setItem("straypaw.notice.storage.v1", "1"); localStorage.setItem("straypaw.analytics.optout", "1"); localStorage.setItem("straypaw.tour.v2", "1"); });
    if (process.env.QA_PUBLIC_PROXY === "1") await context.route("**/api/spatial**", async (intercept) => {
      const url = new URL(intercept.request().url());
      if (intercept.request().method() !== "GET" || url.searchParams.get("scope") === "org") return intercept.continue();
      const key = url.pathname + url.search;
      if (!cache.has(key)) cache.set(key, remote.get(`https://www.straypaw.org${key}`).then(async (r) => ({ status: r.status(), contentType: "application/json", body: await r.body() })));
      await intercept.fulfill(await cache.get(key));
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const response = await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 90000 });
    if (await page.locator(".atlas").count()) {
      await page.waitForFunction(() => document.querySelectorAll(".atlas-directory li").length > 0 || document.querySelector(".sm-insp-head h2"), { timeout: 60000 }).catch(() => {});
    }
    await page.waitForTimeout(4500);
    const name = route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") + "-" + width;
    await page.screenshot({ path: `${output}/${name}.png` });
    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      canvas: Boolean(document.querySelector(".maplibregl-canvas")),
      title: document.querySelector("h1")?.textContent,
      body: document.body.innerText.slice(0, 1300),
      smallControls: [...document.querySelectorAll(".atlas button")].filter((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width && r.height && s.visibility !== "hidden" && (r.width < 43 || r.height < 43); }).map((e) => ({ text: e.getAttribute("aria-label") || e.textContent, width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height })).slice(0, 20),
    }));
    results.push({ route, width, status: response?.status(), ...metrics, errors, screenshot: `${output}/${name}.png` });
    console.log(JSON.stringify(results.at(-1)));
    await context.close();
  }
} finally { await writeFile(`${output}/report.json`, JSON.stringify(results, null, 2)); await browser.close(); await remote.dispose(); }
