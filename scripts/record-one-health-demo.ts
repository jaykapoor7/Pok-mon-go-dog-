/* Records the One Health product demo (/demo/one-health) as a video for grant applications and partners: the demo
   plays by itself from the first step to the last, in a 1920×1080 browser, and the recording is trimmed to start on
   the first step and saved as MP4 (WebM if ffmpeg is not installed). The demo reads no database, so any running
   build will do:

     npm run build && npm run start -- -p 3100
     DEMO_BASE_URL=http://localhost:3100 npm run demo:one-health

   DEMO_FOOTAGE_DIR sets where the file goes (default demo-footage/, which is not committed). */
import { chromium } from "@playwright/test";
import { mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { TOTAL_MS } from "../src/sp/demo/onehealth/story";

const base = (process.env.DEMO_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const out = process.env.DEMO_FOOTAGE_DIR ?? "demo-footage";
const size = { width: 1920, height: 1080 };

async function main() {
  await mkdir(out, { recursive: true });
  const raw = join(out, "raw");
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, recordVideo: { dir: raw, size } });
  /* A recording is a first visit with the site's notices already answered, so nothing covers the story. */
  await context.addInitScript(() => { try { for (const k of ["straypaw.notice.storage.v1", "straypaw.analytics.optout", "straypaw-install-dismissed"]) localStorage.setItem(k, "1"); } catch { /* fine */ } });
  const opened = Date.now();
  const page = await context.newPage();
  await page.goto(`${base}/demo/one-health`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  const lead = Date.now() - opened;
  await page.getByRole("button", { name: /Play the demo/ }).click();
  await page.waitForURL(/#citizen/);
  /* Every step, plus a moment on the closing screen. */
  await page.waitForTimeout(TOTAL_MS + 2500);
  const video = page.video();
  await context.close();
  await browser.close();
  const webm = await video!.path();

  const name = "straypaw-one-health-demo";
  const ff = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  if (ff.status === 0) {
    const mp4 = join(out, `${name}.mp4`);
    const r = spawnSync("ffmpeg", ["-y", "-ss", (lead / 1000).toFixed(2), "-i", webm, "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", mp4], { stdio: "inherit" });
    if (r.status !== 0) throw new Error("ffmpeg could not convert the recording.");
    await rm(raw, { recursive: true, force: true });
    console.log(`Saved ${mp4}`);
  } else {
    const keep = join(out, `${name}.webm`);
    await rename(webm, keep);
    console.log(`Saved ${keep} (install ffmpeg for MP4 and a trimmed start)`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
