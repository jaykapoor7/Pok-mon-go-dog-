import { NextResponse } from "next/server";
import build from "@/lib/build-info.json";

export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({ status: "ok", sha: process.env.VERCEL_GIT_COMMIT_SHA || build.sha, environment: process.env.VERCEL_ENV || "local" }, { headers: { "Cache-Control": "no-store" } });
}
