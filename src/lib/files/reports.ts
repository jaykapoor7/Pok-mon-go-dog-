import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Report } from "./native";
import type { ReportSource } from "@/sp3/ai/types";
import {readSnapshot} from "@/sp3/ai/snapshots";

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
    const snapshot=readSnapshot(data);
    if (error || !snapshot) throw new Error("Run operational checks before preparing this report.");
    return { ...head, columns: ["Rule", "Explanation", "Sample count", "Record", "Detail", "Source", "Snapshot", "Checked at", "Rules version"], rows: snapshot.findings.flatMap(f => {
      const count=f.configured===false?"Not set":f.count??"Unknown";
      return f.records.length ? f.records.map(r => [f.rule, f.explanation, count, r.label, Array.isArray(r.missing)?r.missing.filter(v=>typeof v==='string').join(", "):typeof r.due_at==='string'?r.due_at:"", r.href]) : [[f.rule, f.explanation, count, "", f.dueOn ?? "", f.rule==='reporting_deadline'&&f.dueOn?"/ngo/settings#kaju-deadline-title":""]];
    }).map(row=>[...row,snapshot.id,snapshot.checked_at,snapshot.rules_version]), notes: [`Snapshot: ${snapshot.id}`, `Checked at: ${snapshot.checked_at}`, `Rules: ${snapshot.rules_version}`, "Counts are bounded samples of at most 100 records per rule. Findings describe recorded gaps; they do not certify fieldwork. No notification was sent."] };
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
  return { ...head, notes: ["At most 500 visible ABC records. Attestations are recorded claims, not a new certification."], columns: ["Case", "Title", "Evidence", "Vet authorised", "Reviewed", "Accepted", "Returned"], rows: rows.map((r) => [r.case_code ?? "", r.title ?? "", String(r.evidence_count), r.vet_authorised ? "Yes" : "No", r.evidence_reviewed ? "Yes" : "No", r.government_accepted ? "Yes" : "No", r.returned_note ?? ""]) };
}


/** Package exports use the same session and RLS as the municipal review screen. */
export async function buildPackageReport(id: string, db: SupabaseClient): Promise<Report> {
  const { data: p, error } = await db.from("report_packages").select("id,title,status,period_start,period_end,submitted_at,decided_by_name,decided_at").eq("id", id).maybeSingle();
  if (error || !p) throw new Error("This package is not available to you.");
  const { data, error: recordsError } = await db.rpc("abc_package_cases", { p_package: id });
  if (recordsError) throw new Error("Could not read this package's records.");
  const rows = (Array.isArray(data) ? data : []) as { case_id: string; case_code: string | null; title: string | null; city: string | null; evidence: { kind: string }[]; vet_name: string | null; reviewer_name: string | null }[];
  const {data:reconciliation,error:reconciliationError}=await db.rpc("operations_reconciliation",{p_package:id});
  if(reconciliationError||!reconciliation||!Array.isArray(reconciliation.items))throw new Error("Reconciliation is unavailable or this account cannot export it.");
  type Item={snapshot_at?:string;source_hash?:string;signoffs_snapshot?:{kind:string;actor:string}[];evidence_snapshot?:{kind:string}[];key:string;case_id:string;procedure_label:string;claimed_units:number;unit_rate:string|null;claimed_amount:string|null;decision:string;accepted_units:number|null;missing:string[];note:string|null;reviewer:string|null};
  const items=reconciliation.items as Item[];
  const source=new Map(rows.map(r=>[r.case_id,r]));
  return {
    title:p.title,subtitle:`${p.period_start} to ${p.period_end} · Status: ${p.status}`,
    columns:["Case","Title","Procedure","Claimed qty","INR rate","INR claimed","Decision","Accepted qty","Missing / exception","Review note","Decided by","Vet authorised by","Evidence reviewed by","Evidence recorded","Submission snapshot at","Submission source hash"],
    rows:items.map(item=>{const r=source.get(item.case_id);if(!r)throw new Error("A reconciliation item is outside the visible package source.");return[r.case_code??r.case_id,r.title??"",item.procedure_label,item.claimed_units,item.unit_rate??"Unknown",item.claimed_amount??"Unknown",item.decision,item.accepted_units??"Not accepted",item.missing.join("; "),item.note??"",item.reviewer??"Not recorded",(item.signoffs_snapshot?item.signoffs_snapshot.find(a=>a.kind==="vet_authorised")?.actor:r.vet_name)??"Not recorded",(item.signoffs_snapshot?item.signoffs_snapshot.find(a=>a.kind==="evidence_reviewed")?.actor:r.reviewer_name)??"Not recorded",(item.evidence_snapshot??r.evidence).map(e=>e.kind).join(", "),item.snapshot_at??"Draft / not snapshotted",item.source_hash??"Not recorded"]}),
    notes:[`Package: ${p.id}`,`Exported at ${reconciliation.generated_at}`,reconciliation.contract?`Source contract: ${reconciliation.contract.name} version ${reconciliation.contract.version}; ${reconciliation.contract.reference}`:"No source contract configured; financial amounts are unknown.",...(reconciliation.contract?.illustrative?["ILLUSTRATIVE CONTRACT: training/testing only; not a real commercial agreement."]:[]),`INR totals · claimed: ${reconciliation.claimed_amount??"Unknown"}; reviewed: ${reconciliation.reviewed_amount??"Unknown"}; accepted: ${reconciliation.accepted_amount??"Unknown"}; externally evidenced payment: ${reconciliation.paid_amount??"Unknown"}`,"StrayPaw does not initiate or approve payments. Payment amounts describe supplied source evidence, not independent bank verification.","Source: StrayPaw package records available to your account. Evidence files remain private; this export contains no signed file links.",...(reconciliation.payment_exceeds_accepted?["Exception: payment references exceed currently accepted claims; review required."]:[]),...(p.decided_at?[`Package decision at ${p.decided_at} by ${p.decided_by_name??"Not recorded"}`]:[])],
  };
}
