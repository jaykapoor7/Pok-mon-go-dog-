/* npm run render <slug> [<slug>…]     both ratios of one or more films  →  out/<slug>-16x9.mp4, out/<slug>-9x16.mp4
   npm run render:all                  every edit in edits/
   Options: --only=16x9 | --only=9x16,  --draft (half size, fast, for checking a cut)

            --lufs=-16 (programme loudness to master to; --lufs=off leaves the mix as it is)

   H.264 High, yuv420p, CRF 16, 30 fps, AAC 320 kb/s, +faststart. The picture is encoded once by Remotion with
   uncompressed sound; ffmpeg then copies the picture and masters the sound: one fixed gain to bring the film to the
   target loudness (never more than +9 / -6 dB), then a look-ahead limiter at -1.5 dBFS, so the master never reaches
   -1 dBFS whatever the voice files are like, then AAC. */
import { renderMedia, selectComposition, getCompositions } from "@remotion/renderer";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { OUT, browser, idOf, makeBundle, prepare } from "./common.mjs";

const args = process.argv.slice(2), flags = args.filter((a) => a.startsWith("--")), slugs = args.filter((a) => !a.startsWith("--"));
const lufsArg = flags.find((f) => f.startsWith("--lufs="))?.slice(7), LUFS = lufsArg === "off" ? null : Number(lufsArg ?? -16);
const only = flags.find((f) => f.startsWith("--only="))?.slice(7), draft = flags.includes("--draft"), all = flags.includes("--all");
if (!all && !slugs.length) { console.error("Which film?  npm run render <slug>   (or: npm run render:all)"); process.exit(1); }

prepare();
fs.mkdirSync(path.join(OUT, ".tmp"), { recursive: true });
const serveUrl = await makeBundle();
const comps = await getCompositions(serveUrl, { ...browser });
const films = comps.filter((c) => /-(16x9|9x16)$/.test(c.id) && !c.id.startsWith("Thumb-"));
const wanted = films.filter((c) => (all || slugs.some((s) => c.id.startsWith(idOf(s) + "-"))) && (!only || c.id.endsWith(only)));
for (const s of slugs) if (!films.some((c) => c.id.startsWith(idOf(s) + "-"))) { console.error(`No edit with slug "${s}". Films: ${[...new Set(films.map((c) => c.defaultProps.edit.slug))].join(", ")}`); process.exit(1); }

for (const c of wanted) {
  const slug = c.defaultProps.edit.slug, ratio = c.id.slice(-4), name = `${slug}-${ratio}${draft ? "-draft" : ""}`;
  const tmp = path.join(OUT, ".tmp", `${name}.mkv`), out = path.join(OUT, `${name}.mp4`);
  const composition = await selectComposition({ serveUrl, id: c.id, ...browser });
  const t = Date.now(); let last = 0;
  await renderMedia({
    composition, serveUrl, outputLocation: tmp, ...browser,
    codec: "h264", crf: draft ? 24 : 16, pixelFormat: "yuv420p", colorSpace: "bt709", x264Preset: draft ? "veryfast" : "slow",
    imageFormat: "jpeg", jpegQuality: 96, audioCodec: "pcm-16", scale: draft ? 0.5 : 1, concurrency: 4, overwrite: true,
    onProgress: ({ progress }) => { const p = Math.floor(progress * 10); if (p > last) { last = p; process.stdout.write(`\r${name}  ${p * 10}%`); } },
  });
  let gain = 0;
  if (LUFS !== null) {
    const m = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", tmp, "-vn", "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }).stderr.match(/Integrated loudness:\s+I:\s+(-?[\d.]+) LUFS/);
    if (m && +m[1] > -60) gain = Math.min(9, Math.max(-6, LUFS - +m[1]));
  }
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, "-map", "0:v:0", "-map", "0:a:0", "-c:v", "copy",
    "-af", `volume=${gain.toFixed(2)}dB,alimiter=limit=0.84:level=false:attack=4:release=80:asc=true`, "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-movflags", "+faststart", out]);
  fs.rmSync(tmp, { force: true });
  const secs = composition.durationInFrames / composition.fps;
  console.log(`\r${name}.mp4  ${composition.width}x${composition.height}  ${secs.toFixed(1)} s of film  rendered in ${((Date.now() - t) / 1000).toFixed(0)} s  master gain ${gain >= 0 ? "+" : ""}${gain.toFixed(1)} dB  (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
}
fs.rmSync(path.join(OUT, ".tmp"), { recursive: true, force: true });
