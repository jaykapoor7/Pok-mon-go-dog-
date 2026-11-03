import { getSupabase } from "./supabase";

/* The authoritative billing preview (abc_billing_preview): every claimable
   procedure in the period under the same rule the package uses, priced from
   the one contract version covering the period for this operator and office.
   Amounts are exact decimal strings from the database. */

export type PreviewClaim = { case_id: string; case_code: string | null; procedure: string; procedure_date: string; rate_id: string | null; unit_rate: string | null };
export type BillingPreview = {
  period_start: string; period_end: string; office_id: string;
  contract: { id: string; name: string; version: number; reference: string; illustrative: boolean } | null;
  claims: PreviewClaim[]; count: number; unpriced: number; total: string | null; too_many: boolean; basis: "procedure_date";
};
export type PreviewResult = { state: "ok"; preview: BillingPreview } | { state: "not_deployed" } | { state: "error"; message: string };

const MISSING = new Set(["PGRST202", "42883"]);
export async function readBillingPreview(start: string, end: string, office: string): Promise<PreviewResult> {
  const db = getSupabase();
  if (!db) return { state: "error", message: "Sign in again." };
  const { data, error } = await db.rpc("abc_billing_preview", { p_start: start, p_end: end, p_office: office });
  if (error) return error.code && MISSING.has(error.code) ? { state: "not_deployed" } : { state: "error", message: error.message };
  return { state: "ok", preview: data as BillingPreview };
}

/** Bill lines by procedure, summed exactly in paise from the database's own rate strings. */
export function billLines(p: BillingPreview) {
  const paise = (v: string) => { const m = v.match(/^(\d+)(?:\.(\d{1,2}))?$/); return m ? Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0")) : NaN; };
  const by = new Map<string, { units: number; rate: string | null; paise: number | null }>();
  for (const c of p.claims) {
    const l = by.get(c.procedure) ?? { units: 0, rate: c.unit_rate, paise: 0 };
    l.units++;
    l.paise = l.paise === null || c.unit_rate === null ? null : l.paise + paise(c.unit_rate);
    by.set(c.procedure, l);
  }
  const rupees = (n: number) => `${Math.floor(n / 100)}.${String(n % 100).padStart(2, "0")}`;
  return [...by].map(([procedure, l]) => ({ procedure, units: l.units, rate: l.rate, amount: l.paise === null ? null : rupees(l.paise) }));
}
