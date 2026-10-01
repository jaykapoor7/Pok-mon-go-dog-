Warning: truncated output (original token count: 4636)
Total output lines: 355

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

type Mapping = Record<string, string | null>;
type Normalized = {
  name?: string;
  animalCode?: string;
  species: "dog";
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
    // Imports intentionally do not map a species column. This product's
    // register is dog-only, so accepting a value here would let a workbook
    // bypass the same rule the field forms enforce.
    species: "dog",
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
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1,…2636 tokens truncated…malized.location ?? "",
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
