/* Clean source footage only. This never writes to the product. */
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

const out = process.env.DEMO_FOOTAGE_DIR ?? "demo-footage";
const publicUrl = (process.env.PUBLIC_BASE_URL ?? "https://www.straypaw.org").replace(/\/$/, "");
const demoUrl = (process.env.DEMO_BASE_URL ?? publicUrl).replace(/\/$/, "");
const state = process.env.DEMO_STORAGE_STATE;
const pause = (page: Page, ms = 1400) => page.waitForTimeout(ms);

async function context(browser: Awaited<ReturnType<typeof chromium.launch>>, mobile = false) {
  return browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
    storageState: !mobile && state ? ".demo-storage-state.json" : undefined,
    recordVideo: { dir: out, size: mobile ? { width: 390, height: 844 } : { width: 1920, height: 1080 } },
  });
}
async function click(page: Page, name: RegExp | string) {
  const el = page.getByRole("link", { name }).or(page.getByRole("button", { name })).first();
  if (await el.isVisible().catch(() => false)) { await el.click(); await pause(page); return true; }
  return false;
}
async function still(page: Page, name: string) { await page.screenshot({ path: join(out, `${name}.png`) }); }
async function finish(ctx: BrowserContext, file: string) {
  const page = ctx.pages()[0]; const video = page.video(); await ctx.close();
  if (video) await rename(await video.path(), join(out, `${file}.webm`));
}
async function dismiss(page: Page) { await click(page, /got it|dismiss|skip for now|close/i); }

async function desktop(file: string, base: string, flow: (p: Page) => Promise<void>) {
  const ctx = await context(browser); const p = await ctx.newPage(); await flow(p); await finish(ctx, file);
}
await mkdir(out, { recursive: true });
if (state) await writeFile(".demo-storage-state.json", Buffer.from(state, "base64"));
const browser = await chromium.launch({ headless: true });
try {
  await desktop("01_full_walkthrough", publicUrl, async p => {
    await p.goto(publicUrl); await dismiss(p); await pause(p, 1800); await still(p, "01_landing");
    await click(p, /open app/i); await p.mouse.wheel(0, 650); await pause(p); await still(p, "02_community-map");
    await click(p, /^map$/i); await click(p, /recent activity/i); await pause(p); await still(p, "03_feed");
    await click(p, /dog near|pinky/i); await pause(p); await still(p, "04_dog-profile"); await click(p, /report/i);
  });
  await desktop("02_report_animal", publicUrl, async p => { await p.goto(`${publicUrl}/report`); await dismiss(p); await pause(p, 1800); await still(p, "05_report-start"); await p.mouse.wheel(0, 700); await pause(p); await still(p, "06_report-details"); });
  await desktop("03_dog_profile", publicUrl, async p => { await p.goto(`${publicUrl}/feed`); await dismiss(p); await click(p, /dog near|pinky/i); await p.mouse.wheel(0, 700); await pause(p); await still(p, "07_profile-care-history"); });
  await desktop("04_community_dashboard", publicUrl, async p => { await p.goto(`${publicUrl}/app`); await dismiss(p); await pause(p, 1800); await still(p, "08_community-dashboard"); await click(p, /open the map|map/i); });
  await desktop("05_ngo_dashboard", demoUrl, async p => { await p.goto(`${demoUrl}/partner`); await dismiss(p); await pause(p, 1800); await still(p, "09_ngo-dashboard"); await click(p, /field work|records/i); await still(p, "10_ngo-records"); await click(p, /^map$/i); await still(p, "11_ngo-map"); });
  const ctx = await context(browser, true); const p = await ctx.newPage(); await p.goto(`${publicUrl}/app`); await dismiss(p); await pause(p, 1600); await still(p, "12_mobile-community"); await click(p, /report/i); await pause(p); await finish(ctx, "06_mobile_walkthrough");
} finally { await browser.close(); }
