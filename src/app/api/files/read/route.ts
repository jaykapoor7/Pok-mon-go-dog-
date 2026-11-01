import { NextResponse } from "next/server";
import { caller } from "@/lib/connections/server";
import { MAX_READ_BYTES, readFile, untrusted } from "@/lib/files/native";
import { allowRequest, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* POST multipart { file }: read an attached PDF, Word, Excel, CSV or
   PowerPoint file for Kaju. Nothing is stored. The text comes back
   wrapped as untrusted content. */
export async function POST(req: Request) {
  if (!(await allowRequest(clientIp(req), "file-read", 20, 600))) return NextResponse.json({ error: "Too many files at once. Wait a minute." }, { status: 429 });
  const c = await caller(req);
  if (!c) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const f = form?.get("file");
  if (!(f instanceof File)) return NextResponse.json({ error: "Attach a file." }, { status: 400 });
  if (f.size > MAX_READ_BYTES) return NextResponse.json({ error: "That file is over 15 MB." }, { status: 413 });
  try {
    const r = await readFile(Buffer.from(await f.arrayBuffer()), f.name, f.type);
    return NextResponse.json({ name: f.name, kind: r.kind, truncated: r.truncated, text: untrusted(f.name, r.text.slice(0, 20_000)) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message.slice(0, 200) }, { status: 400 });
  }
}
