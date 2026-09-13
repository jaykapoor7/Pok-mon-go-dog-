/* Clean source footage only. The partner workspace is local, fixture-backed
   and cannot touch production. Public/community footage stays on the live UI. */
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const out = process.env.DEMO_FOOTAGE_DIR ?? "demo-footage";
const publicUrl = (process.env.PUBLIC_BASE_URL ?? "https://www.straypaw.org").replace(/\/$/, "");
const pause = (page: Page, ms = 1400) => page.waitForTimeout(ms);
let browser: Browser;
let localApp: ChildProcess | undefined;

async function startLocalDemo(): Promise<string> {
  const existing = process.env.DEMO_BASE_URL?.trim();
  if (existing) return existing.replace(/\/$/, "");

  const port = Number(process.env.DEMO_PORT ?? 3101);
  const demoUrl = `http://127.0.0.1:${port}`;
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  localApp = spawn(npm, ["run", "dev", "--", "--hostname", "127.0.0.1", "-p", String(port)], {
    env: { ...process.env, NEXT_PUBLIC_DEMO_RECORDING: "true" },
    stdio: "inherit",
  });

  for (let i = 0; i < 90; i++) {
    try {
      const response = await fetch(`${demoUrl}/partner`);
      if (response.ok) return demoUrl;
    } catch { /* Next is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error("The local recording demo did not start within 90 seconds.");
}

async function context(mobile = false) {
  return browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
    /* Keep every deliverable on a 1920×1080 video canvas. The mobile flow
       still has a true phone viewport inside that deliverable. */
    recordVideo: { dir: out, size: { width: 1920, height: 1080 } },
  });
}

async function click(page: Page, name: RegExp | string) {
  const el = page.getByRole("link", { name }).or(page.getByRole("button", { name })).first();
  if (await el.isVisible().catch(() => false)) {
    await el.click();
    await pause(page);
    return true;
  }
  return false;
}

async function still(page: Page, name: string) {
  await page.screenshot({ path: join(out, `${name}.png`) });
}

async function finish(ctx: BrowserContext, file: string) {
  const page = ctx.pages()[0];
  const video = page.video();
  await ctx.close();
  if (!video) throw new Error(`No video was created for ${file}.`);
  await rename(await video.path(), join(out, `${file}.webm`));
}

async function dismiss(page: Page) {
  await click(page, /got it|dismiss|skip for now|close/i);
}

async function desktop(file: string, flow: (page: Page) => Promise<void>) {
  const ctx = await context();
  const page = await ctx.newPage();
  await flow(page);
  await finish(ctx, file);
}

await mkdir(out, { recursive: true });
const demoUrl = await startLocalDemo();
browser = await chromium.launch({ headless: true });

try {
  await desktop("01_full_walkthrough", async (page) => {
    await page.goto(publicUrl, { waitUntil: "networkidle" });
    await dismiss(page); await pause(page, 1800); await still(page, "01_landing");
    await click(page, /open app/i); await page.mouse.wheel(0, 700); await pause(page, 1400); await still(page, "02_community");
    await click(page, /^map$/i); await pause(page, 1800); await still(page, "03_map");
    await click(page, /recent activity/i); await pause(page, 1500); await still(page, "04_feed");
    await click(page, /pinky|dog near/i); await pause(page, 1600); await still(page, "05_dog_profile");
    await click(page, /report/i); await pause(page, 1500);
  });

  await desktop("02_report_animal", async (page) => {
    await page.goto(`${publicUrl}/report`, { waitUntil: "networkidle" });
    await dismiss(page); await pause(page, 1800); await still(page, "06_report_start");
    await page.mouse.wheel(0, 760); await pause(page, 1500); await still(page, "07_report_details");
  });

  await desktop("03_dog_profile", async (page) => {
    await page.goto(`${publicUrl}/feed`, { waitUntil: "networkidle" });
    await dismiss(page); await pause(page, 1200); await click(page, /pinky|dog near/i);
    await pause(page, 1500); await still(page, "08_profile_overview");
    await page.mouse.wheel(0, 760); await pause(page, 1500); await still(page, "09_profile_history");
  });

  await desktop("04_community_dashboard", async (page) => {
    await page.goto(`${publicUrl}/app`, { waitUntil: "networkidle" });
    await dismiss(page); await pause(page, 1800); await still(page, "10_community_dashboard");
    await click(page, /open the map|map/i); await pause(page, 1500);
  });

  await desktop("05_ngo_dashboard", async (page) => {
    await page.goto(`${demoUrl}/partner`, { waitUntil: "networkidle" });
    await pause(page, 2200); await still(page, "11_ngo_dashboard");
    await click(page, /view all|open case queue|cases/i); await pause(page, 1500); await still(page, "12_ngo_cases");
    await click(page, /^map$/i); await pause(page, 1800); await click(page, /^urgent$/i); await pause(page, 1400);
  });

  const mobile = await context(true);
  const page = await mobile.newPage();
  await page.goto(`${publicUrl}/app`, { waitUntil: "networkidle" });
  await dismiss(page); await pause(page, 1800);
  await click(page, /report/i); await pause(page, 1500);
  await finish(mobile, "06_mobile_walkthrough");
} finally {
  await browser.close();
  localApp?.kill("SIGTERM");
}
