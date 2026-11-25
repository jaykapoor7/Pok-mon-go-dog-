/* Puts takes where Remotion can serve them: public/takes/<take>/{raw.mp4, log.json, voice files}.
   Looks in launch-kaju/takes/, in sample-takes/, and in any folders listed in KAJU_TAKES (":"-separated).
   Files are hard-linked (copied when that is not possible, or with --copy), so nothing large is duplicated and
   nothing under public/takes is tracked. The frames/ folder of a take is left behind: only raw.mp4 is needed.
   log.json is rewritten with the length of every voice file (ffprobe), which the edit needs for ducking and subtitles. */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const copy = process.argv.includes("--copy");
const sources = [path.join(ROOT, "sample-takes"), path.resolve(ROOT, "../takes"), ...(process.env.KAJU_TAKES ?? "").split(":").filter(Boolean).map((p) => path.resolve(p))];
const dest = path.join(ROOT, "public/takes");
const probe = (file, entries) => execFileSync("ffprobe", ["-v", "error", ...entries, "-of", "default=nw=1:nk=1", file]).toString().trim();
const place = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true }); fs.rmSync(to, { force: true });
  if (!copy) try { fs.linkSync(from, to); return; } catch { /* another filesystem: copy */ }
  fs.copyFileSync(from, to);
};

/* The music beds and sound effects are generated, not downloaded. The beds are large, so they are not tracked: make them when they are missing. */
if (![40, 50, 60].every((l) => fs.existsSync(path.join(ROOT, `public/music/kaju-${l}s.wav`)))) { console.log("making the music beds…"); execFileSync("python3", ["make_kaju_music.py"], { cwd: ROOT, stdio: "inherit" }); }
if (!fs.existsSync(path.join(ROOT, "public/sfx/click.wav"))) execFileSync("python3", ["make_sfx.py"], { cwd: ROOT, stdio: "inherit" });

let n = 0; const seen = new Set();
for (const dir of sources) {
  if (!fs.existsSync(dir)) continue;
  for (const take of fs.readdirSync(dir)) {
    const src = path.join(dir, take);
    if (!fs.existsSync(path.join(src, "log.json")) || !fs.existsSync(path.join(src, "raw.mp4"))) continue;
    if (seen.has(take)) console.warn(`! take "${take}" exists in more than one place; using ${src}`);
    seen.add(take);
    const out = path.join(dest, take); fs.rmSync(out, { recursive: true, force: true });
    place(path.join(src, "raw.mp4"), path.join(out, "raw.mp4"));
    const log = JSON.parse(fs.readFileSync(path.join(src, "log.json"), "utf8"));
    delete log.frames;                                    // not needed by the edit, and it is most of the file
    for (const a of log.audio ?? []) {
      const f = path.join(src, a.file);
      if (!fs.existsSync(f)) { console.error(`✗ ${take}: voice file ${a.file} is in log.json but not on disk`); process.exitCode = 1; continue; }
      place(f, path.join(out, a.file));
      if (!(a.duration > 0)) a.duration = +(+probe(f, ["-show_entries", "format=duration"])).toFixed(3);
    }
    fs.writeFileSync(path.join(out, "log.json"), JSON.stringify(log));
    const [w, h, rate] = probe(path.join(src, "raw.mp4"), ["-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate"]).split("\n");
    if (rate !== "30/1") console.warn(`! ${take}: raw.mp4 is ${rate} fps; the films are cut at 30`);
    console.log(`✓ ${take}  ${w}x${h}  ${log.duration}s  ${log.clicks.length} clicks  ${(log.audio ?? []).length} voice files`);
    n++;
  }
}
/* Takes that no longer exist at the source are removed, so public/takes mirrors the sources. */
if (fs.existsSync(dest)) for (const d of fs.readdirSync(dest)) if (!seen.has(d)) fs.rmSync(path.join(dest, d), { recursive: true, force: true });
if (!n) console.warn("No takes found. Put <take>/raw.mp4 and <take>/log.json under launch-kaju/takes/.");
