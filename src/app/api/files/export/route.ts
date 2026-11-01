import { NextResponse } from "next/server";
import { caller } from "@/lib/connections/server";
import { makeFile, type FileKind } from "@/lib/files/native";
import { buildReport } from "@/lib/files/reports";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { REPORT_SOURCES, type ReportSource } from "@/sp3/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* POST { format, source, title }: a report file built from the person's
   own records (their session; row-level security applies). No external
   account needed. */
const FORMATS: FileKind[] = ["pdf", "docx", "xlsx", "csv", "pptx", "geojson", "kml"];
export async function POST(req: Request) {
  if (!(await allowRequest(clientIp(req), "file-export", 20, 600))) return NextResponse.json({ error: "Too many exports at once. Wait a minute." }, { status: 429 });
  const c = await caller(req);
  if (!c) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!c.ngoId) return NextResponse.json({ error: "Reports need an organisation workspace." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const format = FORMATS.includes(b.format) ? (b.format as FileKind) : null;
  const source = REPORT_SOURCES.includes(b.source) ? (b.source as ReportSource) : null;
  if (!format || !source) return NextResponse.json({ error: "Choose a format and a report." }, { status: 400 });
  try {
    const f = await makeFile(format, await buildReport(source, c.db, String(b.title ?? "").slice(0, 120)));
    return new NextResponse(new Uint8Array(f.bytes), { headers: { "Content-Type": f.mime, "Content-Disposition": `attachment; filename="${f.filename}"`, "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message.slice(0, 200) }, { status: 400 });
  }
}
