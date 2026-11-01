import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Report } from "./native";
import type { ReportSource } from "@/sp3/ai/types";

/* Report tables built from the organisation's records, read with the
   person's own session (row-level security decides what is included). */
export const SOURCE_LABEL: Record<ReportSource, string> = { open_cases: "Open cases", animals: "Animal register", verification: "ABC verification status", operations_checks: "Operations check report" };

export async function buildReport(source: ReportSource, db: SupabaseClient, title?: string): Promise<Report> {
  const { data: ngoId, error: membershipError } = await db.rpc("my_ngo");
  if (membershipError || typeof ngoId !== "string" || !ngoId) throw new Error("Reports need an organisation workspace.");
  const when = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const head = { title: title?.trim() || SOURCE_LABEL[source], subtitle: `Prepared with Kaju from StrayPaw records · ${when}` };
  if (source === "operations_checks") {
    const { data, error } = await db.from("kaju_check_runs").select("id,checked_at,rules_version,findings").eq("ngo_id", ngoId).order("checked_at", { ascending: false }).limit(1).maybeSingle();
    if (error || !data) throw new Error("Run operational checks before preparing this report.");
    const findings = data.findings as { rule: string; explanation: string; count: number; due_on?: string; records: { label: string; href: string; missing?: string[]; due_at?: string }[] }[];
    return { ...head, columns: ["Rule", "Explanation", "Sample count", "Record", "Detail", "Source"], rows: findings.flatMap(f => f.records.length ? f.records.map(r => [f.rule, f.explanation, f.count, r.label, r.missing?.join(", ") ?? r.due_at ?? "", r.href]) : [[f.rule, f.explanation, f.count, "", f.due_on ?? "", ""]]), notes: [`Snapshot: ${data.id}`, `Checked at: ${data.checked_at}`, `Rules: ${data.rules_version}`, "Counts are bounded samples of at most 100 records per rule. Findings describe recorded gaps; they do not certify fieldwork. No notification was sent."] };
  }
  if (source === "open_cases") {
    const { data, error } = await db.from("org_case_facts").select("case_code,title,zone,city,status_class,occurred_at,assignee_name").neq("status_class", "closed").or("provenance.is.null,provenance.neq.imported_historical_record,reviewed_at.not.is.null").order("occurred_at", { ascending: false }).limit(1000);
    if (error) throw new Error(error.message);
    return { ...head, points: [], columns: ["Case", "Title", "Place", "Status", "Opened", "Assigned to"], rows: (data ?? []).map((c) => [c.case_code ?? "", c.title ?? "", c.zone || c.city || "", c.status_class ?? "", String(c.occurred_at ?? "").slice(0, 10), c.assignee_name ?? "Unassigned"]), notes: ["Unreviewed historical imports are excluded. Export includes at most 1,000 open cases; it is not a programme total."] };
  }
  if (source === "animals") {
    const { data, error } = await db.from("dogs").select("straypaw_id,name,zone,city,sterilisation_status,vaccination_status,provenance,lat,lng").eq("ngo_id", ngoId).order("created_at", { ascending: false }).limit(2000);
    if (error) throw new Error(error.message);
    return { ...head, notes: ["At most 2,000 most recently created animals in your organisation. Unknown status is not a negative result."], points: (data ?? []).filter((d) => d.lat != null && d.lng != null).map((d) => ({ name: d.straypaw_id || d.name || "Animal", lat: Number(d.lat), lng: Number(d.lng), props: { sterilisation: d.sterilisation_status ?? "unknown", vaccination: d.vaccination_status ?? "unknown", place: d.zone || d.city || "", source: d.provenance ?? "" } })), columns: ["Tag", "Name", "Place", "Sterilisation", "Vaccination", "Source"], rows: (data ?? []).map((d) => [d.straypaw_id ?? "", d.name ?? "", d.zone || d.city || "", d.sterilisation_status ?? "unknown", d.vaccination_status ?? "unknown", d.provenance ?? ""]) };
  }
  const { data, error } = await db.rpc("abc_verification_queue", { p_limit: 500 });
  if (error) throw new Error(/does not exist|Could not find/i.test(error.message) ? "ABC verification is not switched on for this workspace" : error.message);
  const rows = (data ?? []) as { case_code: string | null; title: string | null; evidence_count: number; vet_authorised: boolean; evidence_reviewed: boolean; government_accepted: boolean; returned_note: string | null }[];
  return { ...head, notes: ["At most 500 visible ABC records. Attestations are recorded claims, not a new certification."], columns: ["Case", "Title", "Evidence", "Vet authorised", "Reviewed", "Accepted", "Returned"], rows: rows.map((r) => [r.case_code ?? "", r.title ?? "", `${r.evidence_count} of 5`, r.vet_authorised ? "Yes" : "No", r.evidence_reviewed ? "Yes" : "No", r.government_accepted ? "Yes" : "No", r.returned_note ?? ""]) };
}


/** Package exports use the same session and RLS as the municipal review screen. */
export async function buildPackageReport(id: string, db: SupabaseClient): Promise<Report> {
  const { data: p, error } = await db.from("report_packages").select("id,title,status,period_start,period_end,submitted_at,decided_by_name,decided_at").eq("id", id).maybeSingle();
  if (error || !p) throw new Error("This package is not available to you.");
  const { data, error: recordsError } = await db.rpc("abc_package_cases", { p_package: id });
  if (recordsError) throw new Error("Could not read this package's records.");
  const rows = (Array.isArray(data) ? data : []) as { case_id: string; case_code: string | null; title: string | null; city: string | null; evidence: { kind: string }[]; vet_name: string | null; reviewer_name: string | null }[];
  return {
    title: p.title, subtitle: `${p.period_start} to ${p.period_end} · Status: ${p.status}`,
    columns: ["Case", "Title", "City", "Evidence recorded", "Vet authorised by", "Reviewed by"],
    rows: rows.map(r => [r.case_code ?? r.case_id, r.title ?? "", r.city ?? "", r.evidence.map(e => e.kind).join(", "), r.vet_name ?? "Not recorded", r.reviewer_name ?? "Not recorded"]),
    notes: [`Package: ${p.id}`, `Exported at ${new Date().toISOString()}`, "Source: StrayPaw package records available to your account. Evidence files remain private; this export contains no signed file links.", ...(p.decided_at ? [`Decision recorded at ${p.decided_at} by ${p.decided_by_name ?? "Not recorded"}`] : [])],
  };
}
