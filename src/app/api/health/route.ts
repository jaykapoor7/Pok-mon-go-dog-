import { NextResponse } from "next/server";
import build from "@/lib/build-info.json";

export const dynamic = "force-dynamic";

/* /api/health          the deployed commit, for release checks.
   /api/health?deep=1   also reads one public row with the anonymous key, so an
                        uptime monitor can tell "site up, database down" apart. */
export async function GET(req: Request) {
  const base = { sha: process.env.VERCEL_GIT_COMMIT_SHA || build.sha, environment: process.env.VERCEL_ENV || "local" };
  if (new URL(req.url).searchParams.get("deep") !== "1") return NextResponse.json({ status: "ok", ...base }, { headers: { "Cache-Control": "no-store" } });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(), key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const t0 = Date.now();
  let database: "ok" | "unreachable" | "not_configured" = "not_configured";
  if (url && key) {
    try {
      const r = await fetch(`${url}/rest/v1/public_programme_cards?select=id&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store", signal: AbortSignal.timeout(5000) });
      database = r.ok ? "ok" : "unreachable";
    } catch { database = "unreachable"; }
  }
  const ok = database === "ok";
  return NextResponse.json({ status: ok ? "ok" : "degraded", ...base, database, databaseMs: Date.now() - t0 }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
