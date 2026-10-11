#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════
   Render a StrayPaw reel to an Instagram-ready MP4.

   Adapted from awesome-ai-motion's scripts/render.mjs
   (© 2026 gongnyang, MIT — https://github.com/gongnyang/awesome-ai-motion):
   serve the scene, open it in headless Chromium, seek the timeline frame
   by frame, screenshot each frame, and hand the sequence to ffmpeg. A
   seek-and-capture render is slower than screen recording, but every
   frame lands exactly on time however long a frame takes to draw, so a
   reel never stutters and two renders of one scene are identical.

   usage:
     node scripts/reels/snapshot.mjs                 # refresh the figures
     node scripts/reels/render.mjs atlas             # → scripts/reels/out/atlas.mp4
     node scripts/reels/render.mjs atlas --fps 60 --frames 0-90

   Output: H.264 High, yuv420p, 1080×1920, 30fps (or --fps), +faststart,
   plus <scene>-cover.jpg (the poster frame) for the reel's cover image.
   ════════════════════════════════════════════════════════════════════ */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const scene = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
if (!scene || !fs.existsSync(path.join(HERE, "scenes", `${scene}.html`))) {
  const have = fs.readdirSync(path.join(HERE, "scenes")).filter((f) => f.endsWith(".html")).map((f) => f.replace(/\.html$/, ""));
  console.error(`usage: render.mjs <scene>   scenes: ${have.join(", ")}`);
  process.exit(1);
}
if (!fs.existsSync(path.join(HERE, "data", "snapshot.json"))) {
  console.error("No figures yet: run node scripts/reels/snapshot.mjs first.");
  process.exit(1);
}
const FPS = Number(arg("--fps", 30));
const OUT = path.resolve(arg("--out", path.join(HERE, "out")));

/* Static server: /scenes, /lib, /data, /assets from here; /public/* from the site. */
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const base = url.startsWith("/public/") ? path.join(ROOT, "public") : HERE;
  const file = path.normalize(path.join(base, url.replace(/^\/public\//, "/")));
  if (!file.startsWith(base) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const ff = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });

/* Playwright's own browser if it is installed; otherwise any Chromium the
   machine already has (REEL_CHROME, or a pre-installed Playwright build). */
const findChrome = () => {
  if (process.env.REEL_CHROME) return process.env.REEL_CHROME;
  try { if (fs.existsSync(chromium.executablePath())) return undefined; } catch { /* not installed */ }
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, "/opt/pw-browsers"].filter(Boolean);
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    for (const d of fs.readdirSync(r).filter((n) => n.startsWith("chromium-")).sort().reverse()) {
      for (const bin of ["chrome-linux/chrome", "chrome-linux64/chrome", "chrome-mac/Chromium.app/Contents/MacOS/Chromium"]) {
        const f = path.join(r, d, bin);
        if (fs.existsSync(f)) return f;
      }
    }
  }
  return undefined;
};
const executablePath = findChrome();
const browser = await chromium.launch({ executablePath, args: ["--force-color-profile=srgb", "--font-render-hinting=none"] });
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/scenes/${scene}.html`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  if (errors.length) throw new Error(`scene error: ${errors.join(" | ")}`);
  const { dur, poster } = await page.evaluate(() => ({ dur: window.__dur, poster: window.__poster }));
  const total = Math.round(dur * FPS);
  const [f0, f1] = (arg("--frames", `0-${total - 1}`)).split("-").map(Number);

  const cache = path.join(HERE, ".frames", scene);
  fs.rmSync(cache, { recursive: true, force: true });
  fs.mkdirSync(cache, { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });
  const t0 = Date.now();
  for (let f = f0; f <= f1; f++) {
    await page.evaluate((t) => window.__seek(t), f / FPS);
    await page.screenshot({ path: path.join(cache, `f${String(f - f0).padStart(5, "0")}.png`), type: "png" });
    if (f % FPS === 0) process.stdout.write(`\r${scene}: ${f - f0 + 1}/${f1 - f0 + 1} frames`);
  }
  process.stdout.write("\n");
  await page.evaluate((t) => window.__seek(t), poster);
  await page.screenshot({ path: path.join(OUT, `${scene}-cover.jpg`), type: "jpeg", quality: 92 });
  if (errors.length) throw new Error(`scene error: ${errors.join(" | ")}`);

  const mp4 = path.join(OUT, `${scene}.mp4`);
  ff(["-framerate", String(FPS), "-i", path.join(cache, "f%05d.png"),
    "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-preset", "slow", "-crf", "16",
    "-movflags", "+faststart", "-r", String(FPS), mp4]);
  fs.rmSync(cache, { recursive: true, force: true });
  const kb = Math.round(fs.statSync(mp4).size / 1024);
  console.log(`${scene}: ${f1 - f0 + 1} frames at ${FPS}fps in ${Math.round((Date.now() - t0) / 1000)}s → ${path.relative(ROOT, mp4)} (${kb} KB) + ${scene}-cover.jpg`);
} finally {
  await browser.close();
  server.close();
}
