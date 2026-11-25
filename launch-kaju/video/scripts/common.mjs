import { bundle } from "@remotion/bundler";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const OUT = path.join(ROOT, "out");
/* The headless shell already on this machine. Remotion is never allowed to download one. */
export const CHROME = process.env.KAJU_CHROME ?? "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
/* REMOTION_* variables reach the compositions (edits/dev is switched on by REMOTION_KAJU_DEV=1). */
const envVariables = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith("REMOTION_")));
export const browser = { browserExecutable: CHROME, chromiumOptions: { gl: "swangle" }, logLevel: "warn", envVariables };
export const idOf = (slug) => slug.split(/[^a-zA-Z0-9]+/).filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join("");

export function prepare() { execFileSync(process.execPath, [path.join(ROOT, "scripts/prepare.mjs")], { stdio: "inherit" }); }
export async function makeBundle() {
  const t = Date.now();
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/index.ts"), publicDir: path.join(ROOT, "public") });
  console.log(`bundled in ${((Date.now() - t) / 1000).toFixed(1)} s`);
  return serveUrl;
}
