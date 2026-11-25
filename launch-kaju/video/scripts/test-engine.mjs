/* npm run test:engine
   Proves voice sync and ducking on a synthetic take, without touching any real edit.
   1. Builds dev/takes/rectest-beep (git-ignored): the sample recording plus two "voice" files that are plain sine
      beeps (1 kHz question, 2 kHz answer) logged at known take times, and two marks with boxes.
   2. Renders edits/dev/devtest.ts (16:9), which plays them through a jump cut and a 2x span.
   3. Finds where each beep starts in the finished film and compares it with where the edit says it must be,
      and measures how far the music drops underneath. */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./common.mjs";

const take = path.join(ROOT, "dev/takes/rectest-beep"), src = path.join(ROOT, "sample-takes/rectest");
fs.rmSync(take, { recursive: true, force: true }); fs.mkdirSync(path.join(take, "audio"), { recursive: true });
fs.copyFileSync(path.join(src, "raw.mp4"), path.join(take, "raw.mp4"));
const beep = (file, hz, dur) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", `sine=frequency=${hz}:duration=${dur}:sample_rate=48000`, "-af", `volume=-6dB,afade=t=in:d=0.004,afade=t=out:st=${dur - 0.01}:d=0.01`, "-ac", "2", path.join(take, "audio", file)]);
beep("q.wav", 1000, 1.2); beep("a.wav", 2000, 1.0);
const log = JSON.parse(fs.readFileSync(path.join(src, "log.json"), "utf8"));
log.audio = [
  { t: 1.0, file: "audio/q.wav", kind: "question", lang: "hi", text: "हमारे रजिस्टर में कितने जानवर दर्ज हैं?" },
  { t: 5.2, file: "audio/a.wav", kind: "answer", lang: "kn", text: "ನಿಮ್ಮ ದಾಖಲೆಯಲ್ಲಿ 412 ಪ್ರಾಣಿಗಳಿವೆ." },
];
log.marks.push({ t: 0.3, name: "composer", box: { x: 316, y: 217, w: 1040, h: 131 } }, { t: 6.4, name: "answer", box: { x: 316, y: 500, w: 1040, h: 227 } });
fs.writeFileSync(path.join(take, "log.json"), JSON.stringify(log));

const env = { ...process.env, KAJU_TAKES: path.join(ROOT, "dev/takes"), REMOTION_KAJU_DEV: "1" };
execFileSync(process.execPath, [path.join(ROOT, "scripts/render.mjs"), "devtest", "--only=16x9", ...process.argv.slice(2)], { stdio: "inherit", env, cwd: ROOT });

/* Where the edit puts them: title 30 f, screen arrives 10 f early (frame 20). Span 1 is take 0.5–3.0 (75 f); span 2 is take 4.5–8.0 at 2x. */
const expected = { 1000: (20 + (1.0 - 0.5) * 30) / 30, 2000: (20 + Math.round(75 + ((5.2 - 4.5) / 2) * 30)) / 30 };
const py = `
import subprocess, sys, json, numpy as np
raw = subprocess.run(["ffmpeg","-loglevel","error","-i",sys.argv[1],"-vn","-ac","1","-ar","48000","-f","f32le","-"],capture_output=True).stdout
x = np.frombuffer(raw, np.float32); sr = 48000; hop = 48; win = 480
def env(f):
    t = np.arange(len(x))/sr; c = np.convolve(x*np.exp(-2j*np.pi*f*t), np.ones(win)/win, "same"); return np.abs(c)
out = {}
for f in (1000, 2000):
    e = env(f); i = int(np.argmax(e > 0.5*e.max())); out[f] = round(i/sr, 4)
def rms(a, b, lo=40, hi=110):
    s = x[int(a*sr):int(b*sr)]; X = np.fft.rfft(s*np.hanning(len(s))); fr = np.fft.rfftfreq(len(s), 1/sr); m = (fr>=lo)&(fr<=hi)
    return float(10*np.log10((np.abs(X[m])**2).sum()/len(s)**2 + 1e-20))
out["peak_db"] = round(float(20*np.log10(np.abs(x).max())), 2)
out["sub_under_voice"] = rms(out[1000]+0.3, out[1000]+1.1); out["sub_screen_no_voice"] = rms(out[1000]+1.5, out[1000]+2.2)
print(json.dumps(out))`;
const got = JSON.parse(execFileSync("python3", ["-c", py, path.join(ROOT, "out/devtest-16x9.mp4")]).toString());
let ok = true;
for (const hz of [1000, 2000]) {
  const d = (got[hz] - expected[hz]) * 1000, pass = Math.abs(d) < 20; ok &&= pass;
  console.log(`${pass ? "PASS" : "FAIL"}  ${hz} Hz voice starts at ${got[hz].toFixed(3)} s, edit says ${expected[hz].toFixed(3)} s  (${d >= 0 ? "+" : ""}${d.toFixed(1)} ms)`);
}
console.log(`      music sub band: ${got.sub_under_voice.toFixed(1)} dB under voice, ${got.sub_screen_no_voice.toFixed(1)} dB on screen without voice  (difference ${(got.sub_screen_no_voice - got.sub_under_voice).toFixed(1)} dB; the mix asks for 5)`);
console.log(`      master peak ${got.peak_db} dBFS`);
process.exit(ok ? 0 : 1);
