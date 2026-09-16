import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAccepted, parseMasterWorkbook } from "@/lib/master-import/pipeline";
import { assessLocalities, commitStaged, planImport } from "@/lib/master-import/commit";
import { resolveExistingStaging } from "@/lib/master-import/staging";

export const runtime = "nodejs";
export const maxDuration = 300;

const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
function authorised(req: Request) {
  const secret = process.env.ADMIN_SECRET?.trim();
  const auth = req.headers.get("authorization");
  return Boolean(secret && auth?.startsWith("Bearer ") && auth.slice(7).trim() === secret);
}

export async function POST(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "Operator access required." }, { status: 401 });
  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ error: "Service role not configured." }, { status: 500 });
  const body = await req.formData();
  const action = clean(body.get("action")) || "preview";
  const ngoId = clean(body.get("ngoId"));
  const file = body.get("file");
  if (!ngoId) return NextResponse.json({ error: "Choose an organisation." }, { status: 400 });
  const { data: ngo } = await supa.from("ngos").select("id,name,city,state").eq("id", ngoId).maybeSingle();
  if (!ngo) return NextResponse.json({ error: "That organisation was not found." }, { status: 404 });

  if (action === "commit") {
    const batchIds = JSON.parse(clean(body.get("batchIds")) || "[]");
    if (!Array.isArray(batchIds) || !batchIds.every((id) => typeof id === "string")) return NextResponse.json({ error: "No staged batches were selected." }, { status: 400 });
    const { data: batches, error: batchError } = await supa.from("import_batches").select("id,ngo_id,status").in("id", batchIds);
    if (batchError) return NextResponse.json({ error: batchError.message }, { status: 500 });
    if ((batches ?? []).length !== batchIds.length || (batches ?? []).some((batch) => batch.ngo_id !== ngoId || !["staged", "reviewing"].includes(batch.status))) {
      return NextResponse.json({ error: "Only this organisation's staged import batches can be committed." }, { status: 403 });
    }
    try { return NextResponse.json({ ok: true, ...(await commitStaged(supa, ngo, batchIds)) }); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not commit staged import." }, { status: 500 }); }
  }

  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an organisation and workbook." }, { status: 400 });
  if (!/\.(xlsx|xls|csv)$/i.test(file.name) || file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Use an Excel or CSV file below 25 MB." }, { status: 400 });
  const buffer = await file.arrayBuffer();
  const preview = parseMasterWorkbook(buffer, file.name);
  const previewRows = preview.sheets.flatMap((sheet) => sheet.rows.map((row) => row.normalized));

  if (action === "preview") {
    const localityStatus = await assessLocalities(supa, previewRows, ngo);
    const plan = planImport(previewRows.map((normalized) => ({ normalized, matched_dog_id: null, decision: isAccepted(normalized) ? "new" : "skip", imported_dog_id: null, imported_case_id: null })));
    return NextResponse.json({ ngo: ngo.name, preview: { ...preview, localityStatus, plan, sheets: preview.sheets.map((sheet) => ({ name: sheet.name, headerRow: sheet.headerRow, rows: sheet.rows.slice(0, 12) })) } });
  }
  if (action !== "stage") return NextResponse.json({ error: "Analyse a workbook before staging it." }, { status: 400 });

  let existing;
  try { existing = await resolveExistingStaging(supa, ngoId, preview.workbookHash, preview.sheets.map((sheet) => ({ name: sheet.name, rows: sheet.rows.length }))); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not inspect existing workbook staging." }, { status: 500 }); }
  if (existing && !existing.clearedIncomplete) return NextResponse.json({ ok: true, alreadyStaged: true, batchIds: existing.batchIds, rowsStaged: existing.rowsStaged, preview });

  const storagePath = `${ngoId}/master/${preview.workbookHash}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const uploaded = await supa.storage.from("imports").upload(storagePath, Buffer.from(buffer), { contentType: file.type || "application/octet-stream", upsert: false });
  // The deterministic path is keyed by the workbook bytes. A failed staging
  // retry may therefore reuse its already-private, identical upload.
  if (uploaded.error && !/already exists|duplicate/i.test(uploaded.error.message)) return NextResponse.json({ error: `Workbook could not be stored privately: ${uploaded.error.message}` }, { status: 500 });

  const batchIds: string[] = [];
  for (const sheet of preview.sheets) {
    const { data: batch, error } = await supa.from("import_batches").insert({
      ngo_id: ngoId, source_filename: file.name, source_kind: file.name.split(".").pop()?.toLowerCase() ?? "xlsx",
      source_storage_path: storagePath, sheet_name: sheet.name, workbook_hash: preview.workbookHash,
      mapping: { master_import_v2: true }, preview: { counts: preview.counts, plan: planImport(sheet.rows.map((row) => ({ normalized: row.normalized, matched_dog_id: null, decision: isAccepted(row.normalized) ? "new" : "skip", imported_dog_id: null, imported_case_id: null }))) },
      status: "staged", rows_total: sheet.rows.length, rows_needing_review: sheet.rows.filter((row) => isAccepted(row.normalized)).length,
    }).select("id").single();
    if (error || !batch) return NextResponse.json({ error: error?.message ?? "Could not stage import batch." }, { status: 500 });
    batchIds.push(batch.id);
    const rows = sheet.rows.map((row) => ({
      batch_id: batch.id, source_row_number: row.sourceRowNumber, source_subrecord: row.normalized.source_subrecord ?? null,
      raw_row: row.raw, normalized: { ...row.normalized, city: ngo.city ?? null }, row_fingerprint: row.normalized.fingerprint,
      classification: row.normalized.classification, decision: isAccepted(row.normalized) ? "review" : "skip",
      error: isAccepted(row.normalized) ? null : row.normalized.classification_reason,
    }));
    for (let start = 0; start < rows.length; start += 250) {
      const write = await supa.from("import_rows").insert(rows.slice(start, start + 250));
      if (write.error) return NextResponse.json({ error: `Rows could not be staged: ${write.error.message}` }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true, ngo: ngo.name, batchIds, rowsStaged: preview.totalRows, preview });
}
