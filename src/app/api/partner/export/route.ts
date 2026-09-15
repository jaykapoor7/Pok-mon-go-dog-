import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

function csvCell(value: unknown) { const text = value == null ? "" : String(value); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
function toCsv(rows: Record<string, unknown>[]) { const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))); return [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n"); }
async function actor(request: Request) { const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""); const admin = getSupabaseAdmin(); if (!admin || !token) return null; const { data: identity } = await admin.auth.getUser(token); if (!identity.user) return null; const { data: member } = await admin.from("ngo_members").select("ngo_id").eq("user_id", identity.user.id).maybeSingle(); return member?.ngo_id ? { admin, ngoId: member.ngo_id as string } : null; }
function cases(rows: any[]) { return rows.map((row) => ({ "Case ID": row.case_code ?? row.id, "Animal ID": row.dogs?.straypaw_id ?? row.dogs?.code ?? "", Animal: row.dogs?.name ?? "", Species: row.species ?? "dog", Condition: row.condition_text ?? row.category, Status: row.status, Stage: row.stage ?? "", Severity: row.severity, Locality: row.zone ?? "", Assignee: row.assignee_name ?? "", "Next action": row.next_action ?? "", "Follow-up": row.follow_up_at ?? "", Outcome: row.outcome_note ?? row.resolution ?? "", "Evidence status": row.proof_verified ? "Verified" : row.verification_state ?? "Submitted", Opened: row.created_at ?? "", "Last updated": row.last_activity_at ?? "" })); }
function animals(rows: any[]) { return rows.map((row) => ({ "StrayPaw ID": row.straypaw_id ?? row.code ?? row.id, "Legacy ID": row.code ?? "", Name: row.name ?? "", Species: row.species ?? "dog", Sex: row.sex ?? "Unknown", Colour: row.color ?? "Unknown", Identifiers: row.identifiers ?? "", Locality: row.zone ?? "", Status: row.status ?? "", Sterilisation: row.sterilisation_status ?? "Unknown", Rabies: row.vaccination_status ?? "Unknown", "First recorded": row.first_seen ?? "", "Last seen": row.last_seen ?? "", Provenance: row.provenance ?? "" })); }

export async function GET(request: Request) {
  const current = await actor(request); if (!current) return NextResponse.json({ error: "Organisation access required." }, { status: 401 });
  const url = new URL(request.url); const type = url.searchParams.get("type") ?? "report"; const format = url.searchParams.get("format") ?? "xlsx";
  const [{ data: caseData }, { data: animalData }, { data: medicalData }] = await Promise.all([
    current.admin.from("cases").select("*, dogs(name,code,straypaw_id)").eq("ngo_id", current.ngoId).order("last_activity_at", { ascending: false }).limit(10000),
    current.admin.from("dogs").select("*").eq("ngo_id", current.ngoId).order("last_seen", { ascending: false }).limit(10000),
    current.admin.from("medical_events").select("id,dog_id,case_id,kind,event_date,notes,performed_by,created_at,dogs!inner(name,code,straypaw_id,ngo_id)").eq("dogs.ngo_id", current.ngoId).order("event_date", { ascending: false }).limit(10000),
  ]);
  const workbookData = { Cases: cases(caseData ?? []), Animals: animals(animalData ?? []), "Care history": (medicalData ?? []).map((row: any) => ({ "StrayPaw ID": row.dogs?.straypaw_id ?? row.dogs?.code ?? row.dog_id, Animal: row.dogs?.name ?? "", "Case ID": row.case_id ?? "", Event: row.kind, Date: row.event_date, "Performed by": row.performed_by ?? "", Notes: row.notes ?? "" })) };
  const selected = type === "animals" ? { Animals: workbookData.Animals } : type === "cases" ? { Cases: workbookData.Cases } : workbookData;
  const date = new Date().toISOString().slice(0, 10);
  if (format === "csv") { const [name, rows] = Object.entries(selected)[0]; return new Response(toCsv(rows as Record<string, unknown>[]), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="straypaw-${name.toLowerCase().replace(/\s+/g, "-")}-${date}.csv"`, "Cache-Control": "no-store" } }); }
  const book = XLSX.utils.book_new(); for (const [name, rows] of Object.entries(selected)) XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), name.slice(0, 31));
  return new Response(XLSX.write(book, { type: "buffer", bookType: "xlsx" }), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="straypaw-${type}-${date}.xlsx"`, "Cache-Control": "no-store" } });
}
