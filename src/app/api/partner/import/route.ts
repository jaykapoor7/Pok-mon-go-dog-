import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { CHUNK, IMPORTER, writeChunk, type Org } from "@/lib/ngo-import/write";

/* ════════════════════════════════════════════════════════════════════
   NGO register import (workspace). The workbook is read in the browser;
   this route only receives plain records, in small chunks:

     start   open (or resume) a batch for this workbook, and a private
             upload slot for the original file
     rows    write up to CHUNK records; safe to send again
     finish  close the batch with its counts

   Every call carries the member's session. Membership is checked on the
   server for each call and every write is scoped to that organisation.
   ════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";
export const maxDuration = 60;

const text = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function member(req: Request) {
  const admin = getSupabaseAdmin();
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!admin || !token) return null;
  const { data: u, error } = await admin.auth.getUser(token);
  if (error || !u.user) return null;
  const { data: m } = await admin.from("ngo_members").select("ngo_id, role").eq("user_id", u.user.id).order("created_at").limit(1).maybeSingle();
  if (!m?.ngo_id) return null;
  const { data: ngo } = await admin.from("ngos").select("id,name,city,state").eq("id", m.ngo_id).maybeSingle();
  if (!ngo) return null;
  return { admin, org: ngo as Org, actor: { id: u.user.id, label: u.user.email ?? null } };
}

async function ownBatch(admin: any, org: Org, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await admin.from("import_batches").select("id,status,ngo_id,rows_total,source_storage_path").eq("id", id).eq("ngo_id", org.id).maybeSingle();
  return data;
}

export async function GET(req: Request) {
  if (!getSupabaseAdmin()) return fail("Importing is not configured on this deployment (the server key is missing).", 503);
  const who = await member(req);
  if (!who) return fail("Sign in with your organisation account to import records.", 401);
  const { data } = await who.admin.from("import_batches").select("id,source_filename,status,rows_total,rows_imported,rows_needing_review,created_at,completed_at")
    .eq("ngo_id", who.org.id).contains("mapping", { importer: IMPORTER }).order("created_at", { ascending: false }).limit(8);
  return NextResponse.json({ org: { name: who.org.name, city: who.org.city }, chunk: CHUNK, batches: data ?? [] });
}

export async function POST(req: Request) {
  if (!getSupabaseAdmin()) return fail("Importing is not configured on this deployment (the server key is missing).", 503);
  const who = await member(req);
  if (!who) return fail("Sign in with your organisation account to import records.", 401);
  const { admin, org, actor } = who;
  const body = await req.json().catch(() => null) as Record<string, any> | null;
  if (!body) return fail("The request could not be read.");

  try {
    if (body.action === "start") {
      const fileName = text(body.fileName, 160) || "register.xlsx";
      const kind = fileName.split(".").pop()?.toLowerCase();
      if (!kind || !["xlsx", "xls", "csv"].includes(kind)) return fail("Use an Excel (.xlsx, .xls) or CSV file.");
      const hash = text(body.hash, 40);
      const sheets = Array.isArray(body.sheets) ? body.sheets.slice(0, 40).map((s: any) => ({ name: text(s?.name, 120), kind: text(s?.kind, 20), records: Number(s?.records) || 0 })) : [];
      const total = Math.max(0, Math.min(500_000, Number(body.total) || 0));
      if (!org.city && !body.hasCities) return fail("Set your organisation's city in Settings first, or include a City column, so animals can be placed.");
      // The same workbook, unfinished, resumes its batch.
      const { data: open } = await admin.from("import_batches").select("id,source_storage_path").eq("ngo_id", org.id).eq("workbook_hash", hash).in("status", ["staged", "reviewing", "failed"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
      let batchId = open?.id as string | undefined;
      if (!batchId) {
        const { data, error } = await admin.from("import_batches").insert({
          ngo_id: org.id, source_filename: fileName, source_kind: kind, sheet_name: sheets.filter((s: any) => s.kind !== "skip").map((s: any) => s.name).join(", ").slice(0, 300) || null,
          mapping: { importer: IMPORTER, sheets }, workbook_hash: hash || null, status: "staged", rows_total: total, created_by: actor.id,
        }).select("id").single();
        if (error || !data) throw new Error(error?.message ?? "The import could not be started.");
        batchId = data.id as string;
      }
      let upload: { path: string; token: string } | null = null;
      if (!open?.source_storage_path) {
        const path = `${org.id}/${batchId}/${fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const signed = await admin.storage.from("imports").createSignedUploadUrl(path, { upsert: true }).catch(() => null);
        if (signed?.data?.token) upload = { path, token: signed.data.token };
      }
      return NextResponse.json({ batchId, resumed: Boolean(open), upload, chunk: CHUNK });
    }

    const batch = await ownBatch(admin, org, text(body.batchId, 40));
    if (!batch) return fail("That import was not found for your organisation.", 404);

    if (body.action === "rows") {
      if (!Array.isArray(body.records) || !body.records.length) return fail("No records were sent.");
      if (body.records.length > CHUNK) return fail(`Send at most ${CHUNK} records at a time.`);
      if (batch.status === "imported") return fail("This import is already complete.", 409);
      if (batch.status !== "reviewing") await admin.from("import_batches").update({ status: "reviewing", commit_started_at: new Date().toISOString() }).eq("id", batch.id);
      const result = await writeChunk(admin, org, actor, batch.id, body.records);
      return NextResponse.json(result);
    }

    if (body.action === "finish") {
      const n = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0));
      const patch: Record<string, unknown> = {
        status: "imported", rows_imported: n(body.imported), rows_needing_review: n(body.held), completed_at: new Date().toISOString(),
        preview: { importer: IMPORTER, animals: n(body.animals), cases: n(body.cases), care: n(body.care), followUps: n(body.followUps), already: n(body.already), held: n(body.held) },
      };
      if (typeof body.storedPath === "string" && body.storedPath.startsWith(`${org.id}/${batch.id}/`)) patch.source_storage_path = body.storedPath.slice(0, 300);
      const { error } = await admin.from("import_batches").update(patch).eq("id", batch.id);
      if (error) throw new Error(error.message);
      if (org.city) await admin.rpc("enqueue_spatial_refresh", { p_city: org.city }).then(() => undefined, () => undefined);
      return NextResponse.json({ ok: true });
    }

    return fail("Unknown import step.");
  } catch (error) {
    console.error("ngo import failed", error);
    return fail(error instanceof Error ? error.message : "The import could not be completed.", 500);
  }
}
