import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
let sha = process.env.VERCEL_GIT_COMMIT_SHA;
if (!sha) { try { sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch { sha = "unknown"; } }
writeFileSync(new URL("../src/lib/build-info.json", import.meta.url), JSON.stringify({ sha }) + "\n");
