/* Visual QA helper: screenshots routes at the widths the design skill
   requires, and reports horizontal overflow. Usage:
   node scripts/shoot.mjs <outdir> <baseUrl> <route>[@width] ...
   Widths default to 390 and 1280. */
import { chromium } from "@playwright/test";

const [outDir, base, ...routes] = process.argv.slice(2);
const exe = process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
/* In a sandbox, outbound traffic (map tiles, photos) goes through HTTPS_PROXY;
   the local app is reached directly. */
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const browser = await chromium.launch({
  executablePath: exe,
  args: proxy ? [`--proxy-server=${proxy}`, "--proxy-bypass-list=localhost;127.0.0.1"] : ["--no-proxy-server"],
});
for (const spec of routes) {
  const [route, w] = spec.split("@");
  const widths = w ? w.split(",").map(Number) : [390, 1280];
  for (const width of widths) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 860 }, deviceScaleFactor: 1, reducedMotion: process.env.MOTION === "on" ? "no-preference" : "reduce" });
    /* LS='{"key":"value"}' seeds extra localStorage, e.g. the map's paper ground. */
    await ctx.addInitScript((extra) => { try { localStorage.setItem("straypaw.notice.storage.v1", "1"); localStorage.setItem("straypaw.analytics.optout", "1"); if (!location.search.includes("tour")) localStorage.setItem("straypaw.tour.v2", "1"); for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v); } catch {} }, JSON.parse(process.env.LS || "{}"));
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      await page.goto(base + route, { waitUntil: "networkidle", timeout: 90000 });
    } catch (e) { errors.push("goto: " + e.message.split("\n")[0]); }
    await page.waitForTimeout(Number(process.env.WAIT ?? 1500));
    /* Walk the page once so lazy images and in-view effects load, then return to the top. */
    await page.evaluate(async (sel) => {
      const el = sel ? document.querySelector(sel) : null;
      const step = innerHeight * 0.8;
      const H = el ? el.scrollHeight : document.documentElement.scrollHeight;
      for (let y = 0; y < H; y += step) { if (el) el.scrollTop = y; else scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
      if (el) el.scrollTop = 0; else scrollTo(0, 0);
    }, process.env.SCROLLER || "");
    await page.waitForTimeout(800);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const name = `${route.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home"}-${width}`;
    if (process.env.TILES && process.env.SCROLLER) {
      /* Tiles down a page that scrolls inside an element (the console's main),
         not the document: scroll that element a viewport at a time. */
      const H = await page.evaluate((sel) => document.querySelector(sel)?.scrollHeight ?? 0, process.env.SCROLLER);
      const vh = await page.evaluate((sel) => document.querySelector(sel)?.clientHeight ?? innerHeight, process.env.SCROLLER);
      for (let y = 0, i = 0; y < H && i < Number(process.env.TILES); y += vh - 60, i++) {
        await page.evaluate(([sel, top]) => { const el = document.querySelector(sel); if (el) el.scrollTop = top; }, [process.env.SCROLLER, y]);
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${outDir}/${name}-t${i}.png` });
      }
    } else if (process.env.TILES) {
      /* Full-resolution tiles down the page, for reviewing detail. */
      const H = await page.evaluate(() => document.documentElement.scrollHeight);
      const th = width < 700 ? 844 : 900;
      for (let y = 0, i = 0; y < H && i < Number(process.env.TILES); y += th, i++) {
        await page.screenshot({ path: `${outDir}/${name}-t${i}.png`, fullPage: true, clip: { x: 0, y, width, height: Math.min(th, H - y) } });
      }
    } else {
      await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: process.env.FULL !== "0" });
    }
    console.log(`${name}: overflow=${overflow}${errors.length ? " errors=" + JSON.stringify(errors.slice(0, 3)) : ""}`);
    await ctx.close();
  }
}
await browser.close();
