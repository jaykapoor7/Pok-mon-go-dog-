#!/usr/bin/env node
/**
 * Best-effort synthetic probe for StrayPaw production.
 * A passing HTTP response alone is not enough: the deep check must say
 * both the application and database are healthy.
 *
 * This is a supplemental GitHub Actions check, NOT a replacement for a
 * 5-minute external uptime monitor with out-of-band incident alerts.
 */
const url = process.env.STRAYPAW_HEALTHCHECK_URL
  || "https://www.straypaw.org/api/health?deep=1";
const attempts = 2;
const timeoutMs = 10000;
const retryAfterMs = 30000;

try {
  const target = new URL(url);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname);
  if (target.protocol !== "https:" && !(loopback && target.protocol === "http:")) {
    throw new Error("The health endpoint must use HTTPS outside local tests");
  }
  if (target.pathname !== "/api/health" || target.searchParams.get("deep") !== "1") {
    throw new Error("Use /api/health?deep=1 to test application and database");
  }
} catch (error) {
  console.error("Invalid health URL:", error instanceof Error ? error.message : String(error));
  process.exit(2);
}

let lastFailure = "";
for (let i = 1; i <= attempts; i++) {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "Cache-Control": "no-cache", Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
    });
    const body = await response.json();
    if (response.status === 200 && body?.status === "ok" && body?.database === "ok") {
      console.log(`Healthy on attempt ${i}: status=ok, database=ok, duration=${Date.now() - started}ms, sha=${String(body.sha ?? "unknown").slice(0,12)}`);
      process.exit(0);
    }
    lastFailure = `HTTP ${response.status}; status=${String(body?.status ?? "unknown")}; database=${String(body?.database ?? "unknown")}`;
  } catch (error) {
    lastFailure = error instanceof Error ? error.message : String(error);
  }
  console.error(`Health probe ${i}/${attempts} failed: ${lastFailure}`);
  if (i < attempts) await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
}
console.error("StrayPaw deep health probe failed twice. Check Vercel logs and Supabase status.");
process.exitCode = 1;
