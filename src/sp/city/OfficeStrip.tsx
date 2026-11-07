"use client";

/* The reviewing office's command view, above the public city record.
   Everything here is read from what this office is authorised to see:
   packages operators submitted to it, their claims and contracts, and the
   records inside the waiting packages. Nothing is estimated; an amount the
   record cannot support is shown as unknown, and accepted is never paid. */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { myContext, orgNames, packageCases, packages, type AbcContext, type Package, type PackageCase } from "@/lib/abc";
import { readContracts, readReconciliation, money, type Contract, type ContractRate, type Reconciliation } from "@/lib/reconciliation";

const days = (iso: string) => Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000));
const REQUIRED = ["capture_photo", "surgery_record", "ear_notch_photo", "release_photo", "release_location"];
const sum = (xs: (string | null)[]) => xs.reduce<number | null>((t, x) => (x === null || t === null ? t : t + Number(x)), 0);

export function OfficeStrip() {
  const { user } = useAuth();
  const [ctx, setCtx] = useState<AbcContext | null>(null);
  const [list, setList] = useState<Package[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [recs, setRecs] = useState<Record<string, Reconciliation | "unknown">>({});
  const [cases, setCases] = useState<PackageCase[] | null>(null);
  const [terms, setTerms] = useState<{ contracts: Contract[]; rates: ContractRate[] } | null>(null);

  useEffect(() => {
    if (!user) return;
    let live = true;
    Promise.all([myContext(), packages()])
      .then(async ([c, p]) => {
        const mine = p.filter((x) => c.offices.some((o) => o.id === x.office_id) && x.status !== "draft");
        if (!live) return;
        setCtx(c); setList(mine);
        if (!c.offices.length) return;
        orgNames([...new Set(mine.map((x) => x.ngo_id))]).then((n) => live && setNames(n)).catch(() => {});
        readContracts().then((t) => live && setTerms(t)).catch(() => {});
        /* Claims: the twelve most recent submissions are enough for a year of monthly packages. */
        for (const x of mine.slice(0, 12)) readReconciliation(x.id).then((r) => live && setRecs((m) => ({ ...m, [x.id]: r }))).catch(() => live && setRecs((m) => ({ ...m, [x.id]: "unknown" })));
        /* Evidence: the records inside packages that wait on this office. */
        const waiting = mine.filter((x) => x.status === "submitted").slice(0, 5);
        Promise.all(waiting.map((x) => packageCases(x.id).catch(() => [] as PackageCase[]))).then((r) => live && setCases(r.flat())).catch(() => live && setCases([]));
      })
      .catch(() => { /* not a reviewing office, or review not switched on: the view stays away */ });
    return () => { live = false; };
  }, [user]);

  const year = String(new Date().getFullYear());
  const v = useMemo(() => {
    if (!list) return null;
    const waiting = list.filter((p) => p.status === "submitted").sort((a, b) => (a.submitted_at ?? a.created_at).localeCompare(b.submitted_at ?? b.created_at));
    const oldest = waiting.length ? days(waiting[0].submitted_at ?? waiting[0].created_at) : null;
    const withOperator = list.filter((p) => p.status === "queried" || p.status === "returned");
    const decided = list.filter((p) => (p.status === "accepted" || p.status === "partially_accepted") && (p.decided_at ?? "").startsWith(year));
    const records = decided.reduce((n, p) => n + (p.summary.records ?? p.case_ids.length), 0);
    const ops = [...new Set(list.map((p) => p.ngo_id))];
    return { waiting, oldest, withOperator, decided, records, ops };
  }, [list, year]);

  if (!ctx || !list || !v || ctx.offices.length === 0) return null;
  const office = ctx.offices[0];

  /* Claims across the packages read so far. */
  const read = Object.values(recs).filter((r): r is Reconciliation => r !== "unknown");
  const thisYear = read.filter((r) => list.find((p) => p.id === r.package_id && (p.submitted_at ?? p.created_at).startsWith(year)));
  const claimed = sum(thisYear.map((r) => r.claimed_amount));
  const accepted = sum(thisYear.map((r) => r.accepted_amount));
  const paid = sum(thisYear.map((r) => r.paid_amount));
  const noAmount = thisYear.filter((r) => r.claimed_amount === null).length;

  /* Evidence completeness inside waiting packages. */
  const complete = cases?.filter((c) => REQUIRED.every((k) => c.evidence.some((e) => e.kind === k))).length ?? 0;
  const signed = cases?.filter((c) => !!c.vet_name).length ?? 0;
  const reviewed = cases?.filter((c) => !!c.reviewer_name).length ?? 0;

  const today = new Date().toISOString().slice(0, 10);
  const contractOf = (ngo: string) => terms?.contracts.filter((c) => c.ngo_id === ngo && c.office_id === office.id && c.starts_on <= today && c.ends_on >= today)[0] ?? null;

  return (
    <section className="os" aria-label={`${office.name}: operations and decisions`}>
      <div className="os-top"><p className="os-k">{office.name}</p><span className="os-scope">Your office&rsquo;s records{office.city ? ` · ${office.city}` : ""}</span></div>
      <ul className="os-tiles">
        <li className={v.waiting.length ? "is-due" : undefined}><Link href="/city/review"><span>Waiting for your decision</span><b>{v.waiting.length}</b><small>{v.oldest === null ? "Nothing waiting" : v.oldest === 0 ? "Submitted today" : `Oldest waiting ${v.oldest} ${v.oldest === 1 ? "day" : "days"}`}</small><ArrowRight size={14} aria-hidden /></Link></li>
        <li><Link href="/city/review?tab=operator"><span>With the operator</span><b>{v.withOperator.length}</b><small>Queried or returned</small><ArrowRight size={14} aria-hidden /></Link></li>
        <li><Link href="/city/review?tab=all"><span>Decided in {year}</span><b>{v.decided.length}</b><small>{v.records} {v.records === 1 ? "record" : "records"} · accepted is not paid</small><ArrowRight size={14} aria-hidden /></Link></li>
        <li><Link href="/city/contracts"><span>Operators submitting</span><b>{v.ops.length}</b><small>Contracts &amp; rates</small><ArrowRight size={14} aria-hidden /></Link></li>
      </ul>

      <div className="os-grid">
        <div className="os-card">
          <h3>Claims in {year}</h3>
          {Object.keys(recs).length === 0 && list.length > 0 ? <p className="os-muted">Reading claims…</p> : thisYear.length === 0 ? <p className="os-muted">No claims submitted to this office yet this year.</p> : (
            <dl className="os-money">
              <div><dt>Claimed</dt><dd>{claimed === null ? "Unknown" : money(String(claimed))}</dd></div>
              <div><dt>Accepted</dt><dd>{accepted === null ? "Unknown" : money(String(accepted))}</dd></div>
              <div><dt>Payment evidence</dt><dd>{paid === null || paid === 0 ? "None recorded" : money(String(paid))}</dd></div>
            </dl>
          )}
          <p className="os-note">Accepted is not paid. Payment evidence is what your office records; StrayPaw does not process payments.{noAmount ? ` ${noAmount} ${noAmount === 1 ? "package has" : "packages have"} no contract amount.` : ""}</p>
          {v.waiting.length > 0 && <>
            <h4>Waiting longest</h4>
            <ul className="os-list">{v.waiting.slice(0, 3).map((p) => <li key={p.id}><Link href={`/city/review/${p.id}`}><span><b>{p.title}</b><small>{names[p.ngo_id] ?? "Operator"} · {p.summary.records ?? p.case_ids.length} records · {days(p.submitted_at ?? p.created_at) || "today"}{days(p.submitted_at ?? p.created_at) ? " days" : ""}</small></span><em>Review</em></Link></li>)}</ul>
          </>}
        </div>

        <div className="os-card">
          <h3>Operators</h3>
          <table className="os-table">
            <thead><tr><th scope="col">Operator</th><th scope="col">Contract in force</th><th scope="col">Waiting</th><th scope="col">Decided</th></tr></thead>
            <tbody>{v.ops.map((id) => { const ps = list.filter((p) => p.ngo_id === id); const k = contractOf(id); const rate = k ? terms?.rates.find((r) => r.contract_id === k.id) : null; return (
              <tr key={id}><th scope="row"><Link href={`/city/review?op=${id}`}>{names[id] ?? "Operator"}</Link></th>
                <td>{terms === null ? "…" : k ? <>{rate ? `${money(rate.unit_rate)} ${rate.code}` : k.name}{k.illustrative ? <small> illustrative</small> : null}</> : <small>None in force</small>}</td>
                <td>{ps.filter((p) => p.status === "submitted").length}</td>
                <td>{ps.filter((p) => p.status === "accepted" || p.status === "partially_accepted").length}</td></tr>); })}</tbody>
          </table>
          <h4>Evidence in waiting packages</h4>
          {v.waiting.length === 0 ? <p className="os-muted">No package is waiting.</p> : cases === null ? <p className="os-muted">Reading records…</p> : (
            <ul className="os-bars">
              <li><span>All five evidence items</span><b>{complete} of {cases.length}</b><i style={{ ["--p" as string]: cases.length ? complete / cases.length : 0 }} /></li>
              <li><span>Vet sign-off</span><b>{signed} of {cases.length}</b><i style={{ ["--p" as string]: cases.length ? signed / cases.length : 0 }} /></li>
              <li><span>Operator evidence review</span><b>{reviewed} of {cases.length}</b><i style={{ ["--p" as string]: cases.length ? reviewed / cases.length : 0 }} /></li>
            </ul>
          )}
        </div>
      </div>
      <p className="os-divider"><b>Public record</b> Published research data for the city, separate from your office&rsquo;s operational records.</p>
    </section>
  );
}
