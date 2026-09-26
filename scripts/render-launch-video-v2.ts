import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const OUT = resolve(ROOT, "launch-video-v2");
const STILLS = resolve(OUT, "stills");
const FPS = 30;

const scenes = [
  { file: "01-animal.png", seconds: 3.0 },
  { file: "02-profile.png", seconds: 4.0 },
  { file: "03-map.png", seconds: 4.0 },
  { file: "04-case-queue.png", seconds: 4.0 },
  { file: "05-case-detail.png", seconds: 4.0 },
  { file: "06-coverage.png", seconds: 4.0 },
  { file: "07-end.png", seconds: 4.2 },
];

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(cmd + " exited with " + code));
    });
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const args: string[] = ["-y"];
  for (const scene of scenes) {
    args.push("-loop", "1", "-t", String(scene.seconds), "-i", resolve(STILLS, scene.file));
  }

  const transition = 0.22;
  const filters: string[] = [];

  scenes.forEach((scene, i) => {
    filters.push(
      "[" + i + ":v]" +
      "scale=1920:1080:force_original_aspect_ratio=increase," +
      "crop=1920:1080," +
      "setsar=1," +
      "fps=" + FPS + "," +
      "format=yuv420p[v" + i + "]"
    );
  });

  let previous = "v0";
  let elapsed = scenes[0].seconds;

  for (let i = 1; i < scenes.length; i++) {
    const out = "x" + i;
    const offset = elapsed - transition * i;
    filters.push(
      "[" + previous + "][v" + i + "]" +
      "xfade=transition=fade:duration=" + transition + ":offset=" + offset.toFixed(3) +
      "[" + out + "]"
    );
    previous = out;
    elapsed += scenes[i].seconds;
  }

  const duration = scenes.reduce((sum, scene) => sum + scene.seconds, 0) - transition * (scenes.length - 1);

  args.push(
    "-filter_complex", filters.join(";"),
    "-map", "[" + previous + "]",
    "-t", duration.toFixed(3),
    "-r", String(FPS),
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "16",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "-an",
    resolve(OUT, "straypaw-launch-v2.mp4")
  );

  await run("ffmpeg", args);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
