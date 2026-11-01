import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Report } from "./native";
import type { ReportSource } from "@/sp3/ai/types";

/* Report tables built from the organisation's records, read with the
   person's own session (row-level security decides what is included). */
export const SOURCE_LABEL: Record<ReportSource, string> = { open_cases: "Open cases", animals: "Animal register", verification: "ABC verification status" };

export async function buildReport(source: ReportSource, db: SupabaseClient, title?: string): Promise<Report> {
  const when = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const head = { title: title?.trim() || SOURCE_LABEL[source], subtitle: `Prepared with Kaju from StrayPaw records · ${when}` };
  if (source === "open_cases") {
    const { data, error } = await db.from("org_case_facts").select("case_code,title,zone,city,status_class,occurred_at,assignee_name").neq("status_class", "closed").order("occurred_at", { ascending: false }).limit(1000);
    if (error) throw new Error(error.message);
    return { ...head, columns: ["Case", "Title", "Place", "Status", "Opened", "Assigned to"], rows: (data ?? []).map((c) => [c.case_code ?? "", c.title ?? "", c.zone || c.city || "", c.status_class ?? "", String(c.occurred_at ?? "").slice(0, 10), c.assignee_name ?? "Unassigned"]), notes: ["Imported historical records are labelled as such in StrayPaw and are not counted as live work."] };
  }
  if (source === "animals") {
    const { data, error } = await db.from("dogs").select("straypaw_id,name,zone,city,sterilisation_status,vaccination_status,provenance").order("created_at", { ascending: false }).limit(2000);
    if (error) throw new Error(error.message);
    return { ...head, columns: ["Tag", "Name", "Place", "Sterilisation", "Vaccination", "Source"], rows: (data ?? []).map((d) => [d.straypaw_id ?? "", d.name ?? "", d.zone || d.city || "", d.sterilisation_status ?? "unknown", d.vaccination_status ?? "unknown", d.provenance ?? ""]) };
  }
  const { data, error } = await db.rpc("abc_verification_queue", { p_limit: 500 });
  if (error) throw new Error(/does not exist|Could not find/i.test(error.message) ? "ABC verification is not switched on for this workspace" : error.message);
  const rows = (data ?? []) as { case_code: string | null; title: string | null; evidence_count: number; vet_authorised: boolean; evidence_reviewed: boolean; government_accepted: boolean; returned_note: string | null }[];
  return { ...head, columns: ["Case", "Title", "Evidence", "Vet authorised", "Reviewed", "Accepted", "Returned"], rows: rows.map((r) => [r.case_code ?? "", r.title ?? "", `${r.evidence_count} of 5`, r.vet_authorised ? "Yes" : "No", r.evidence_reviewed ? "Yes" : "No", r.government_accepted ? "Yes" : "No", r.returned_note ?? ""]) };
}
