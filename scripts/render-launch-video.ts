import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const footage = resolve(root, "demo-footage");
const out = resolve(root, "launch-video");
const frames = resolve(out, "frames");
const fps = 30;

const shell = "#f3ede4";
const ink = "#0b1e3d";
const flame = "#f05b40";
const blue = "#2457ce";

type Card = {
  file: string;
  eyebrow?: string;
  lines: string[];
  accent?: "flame" | "blue" | "none";
  end?: boolean;
};

const cards: Card[] = [
  { file: "00-open.png", lines: ["Every stray animal."], accent: "flame" },
  { file: "02-record.png", eyebrow: "ONE ANIMAL", lines: ["One animal becomes", "a record."], accent: "blue" },
  { file: "04-place.png", eyebrow: "ONE RECORD", lines: ["A record becomes", "a place."], accent: "flame" },
  { file: "06-connected.png", eyebrow: "FIELD WORK", lines: ["Field work stays", "connected."], accent: "blue" },
  { file: "08-city.png", eyebrow: "ONE CITY", lines: ["Local records become", "city coverage."], accent: "flame" },
  { file: "10-end.png", lines: ["Every stray animal.", "Seen. Tracked. Cared for."], accent: "none", end: true },
];

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function makeCards() {
  await mkdir(frames, { recursive: true });
  const iconPath = resolve(root, "public", "icon.png");
  let icon = "";
  try {
    const buf = await readFile(iconPath);
    icon = `data:image/png;base64,${buf.toString("base64")}`;
  } catch {}

  const browser = await chromium.launch({ headless: true });
  try {
    for (const card of cards) {
      const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
      const accent = card.accent === "blue" ? blue : card.accent === "flame" ? flame : ink;
      const title = card.lines.map((l) => `<div>${esc(l)}</div>`).join("");
      const logo = card.end
        ? `<div class="brand">${icon ? `<img src="${icon}" alt="">` : ""}<span>StrayPaw</span></div>`
        : "";
      await page.setContent(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap');
  *{box-sizing:border-box}
  html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${shell}}
  body{font-family:"DM Sans",Arial,sans-serif;color:${ink}}
  .frame{position:relative;width:1920px;height:1080px;padding:92px 104px;display:flex;align-items:center}
  .rule{position:absolute;left:104px;top:92px;width:72px;height:7px;border-radius:999px;background:${accent}}
  .eyebrow{position:absolute;left:104px;top:128px;font-size:22px;font-weight:600;letter-spacing:.18em}
  .copy{font-family:"Instrument Serif",Georgia,serif;font-size:${card.end ? 112 : 136}px;line-height:.94;letter-spacing:-.035em;max-width:1500px}
  .copy div+div{margin-top:12px}
  .brand{position:absolute;left:104px;bottom:86px;display:flex;align-items:center;gap:18px;font-weight:600;font-size:30px;letter-spacing:-.02em}
  .brand img{width:48px;height:48px;border-radius:13px}
  .index{position:absolute;right:104px;bottom:88px;font-size:17px;letter-spacing:.12em;opacity:.55}
</style>
</head>
<body>
  <main class="frame">
    <div class="rule"></div>
    ${card.eyebrow ? `<div class="eyebrow">${esc(card.eyebrow)}</div>` : ""}
    <div class="copy">${title}</div>
    ${logo}
    <div class="index">STRAYPAW / FIELD RECORDS</div>
  </main>
</body>
</html>`, { waitUntil: "networkidle" });
      await page.evaluate(() => (document as any).fonts?.ready);
      await page.screenshot({ path: resolve(frames, card.file) });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

const scenes = [
  { path: resolve(frames, "00-open.png"), seconds: 2.25, zoom: 1.015 },
  { path: resolve(footage, "08_profile_overview.png"), seconds: 3.25, zoom: 1.045 },
  { path: resolve(frames, "02-record.png"), seconds: 1.70, zoom: 1.012 },
  { path: resolve(footage, "03_map.png"), seconds: 3.10, zoom: 1.05 },
  { path: resolve(frames, "04-place.png"), seconds: 1.55, zoom: 1.012 },
  { path: resolve(footage, "11_ngo_dashboard.png"), seconds: 3.25, zoom: 1.04 },
  { path: resolve(frames, "06-connected.png"), seconds: 1.55, zoom: 1.012 },
  { path: resolve(footage, "10_community_dashboard.png"), seconds: 3.15, zoom: 1.045 },
  { path: resolve(frames, "08-city.png"), seconds: 1.55, zoom: 1.012 },
  { path: resolve(footage, "01_landing.png"), seconds: 3.00, zoom: 1.035 },
  { path: resolve(frames, "10-end.png"), seconds: 3.20, zoom: 1.012 },
];

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolvePromise() : reject(new Error(`${cmd} exited ${code}`)));
  });
}

async function render() {
  await mkdir(out, { recursive: true });
  const args: string[] = ["-y"];
  for (const scene of scenes) {
    args.push("-loop", "1", "-t", String(scene.seconds), "-i", scene.path);
  }

  const transition = 0.48;
  const filters: string[] = [];
  scenes.forEach((scene, i) => {
    const d = Math.max(1, Math.round(scene.seconds * fps));
    const inc = ((scene.zoom - 1) / d).toFixed(7);
    filters.push(
      `[${i}:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,` +
      `zoompan=z='min(zoom+${inc},${scene.zoom})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${d}:s=1920x1080:fps=${fps},` +
      `setsar=1,format=yuv420p[v${i}]`
    );
  });

  let cumulative = scenes[0].seconds;
  let prev = "v0";
  for (let i = 1; i < scenes.length; i++) {
    const next = `x${i}`;
    const offset = cumulative - transition * i;
    filters.push(`[${prev}][v${i}]xfade=transition=fade:duration=${transition}:offset=${offset.toFixed(3)}[${next}]`);
    prev = next;
    cumulative += scenes[i].seconds;
  }

  const visualDuration = scenes.reduce((a, b) => a + b.seconds, 0) - transition * (scenes.length - 1);

  // A deliberately understated tonal bed. It is generated locally, has no
  // licensing dependency, and stays quiet enough to leave room for a later VO.
  args.push(
    "-f", "lavfi", "-t", visualDuration.toFixed(3), "-i",
    "sine=frequency=110:sample_rate=48000,volume=0.018",
    "-f", "lavfi", "-t", visualDturation.toFixed(3), "-i",
    "sine=frequency=220:sample_rate=48000,volume=0.008"
   );

  const a0 = scenes.length;
  const a1 = scenes.length + 1;
  filters.push(`[${a0}:a][${a1}:a]amix=inputs=2:normalize=0,afade=t=in:st=0:d=1.4,afade=t=out:st=${Math.max(0, visualDuration - 1.8).toFixed(3)}:d=1.8[aout]`);

  args.push(
    "-filter_complex", filters.join(";"),
    "-map", `[${prev}]`, "-map", "[aout]",
    "-c:v", "libx264", "-preset", "slow", "-crf", "17",
    "-pix_fmt", "yuv420p", "-r", String(fps),
    "-c:a", "aac", "-b:a", "160k",
    "-movflags", "+faststart",
    "-shortest",
    resolve(out, "straypaw-launch-v1.mp4")
  );

  await run("ffmpeg", args);
}

async function main() {
  await makeCards();
  await render();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
