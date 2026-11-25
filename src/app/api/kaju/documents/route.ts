import { NextResponse } from "next/server";
import { caller } from "@/lib/connections/server";
import { kindOf, readFile } from "@/lib/files/native";
import { MAX_UPLOAD_BYTES, UPLOAD_LIMIT_MESSAGE } from "@/lib/files/limits";
import { allowUserRequest } from "@/lib/rate-limit";
import { readScan, sarvamApproved, SarvamError } from "@/lib/sarvam";
import { readScanWithModel } from "@/sp3/ai/engine";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { LedgerDb } from "@/lib/ai/inference";
import type { Attachment } from "@/sp3/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/* POST multipart { file }: read a file a person attaches to their conversation with Kaju, for that conversation only.
   Typed PDFs, Word, Excel, CSV and PowerPoint are read on StrayPaw's own server. A scanned PDF or a photo of a page
   has no text to read, so it goes to Sarvam Vision (Indian scripts and handwriting) when the owner has approved that
   use, otherwise to the approved chat model under the same spending gate. If neither may be used, the answer says so.
   Nothing is stored here: the text returns to the browser and travels with the conversation. */

const IMAGE: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", tif: "image/tiff", tiff: "image/tiff" };
const no = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const c = await caller(req);
  if (!c) return no(401, "Sign in first.");
  if (Number(req.headers.get("content-length")) > MAX_UPLOAD_BYTES + 65536) return no(413, UPLOAD_LIMIT_MESSAGE);
  if (!(await allowUserRequest(c.db, "file-read"))) return no(429, "Files are temporarily limited. Try again shortly.");
  const form = await req.formData().catch(() => null);
  const f = form?.get("file");
  if (!(f instanceof File)) return no(400, "Attach a file.");
  if (f.size > MAX_UPLOAD_BYTES) return no(413, UPLOAD_LIMIT_MESSAGE);
  if (f.size < 16) return no(400, "That file is empty.");
  const name = f.name.slice(0, 160) || "file";
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const image = IMAGE[ext] ?? (f.type.startsWith("image/") ? f.type : null);
  const bytes = new Uint8Array(await f.arrayBuffer());
  const done = (a: Attachment & { truncated?: boolean; note?: string }) => NextResponse.json(a, { headers: { "Cache-Control": "no-store" } });

  let pages: number | undefined;
  if (!image) {
    if (!kindOf(name, f.type)) return no(400, "Kaju can read PDF, Word, Excel, CSV and PowerPoint files, and photos or scans of pages.");
    try {
      const r = await readFile(Buffer.from(bytes), name, f.type);
      if (r.kind === "pdf") { const n = Buffer.from(bytes).toString("latin1").match(/\/Type\s*\/Page(?![s])/g)?.length; pages = n && n < 2000 ? n : undefined; }
      const text = r.text.trim();
      /* A typed file: its own text. A PDF with next to no text for its size is a scan and falls through to be read as one. */
      if (r.kind !== "pdf" || text.replace(/\s+/g, "").length >= 40 * (pages ?? 1)) return done({ name, kind: r.kind, text: text.slice(0, 30_000), pages, read: "text", truncated: r.truncated || text.length > 30_000 });
    } catch (e) { return no(400, (e as Error).message.slice(0, 200)); }
  }
  /* A scan. */
  const mime = image ?? "application/pdf", kind = image ? "image" : "pdf";
  if (sarvamApproved("documents")) {
    try {
      const r = await readScan(bytes, name, mime, 60_000);
      return done({ name, kind, text: r.text.slice(0, 30_000), pages: r.pages || pages, read: "sarvam_vision", truncated: r.text.length > 30_000 });
    } catch (e) { if (!(e instanceof SarvamError)) return no(500, "That file could not be read."); /* fall through to the model */ }
  }
  const admin = getSupabaseAdmin();
  const viaModel = await readScanWithModel({ purpose: "kaju_chat", userId: c.userId, orgId: c.ngoId, db: c.db as unknown as LedgerDb, verified: c.verified, admin: admin as unknown as LedgerDb | null }, bytes, mime, req.signal);
  if (viaModel) return done({ name, kind, text: viaModel.text.slice(0, 30_000), pages, read: "model_vision", truncated: viaModel.text.length > 30_000 });
  return no(422, "This looks like a scan or a photo, and reading scans is not switched on for your account. Attach the typed PDF or the spreadsheet instead.");
}
