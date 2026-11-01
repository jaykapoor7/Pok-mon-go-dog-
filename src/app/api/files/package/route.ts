import { NextResponse } from "next/server";
import { caller } from "@/lib/connections/server";
import { makeFile } from "@/lib/files/native";
import { buildPackageReport } from "@/lib/files/reports";
import { allowUserRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const c = await caller(req);
  if (!c) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!(await allowUserRequest(c.db, "package-export"))) return NextResponse.json({ error: "Exports or files are temporarily limited. Try again shortly." }, { status: 429 });
  const b = await req.json().catch(() => null);
  if (!b || !["pdf", "xlsx"].includes(b.format) || typeof b.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.id)) return NextResponse.json({ error: "Choose a package and PDF or XLSX." }, { status: 400 });
  try {
    const f = await makeFile(b.format, await buildPackageReport(b.id, c.db));
    return new NextResponse(new Uint8Array(f.bytes), { headers: { "Content-Type": f.mime, "Content-Disposition": `attachment; filename="${f.filename}"`, "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "This package could not be exported. Check your access and try again." }, { status: 403 });
  }
}
