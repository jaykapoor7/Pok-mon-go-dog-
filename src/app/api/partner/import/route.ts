import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

type Mapping = Record<string, string | null>;
type Normalized = {
  name?: string;
  animalCode?: string;
  species?: string;
  sex?: string;
  colour?: string;
  location?: string;
  condition?: string;
  status?: string;
  caseDetail?: string;
  date?: string;
  reviewDate?: string;
  detailedStatus?: string;
  programme?: string;
  latitude?: number;
  longitude?: number;
};

type SheetKind = "rescue" | "care" | "follow_up" | "programme" | "operations" | "survey" | "administrative" | "unknown";
type ParsedSheet = { sheetName: string; headers: string[]; rows: Array<{ sourceRowNumber: number; raw: Record<string, unknown> }> };

const FIELDS: Record<string, RegExp> = {
  name: /^(name|animal|dog name|nickname)$/i,
  animalCode: /(animal|dog).{0,8}(id|code)|^id$/i,
  species: /^species$/i,
  sex: /^(sex|gender)$/i,
  colour: /colou?r|markings?|identifier/i,
  location: /location|locality|area|ward|zone|place/i,
  condition: /injury|condition|type|diagnosis/i,
  status: /^status$/i,
  caseDetail: /case detail|description|details?$/i,
  date: /^(date|reported|request date)$/i,
  reviewDate: /review|appoint|follow.?up|next date/i,
  detailedStatus: /detailed status|update|outcome|completed/i,
  programme: /programme|program|drive|campaign/i,
  latitude: /^(latitude|lat)$/i,
  longitude: /^(longitude|lng|lon)$/i,
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function normaliseHeader(value: unknown): string {
  return text(value).replace(/\s+/g, " ");
}

function suggestMapping(headers: string[]): Mapping {
  const mapping: Mapping = {};
  for (const [field, matcher] of Object.entries(FIELDS)) {
    mapping[field] = headers.find((header) => matcher.test(header)) ?? null;
  }
  return mapping;
}

function field(row: Record<string, unknown>, mapping: Mapping, name: string): string {
  const header = mapping[name];
  return header ? text(row[header]) : "";
}

function normalize(row: Record<string, unknown>, mapping: Mapping): Normalized {
  const condition = field(row, mapping, "condition");
  const detail = field(row, mapping, "caseDetail");
  return {
    name: field(row, mapping, "name") || undefined,
    animalCode: field(row, mapping, "animalCode") || undefined,
    species: field(row, mapping, "species").toLowerCase() || "dog",
    sex: field(row, mapping, "sex") || undefined,
    colour: field(row, mapping, "colour") || undefined,
    location: field(row, mapping, "location") || undefined,
    condition: condition || undefined,
    status: field(row, mapping, "status") || undefined,
    caseDetail: detail || undefined,
    date: field(row, mapping, "date") || undefined,
    reviewDate: field(row, mapping, "reviewDate") || undefined,
    detailedStatus: field(row, mapping, "detailedStatus") || undefined,
    programme: field(row, mapping, "programme") || undefined,
    latitude: Number.isFinite(Number(field(row, mapping, "latitude"))) ? Number(field(row, mapping, "latitude")) : undefined,
    longitude: Number.isFinite(Number(field(row, mapping, "longitude"))) ? Number(field(row, mapping, "longitude")) : undefined,
  };
}

function usableCoordinates(record: Normalized) {
  return Number.isFinite(record.latitude) && Number.isFinite(record.longitude) && record.latitude !== 0 && record.longitude !== 0 && Math.abs(record.latitude!) <= 90 && Math.abs(record.longitude!) <= 180;
}

function hasDefensibleIdentity(record: Normalized) {
  return Boolean(record.animalCode || (record.name && record.location && (record.sex || record.colour)));
}

function parseSheet(sheet: XLSX.WorkSheet, sheetName: string): ParsedSheet {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  const headerIndex = matrix.findIndex((row) => Array.isArray(row) && row.filter((cell) => text(cell)).length >= 2);
  if (headerIndex < 0) return { sheetName, headers: [], rows: [] };
  const headers = (matrix[headerIndex] as unknown[]).map(normaliseHeader);
  const rows = matrix.slice(headerIndex + 1)
    .map((values, offset) => {
      const raw: Record<string, unknown> = {};
      headers.forEach((header, index) => { if (header) raw[header] = (values as unknown[])[index] ?? ""; });
      return { sourceRowNumber: headerIndex + offset + 2, raw };
    })
    .filter(({ raw }) => Object.values(raw).some((value) => text(value)));
  return { sheetName, headers, rows };
}

function classifySheet(sheet: ParsedSheet): { kind: SheetKind; label: string; confidence: "high" | "medium" | "review"; reason: string } {
  const name = sheet.sheetName.toLowerCase();
  const headers = sheet.headers.join(" ").toLowerCase();
  const all = `${name} ${headers}`;
  if (/salary|advance|house rent|payroll|appoint|staff rent/.test(name)) return { kind:"administrative", label:"Administrative / private", confidence:"high", reason:"Staff, salary or rent sheet; keep outside animal records." };
  if (/van|vehicle|transport|petrol|diesel|odometer/.test(all)) return { kind:"operations", label:"Operations", confidence:"high", reason:"Vehicle, distance, fuel or route fields detected." };
  if (/sterili|\babc\b|campaign|drive/.test(name) || /programme|program|campaign|drive/.test(headers)) return { kind:"programme", label:"Programme / drive", confidence:"high", reason:"Programme or drive structure detected." };
  if (/tvt|medical|treatment|vaccin|rabies|arv|surgery|clinic/.test(name) || /diagnosis|treatment|medicine|dose|vaccine/.test(headers)) return { kind:"care", label:"Care / medical", confidence:"high", reason:"Treatment, diagnosis, vaccination or clinical fields detected." };
  if (/review|follow.?up|appoint/.test(name) || /review|follow.?up|next date|appointment/.test(headers)) return { kind:"follow_up", label:"Follow-up", confidence:"high", reason:"Review or follow-up fields detected." };
  if (/survey|census|questionnaire|ward count|kind index/.test(all)) return { kind:"survey", label:"Survey / census", confidence:"high", reason:"Survey, census or questionnaire structure detected." };
  if (/rescue|request|case|intake/.test(name) || /injury|condition|reported|request/.test(headers)) return { kind:"rescue", label:"Rescue / case register", confidence:"medium", reason:"Rescue, intake or condition fields detected." };
  return { kind:"unknown", label:"Needs review", confidence:"review", reason:"No safe workflow classification yet; review the sheet before importing." };
}

function readWorkbook(file: File, requestedSheet?: string) {
  return file.arrayBuffer().then((buffer) => {
    const book = XLSX.read(buffer, { type: "array", cellDates: true });
    if (!book.SheetNames.length) throw new Error("This workbook has no readable sheets.");
    const parsedSheets = book.SheetNames.map((name) => parseSheet(book.Sheets[name], name));
    const selectedName = requestedSheet && book.SheetNames.includes(requestedSheet) ? requestedSheet : book.SheetNames[0];
    const selected = parsedSheets.find((sheet) => sheet.sheetName === selectedName) ?? parsedSheets[0];
    if (!selected.headers.length) throw new Error("We could not find a header row in this sheet.");
    const sheetProfiles = parsedSheets.map((sheet) => ({
      name: sheet.sheetName,
      rows: sheet.rows.length,
      headers: sheet.headers,
      ...classifySheet(sheet),
    }));
    return { sheetNames: book.SheetNames, sheetProfiles, ...selected };
  });
}

async function identity(accessToken: string | null) {
  const admin = getSupabaseAdmin();
  if (!admin || !accessToken) return null;
  const { data: userData, error } = await admin.auth.getUser(accessToken);
  if (error || !userData.user) return null;
  const { data: membership } = await admin
    .from("ngo_members")
    .select("ngo_id, role")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!membership?.ngo_id) return null;
  return { admin, userId: userData.user.id, userLabel: userData.user.email ?? null, ngoId: membership.ngo_id as string };
}

function caseCategory(condition: string): "injury" | "sterilisation" | "rescue" | "vaccination" | "other" {
  const c = condition.toLowerCase();
  if (/abc|sterili|neuter|spay/.test(c)) return "sterilisation";
  if (/rabies|arv|vacci/.test(c)) return "vaccination";
  if (/rta|injur|wound|maggot|tvt|mange|fracture|skin|bite/.test(c)) return "injury";
  if (/rescue|caught|trap/.test(c)) return "rescue";
  return "other";
}

function dateValue(value?: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

export async function POST(request: Request) {
  const body = await request.formData();
  const action = text(body.get("action"));
  const file = body.get("file");
  const accessToken = text(body.get("accessToken")) || null;
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a .xlsx, .xls or .csv file." }, { status: 400 });
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return NextResponse.json({ error: "Use a .xlsx, .xls or .csv file." }, { status: 400 });
  if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Imports are limited to 25 MB." }, { status: 413 });

  try {
    const parsed = await readWorkbook(file, text(body.get("sheetName")) || undefined);
    const mapping: Mapping = JSON.parse(text(body.get("mapping")) || "null") ?? suggestMapping(parsed.headers);

    if (action === "preview") {
      const actor = await identity(accessToken);
      const sample = parsed.rows.slice(0, 40).map((row) => ({ ...row, normalized: normalize(row.raw, mapping) }));
      let matches: Record<number, Array<{ id: string; label: string; reasons: string[] }>> = {};
      if (actor) {
        const codes = sample.map((row) => row.normalized.animalCode).filter(Boolean) as string[];
        const names = sample.map((row) => row.normalized.name).filter(Boolean) as string[];
        if (codes.length || names.length) {
          const { data: existing } = await actor.admin
            .from("dogs")
            .select("id, name, code, zone, color, species")
            .eq("ngo_id", actor.ngoId)
            .limit(2500);
          matches = Object.fromEntries(sample.map((row) => {
            const candidate = (existing ?? []).flatMap((dog: any) => {
              const reasons: string[] = [];
              if (row.normalized.animalCode && dog.code && row.normalized.animalCode.toLowerCase() === dog.code.toLowerCase()) reasons.push("same legacy ID");
              if (row.normalized.name && dog.name && row.normalized.name.toLowerCase() === dog.name.toLowerCase()) reasons.push("same name");
              if (row.normalized.location && dog.zone && row.normalized.location.toLowerCase() === dog.zone.toLowerCase()) reasons.push("same locality");
              if (row.normalized.colour && dog.color && row.normalized.colour.toLowerCase() === dog.color.toLowerCase()) reasons.push("same colour");
              return reasons.length >= 2 || reasons.includes("same legacy ID")
                ? [{ id: dog.id, label: [dog.code, dog.name, dog.zone].filter(Boolean).join(" · "), reasons }]
                : [];
            }).slice(0, 3);
            return [row.sourceRowNumber, candidate];
          }));
        }
      }
      return NextResponse.json({
        ...parsed,
        suggestedMapping: suggestMapping(parsed.headers),
        mapping,
        sample,
        matches,
      });
    }

    if (action !== "commit") return NextResponse.json({ error: "Unknown import action." }, { status: 400 });
    const actor = await identity(accessToken);
    if (!actor) return NextResponse.json({ error: "Sign in with an organisation account to import records." }, { status: 401 });
    const decisions = JSON.parse(text(body.get("decisions")) || "{}") as Record<string, { decision: "new" | "merge" | "review" | "skip"; matchedDogId?: string }>;

    const sourceKind = file.name.split(".").pop()?.toLowerCase() ?? "xlsx";
    const batchPayload = {
      ngo_id: actor.ngoId,
      source_filename: file.name,
      source_kind: sourceKind,
      sheet_name: parsed.sheetName,
      mapping,
      status: "reviewing",
      rows_total: parsed.rows.length,
      created_by: actor.userId,
    };
    const { data: batch, error: batchError } = await actor.admin.from("import_batches").insert(batchPayload).select("id").single();
    if (batchError || !batch) throw new Error(batchError?.message ?? "Could not create import batch.");

    const storagePath = `${actor.ngoId}/${batch.id}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const sourceBuffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await actor.admin.storage.from("imports").upload(storagePath, sourceBuffer, { contentType: file.type || "application/octet-stream", upsert: false });
    if (!uploaded.error) await actor.admin.from("import_batches").update({ source_storage_path: storagePath }).eq("id", batch.id);

    let imported = 0;
    let review = 0;
    let failed = 0;
    for (const row of parsed.rows) {
      const normalized = normalize(row.raw, mapping);
      const choice = decisions[String(row.sourceRowNumber)] ?? { decision: "review" as const };
      const importRow: Record<string, unknown> = {
        batch_id: batch.id,
        source_row_number: row.sourceRowNumber,
        raw_row: row.raw,
        normalized: { ...normalized, source_sheet: parsed.sheetName },
        decision: choice.decision,
        matched_dog_id: choice.matchedDogId ?? null,
      };
      if (choice.decision === "review" || choice.decision === "skip") {
        if (choice.decision === "review") review++;
        await actor.admin.from("import_rows").insert(importRow);
        continue;
      }
      try {
        let dogId = choice.matchedDogId ?? null;
        if (choice.decision === "new") {
          if (!hasDefensibleIdentity(normalized)) throw new Error("This row needs identity review before a permanent animal profile can be created.");
          const { data: dog, error: dogError } = await actor.admin.from("dogs").insert({
            ngo_id: actor.ngoId,
            name: normalized.name ?? null,
            code: normalized.animalCode ?? null,
            species: normalized.species ?? "dog",
            zone: normalized.location ?? "",
            lat: usableCoordinates(normalized) ? normalized.latitude : 0,
            lng: usableCoordinates(normalized) ? normalized.longitude : 0,
            status: "seen",
            color: normalized.colour ?? "Unknown",
            created_by_id: actor.userId,
            created_by_name: actor.userLabel,
            sex: normalized.sex ?? null,
            intake_notes: null,
            provenance: "imported_historical_record",
            source_metadata: { import_batch_id: batch.id, source_row: row.sourceRowNumber, source_sheet: parsed.sheetName },
          }).select("id").single();
          if (dogError || !dog) throw new Error(dogError?.message ?? "Animal could not be created.");
          dogId = dog.id;
        }
        if (!dogId) throw new Error("Choose an existing animal for this merge.");
        const title = [normalized.condition || "Imported care record", normalized.location].filter(Boolean).join(" · ");
        const { data: caseRecord, error: caseError } = await actor.admin.from("cases").insert({
          dog_id: dogId,
          ngo_id: actor.ngoId,
          title,
          description: [normalized.caseDetail, normalized.detailedStatus].filter(Boolean).join("\n") || null,
          zone: normalized.location ?? null,
          category: caseCategory(normalized.condition ?? ""),
          status: /closed|completed|released|recovered/i.test(normalized.status ?? "") ? "closed" : "in_progress",
          condition_text: normalized.condition ?? null,
          follow_up_at: dateValue(normalized.reviewDate)?.slice(0, 10) ?? null,
          provenance: "imported_historical_record",
          verification_state: "needs_review",
          created_at: dateValue(normalized.date) ?? new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
        }).select("id").single();
        if (caseError || !caseRecord) throw new Error(caseError?.message ?? "Case could not be created.");
        if (normalized.reviewDate) {
          await actor.admin.from("animal_followups").insert({
            ngo_id: actor.ngoId,
            dog_id: dogId,
            case_id: caseRecord.id,
            due_at: dateValue(normalized.reviewDate) ?? new Date().toISOString(),
            kind: "imported review",
            note: "Imported from historical workbook. Confirm date before acting.",
            created_by: actor.userId,
          });
        }
        await actor.admin.from("animal_timeline_events").insert({
          ngo_id: actor.ngoId,
          dog_id: dogId,
          case_id: caseRecord.id,
          event_type: "imported_record",
          title: "Historical record imported",
          details: [normalized.condition, normalized.detailedStatus].filter(Boolean).join(" · ") || null,
          occurred_at: dateValue(normalized.date) ?? new Date().toISOString(),
          actor_id: actor.userId,
          provenance: "imported_historical_record",
          source_ref: { import_batch_id: batch.id, source_row: row.sourceRowNumber, source_sheet: parsed.sheetName },
        });
        importRow.imported_dog_id = dogId;
        importRow.imported_case_id = caseRecord.id;
        await actor.admin.from("import_rows").insert(importRow);
        imported++;
      } catch (error) {
        failed++;
        importRow.error = error instanceof Error ? error.message : "Import failed.";
        await actor.admin.from("import_rows").insert(importRow);
      }
    }
    await actor.admin.from("import_batches").update({
      status: failed ? "failed" : review ? "reviewing" : "imported",
      rows_imported: imported,
      rows_needing_review: review,
      completed_at: new Date().toISOString(),
    }).eq("id", batch.id);
    return NextResponse.json({ batchId: batch.id, imported, review, failed, sourceStored: !uploaded.error });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import could not be processed." }, { status: 400 });
  }
}
