import { chromium } from "@playwright/test";
import { asMember } from "./harness.mjs";
const [OUT, NAME, ROUTE] = process.argv.slice(2); const BASE = process.env.BASE ?? "http://localhost:3001";
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
for (const width of (process.env.W ?? "1440,390").split(",").map(Number)) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 900 }, reducedMotion: "reduce" });
  const { writes } = await asMember(ctx);
  const page = await ctx.newPage(); const errs = []; page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 300)));
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: "networkidle", timeout: 120000 }); await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/${NAME}-${width}.png`, fullPage: !!process.env.FULL });
  if (process.env.CLICK) { await page.locator(process.env.CLICK).first().click(); await page.waitForTimeout(1500); await page.screenshot({ path: `${OUT}/${NAME}-${width}-b.png`, fullPage: !!process.env.FULL }); }
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(NAME, width, "overflow", ov, "errors", errs.slice(0, 3), "writes", writes.map((w) => w.fn));
  await ctx.close();
}
await browser.close();
