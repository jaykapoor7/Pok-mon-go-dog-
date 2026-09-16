import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSupabaseAdmin } from "@/lib/supabase";
import { reconcileHistoricAnimals } from "@/lib/master-import/reconcile";

export const runtime = "nodejs";
export const maxDuration = 60;

type AuthState = "ok" | "unset" | "bad";
type SheetRow = { sourceRowNumber: number; raw: Record<string, string>; normalized: Record<string, string | null> };
type Programme = { name: string; records: number };

function authState(req: Request): AuthState {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return "unset";
  const auth = req.headers.get("authorization");
  return auth?.startsWith("Bearer ") && auth.slice(7).trim() === secret ? "ok" : "bad";
}

function reject(state: AuthState) {
  return NextResponse.json(
    { error: state === "unset" ? "Set ADMIN_SECRET in Vercel and redeploy to use master imports." : "Wrong operator key." },
    { status: state === "unset" ? 503 : 401 },
  );
}

const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
const privateHeader = /informer|contact|phone|mobile|email|whatsapp/i;
const operationalSheet = /rescue|review|appoint|tvt|sterili[sz]|adopt|foster|treatment|medical|vaccin/i;

function headerScore(row: unknown[]): number {
  const joined = row.map(clean).filter(Boolean).join(" | ").toLowerCase();
  return Number(/date/.test(joined)) + Number(/location|area|zone|ward/.test(joined)) + Number(/case|detail|injury|status|animal|dog|colour|gender/.test(joined));
}

function value(row: Record<string, string>, matcher: RegExp) {
  const key = Object.keys(row).find((header) => matcher.test(header));
  return key ? clean(row[key]) || null : null;
}

function category(condition: string | null, sheetName: string) {
  const text = `${condition ?? ""} ${sheetName}`.toLowerCase();
  if (/sterili|abc|neuter|spay/.test(text)) return "sterilisation";
  if (/rabies|arv|vaccin/.test(text)) return "vaccination";
  if (/rescue|caught|trap/.test(text)) return "rescue";
  if (/tvt|injur|wound|maggot|fracture|rta|mange|skin|bite/.test(text)) return "injury";
  return "other";
}

function status(value: string | null) {
  // Historic rows are team records, not public submissions awaiting a
  // moderator. Keep completed work closed and the remainder visible to the
  // organisation as active care instead of labelling everything “unverified”.
  return /closed|complete|healed|released|recovered|treated/i.test(value ?? "") ? "closed" : "in_progress";
}

function date(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

function parseSheet(book: XLSX.WorkBook, sheetName: string): SheetRow[] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[sheetName], { header: 1, defval: "", raw: false });
  const headerIndex = matrix.slice(0, 20).reduce((best, row, index) => headerScore(row) > headerScore(matrix[best] ?? []) ? index : best, 0);
  if (headerScore(matrix[headerIndex] ?? []) < 2) return [];
  const headers = (matrix[headerIndex] ?? []).map((cell, index) => clean(cell) || `Column ${index + 1}`);
  return matrix.slice(headerIndex + 1).map((cells, offset) => {
    const raw: Record<string, string> = Object.fromEntries(
      headers
        .map((header, index) => [header, clean(cells[index])] as const)
        .filter(([, cell]) => Boolean(cell)),
    );
    const condition = value(raw, /injury|condition|diagnosis|type/i);
    const detail = value(raw, /case detail|description|details?|adoption/i);
    const location = value(raw, /location|locality|area|ward|zone|place/i);
    const currentStatus = value(raw, /^status$|completed|outcome/i);
    return {
      sourceRowNumber: headerIndex + offset + 2,
      raw: Object.fromEntries(Object.entries(raw).filter(([header]) => !privateHeader.test(header))),
      normalized: {
        source_sheet: sheetName,
        date: value(raw, /^(date|reported|request date|month)$/i),
        location,
        condition,
        case_detail: detail,
        status: currentStatus,
        treatment_update: value(raw, /detailed status|update|treatment|details?/i),
        review: value(raw, /review|appoint|next dose|next date/i),
        animal_name: value(raw, /^(animal|dog) name$|^nickname$/i),
        animal_code: value(raw, /(animal|dog).{0,8}(id|code)|^id$/i),
        sex: value(raw, /^sex$|^gender$/i),
        colour: value(raw, /colou?r|markings?/i),
      },
    };
  }).filter((row) => Object.keys(row.raw).length > 0);
}

export async function POST(req: Request) {
  const state = authState(req);
  if (state !== "ok") return reject(state);
  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ error: "Service role not configured." }, { status: 500 });

  const body = await req.formData();
  const ngoId = clean(body.get("ngoId"));
  const file = body.get("file");
  if (!ngoId || !(file instanceof File)) return NextResponse.json({ error: "Choose an organisation and workbook." }, { status: 400 });
  if (!/\.(xlsx|xls|csv)$/i.test(file.name) || file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Use an Excel or CSV file below 25 MB." }, { status: 400 });

  const { data: ngo } = await supa.from("ngos").select("id,name,city").eq("id", ngoId).maybeSingle();
  if (!ngo) return NextResponse.json({ error: "That organisation was not found." }, { status: 404 });

  const book = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheets = book.SheetNames.filter((name) => operationalSheet.test(name)).map((name) => ({ name, rows: parseSheet(book, name) })).filter((sheet) => sheet.rows.length);
  if (!sheets.length) return NextResponse.json({ error: "No operational sheets were found. Name a sheet Rescue, Treatment, Review, TVT, Sterilization, Adoption or Foster." }, { status: 400 });

  const storagePath = `${ngoId}/master/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const upload = await supa.storage.from("imports").upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type || "application/octet-stream", upsert: false });
  if (upload.error) return NextResponse.json({ error: `Workbook could not be stored privately: ${upload.error.message}` }, { status: 500 });

  let casesCreated = 0;
  let rowsStaged = 0;
  const batches: Array<{ sheet: string; rows: number }> = [];
  const programmes: Programme[] = [];
  for (const sheet of sheets) {
    const { data: batch, error: batchError } = await supa.from("import_batches").insert({ ngo_id: ngoId, source_filename: file.name, source_kind: file.name.split(".").pop()?.toLowerCase() ?? "xlsx", source_storage_path: storagePath, sheet_name: sheet.name, mapping: { master_import: true }, status: "reviewing", rows_total: sheet.rows.length }).select("id").single();
    if (batchError || !batch) return NextResponse.json({ error: batchError?.message ?? "Could not start import batch." }, { status: 500 });

    const cases = sheet.rows.map((row) => {
      const n = row.normalized;
      const title = [n.condition || `${sheet.name} record`, n.location].filter(Boolean).join(" · ");
      return { ngo_id: ngoId, title, description: [n.case_detail, n.treatment_update, n.review ? `Follow-up: ${n.review}` : null].filter(Boolean).join("\n") || null, zone: n.location, category: category(n.condition, sheet.name), status: status(n.status), condition_text: n.condition, provenance: "imported_historical_record", verification_state: "verified", created_at: date(n.date) ?? new Date().toISOString(), last_activity_at: date(n.date) ?? new Date().toISOString() };
    });
    const importedCaseIds: string[] = [];
    for (let start = 0; start < cases.length; start += 250) {
      const { data, error } = await supa.from("cases").insert(cases.slice(start, start + 250)).select("id");
      if (error || !data || data.length !== cases.slice(start, start + 250).length) {
        return NextResponse.json({ error: `Cases could not be created: ${error?.message ?? "missing inserted records"}` }, { status: 500 });
      }
      importedCaseIds.push(...data.map((record) => record.id));
    }
    const importRows = sheet.rows.map((row, index) => ({
      batch_id: batch.id,
      source_row_number: row.sourceRowNumber,
      raw_row: row.raw,
      normalized: row.normalized,
      decision: "review",
      imported_case_id: importedCaseIds[index],
    }));
    for (let start = 0; start < importRows.length; start += 250) {
      const { error } = await supa.from("import_rows").insert(importRows.slice(start, start + 250));
      if (error) return NextResponse.json({ error: `Source rows could not be staged: ${error.message}` }, { status: 500 });
    }
    await supa.from("import_batches").update({ rows_imported: sheet.rows.length, rows_needing_review: sheet.rows.length, completed_at: new Date().toISOString() }).eq("id", batch.id);
    if (/sterili[sz]/i.test(sheet.name)) {
      const name = sheet.name.replace(/\s+/g, " ").trim();
      const { data: existing } = await supa.from("campaigns").select("id").eq("ngo_id", ngoId).eq("name", name).maybeSingle();
      const programme = {
        ngo_id: ngoId, name, kind: "sterilisation", zone: ngo.city ?? "Coimbatore",
        notes: "Historic operational ledger imported from the organisation workbook.",
        source_rows_count: sheet.rows.length, public_visibility: "summary",
        public_summary: `${sheet.rows.length} dogs sterilised through this Pawesome drive.`,
        published_at: new Date().toISOString(), archived_at: new Date().toISOString(),
      };
      const write = existing
        ? await supa.from("campaigns").update(programme).eq("id", existing.id)
        : await supa.from("campaigns").insert(programme);
      if (write.error) return NextResponse.json({ error: `Programme could not be published: ${write.error.message}` }, { status: 500 });
      programmes.push({ name, records: sheet.rows.length });
    }
    casesCreated += cases.length;
    rowsStaged += sheet.rows.length;
    batches.push({ sheet: sheet.name, rows: sheet.rows.length });
  }
  const animals = await reconcileHistoricAnimals(supa, ngoId);
  return NextResponse.json({ ok: true, ngo: ngo.name, rowsStaged, casesCreated, batches, programmes, animals });
}
