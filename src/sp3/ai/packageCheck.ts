/* ════════════════════════════════════════════════════════════════════
   Kaju · package check, for the municipal reviewer.

   Before an official reads a single claim, Kaju compares every animal
   claim in the package with its own source: required evidence, the
   veterinary and coordinator sign-offs, the contract rate, the arithmetic
   and repeats of the same animal and procedure. Each claim gets a
   source-backed draft note: a query listing exactly what is missing, or a
   record of what was checked.

   Kaju decides nothing. The official reads the draft, may edit it, and
   records their own decision; claims with any exception are never offered
   for batch acceptance.
   ════════════════════════════════════════════════════════════════════ */

import type { ClaimItem } from "@/lib/reconciliation";
import { EVIDENCE_LABEL, type EvidenceKind, type PackageCase } from "@/lib/abc";

export type ClaimCheck = { key: string; clean: boolean; issues: string[]; draft: string; suggested: "accepted" | "query" };
export type PackageCheck = { checks: ClaimCheck[]; clean: number; exceptions: number; decided: number; byIssue: { issue: string; count: number }[] };

const label = (k: string) => EVIDENCE_LABEL[k as EvidenceKind] ?? k.replace(/_/g, " ");
const toPaise = (v: string | number | null | undefined) => {
  const m = String(v ?? "").match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
  return m ? (m[1] ? -1 : 1) * (Number(m[2]) * 100 + Number((m[3] ?? "").padEnd(2, "0"))) : null;
};

export function checkPackage(items: ClaimItem[], cases: PackageCase[]): PackageCheck {
  const seen = new Map<string, number>();
  for (const i of items) if (i.animal_id) { const k = `${i.animal_id}|${i.procedure}`; seen.set(k, (seen.get(k) ?? 0) + 1); }
  const checks = items.map((i): ClaimCheck => {
    const src = cases.find((c) => c.case_id === i.case_id);
    const vet = i.signoffs_snapshot ? i.signoffs_snapshot.find((s) => s.kind === "vet_authorised")?.actor : src?.vet_name;
    const reviewed = i.signoffs_snapshot ? i.signoffs_snapshot.find((s) => s.kind === "evidence_reviewed")?.actor : src?.reviewer_name;
    const issues: string[] = [];
    if (i.missing.length) issues.push(`Missing evidence: ${i.missing.map(label).join(", ")}`);
    const clinical = i.procedure === "sterilisation" || i.procedure === "treatment";
    if (clinical && !vet) issues.push("No veterinary authorisation recorded");
    if (!reviewed) issues.push("No coordinator evidence review recorded");
    if (!i.animal_id) issues.push("Not linked to an animal record");
    if (i.unit_rate === null) issues.push("No contract rate for this procedure");
    const rate = toPaise(i.unit_rate), amount = toPaise(i.claimed_amount);
    if (rate !== null && amount !== null && rate * i.claimed_units !== amount) issues.push(`Amount does not equal ${i.claimed_units} × rate`);
    if (i.procedure === "sterilisation" && i.claimed_units > 1) issues.push(`${i.claimed_units} sterilisations claimed for one animal`);
    if (i.animal_id && (seen.get(`${i.animal_id}|${i.procedure}`) ?? 0) > 1) issues.push("Same animal and procedure claimed more than once in this package");
    const clean = issues.length === 0;
    const ref = i.case_code ?? i.title;
    const draft = clean
      ? `Checked ${ref}: required evidence present; veterinary authorisation by ${vet ?? "n/a"}; evidence reviewed by ${reviewed}; ${i.claimed_units} × ${i.unit_rate} = ${i.claimed_amount}.`
      : `Query on ${ref}: ${issues.join("; ")}. Please supply or correct this and resubmit the claim.`;
    return { key: i.key, clean, issues, draft, suggested: clean ? "accepted" : "query" };
  });
  const tally = new Map<string, number>();
  for (const c of checks) for (const x of c.issues) { const k = x.split(":")[0]; tally.set(k, (tally.get(k) ?? 0) + 1); }
  const pending = (k: string) => items.find((i) => i.key === k)?.decision === "pending";
  return {
    checks,
    clean: checks.filter((c) => c.clean && pending(c.key)).length,
    exceptions: checks.filter((c) => !c.clean && pending(c.key)).length,
    decided: items.filter((i) => i.decision !== "pending").length,
    byIssue: [...tally].map(([issue, count]) => ({ issue, count })).sort((a, b) => b.count - a.count),
  };
}
