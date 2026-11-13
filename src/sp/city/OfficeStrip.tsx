"use client";

/* The reviewing office's command view, above the public city record.
   Everything here is read from what this office is authorised to see:
   packages operators submitted to it, their claims and contracts, and the
   records inside the waiting packages. Nothing is estimated; an amount the
   record cannot support is shown as unknown, and accepted is never paid. */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ClipboardCheck, Undo2 } from "lucide-react";
import { AskKaju, DailyHead, NeedsYou } from "../ui/Daily";
import { useAuth } from "@/components/auth/AuthProvider";
import { myContext, orgNames, packageCases, packages, type AbcContext, type Package, type PackageCase } from "@/lib/abc";
import { readContracts, readReconciliation, money, type Contract, type ContractRate, type Reconciliation } from "@/lib/reconciliation";
import { isDecided, isVisibleToOffice, isWaitingOnOffice, isWithOperator } from "@/lib/machines/package";

const days = (iso: string) => Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000));
const REQUIRED = ["capture_photo", "surgery_record", "ear_notch_photo", "release_photo", "release_location"];
const sum = (xs: (string | null)[]) => xs.reduce<number | null>((t, x) => (x === null || t === null ? t : t + Number(x)), 0);

export function OfficeStrip({ onOffice, publicOpen, onPublic }: { onOffice?: (on: boolean) => void; publicOpen?: boolean; onPublic?: () => void } = {}) {
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
        const mine = p.filter((x) => c.offices.some((o) => o.id === x.office_id) && isVisibleToOffice(x.status));
        if (!live) return;
        setCtx(c); setList(mine);
        if (!c.offices.length) return;
        onOffice?.(true);
        orgNames([...new Set(mine.map((x) => x.ngo_id))]).then((n) => live && setNames(n)).catch(() => {});
        readContracts().then((t) => live && setTerms(t)).catch(() => {});
        /* Claims: the twelve most recent submissions are enough for a year of monthly packages. */
        for (const x of mine.slice(0, 12)) readReconciliation(x.id).then((r) => live && setRecs((m) => ({ ...m, [x.id]: r }))).catch(() => live && setRecs((m) => ({ ...m, [x.id]: "unknown" })));
        /* Evidence: the records inside packages that wait on this office. */
        const waiting = mine.filter((x) => isWaitingOnOffice(x.status)).slice(0, 5);
        Promise.all(waiting.map((x) => packageCases(x.id).catch(() => [] as PackageCase[]))).then((r) => live && setCases(r.flat())).catch(() => live && setCases([]));
      })
      .catch(() => { /* not a reviewing office, or review not switched on: the view stays away */ });
    return () => { live = false; };
  }, [user]);

  const year = String(new Date().getFullYear());
  const v = useMemo(() => {
    if (!list) return null;
    const waiting = list.filter((p) => isWaitingOnOffice(p.status)).sort((a, b) => (a.submitted_at ?? a.created_at).localeCompare(b.submitted_at ?? b.created_at));
    const oldest = waiting.length ? days(waiting[0].submitted_at ?? waiting[0].created_at) : null;
    const withOperator = list.filter((p) => isWithOperator(p.status));
    const decided = list.filter((p) => isDecided(p.status) && (p.decided_at ?? "").startsWith(year));
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

  const ev = [
    { label: "All five evidence items", n: complete },
    { label: "Vet signed", n: signed },
    { label: "Operator reviewed", n: reviewed },
  ];

  /* One column, the same as every home: what needs a decision, then what the
     waiting packages hold, then the year's claims, then who submits. Each fact
     once, no boxes around sections. */
  return (
    <section className="os" aria-label={`${office.name}: operations and decisions`}>
      <div className="dy os-brief">
        <DailyHead name={user?.name} since={<>{office.name}{office.city ? `, ${office.city}` : ""}: <b>{v.waiting.length} {v.waiting.length === 1 ? "package" : "packages"} waiting for your decision</b>{v.oldest !== null && v.waiting.length ? ` (oldest ${v.oldest === 0 ? "today" : `${v.oldest} ${v.oldest === 1 ? "day" : "days"}`})` : ""}, {v.withOperator.length} with the operator, {v.decided.length} decided in {year}.</>} />
        <NeedsYou rows={[
          ...(v.waiting.length ? [{ key: "wait", href: v.waiting.length === 1 ? `/city/review/${v.waiting[0].id}` : "/city/review", tone: "violet", icon: <ClipboardCheck size={10} strokeWidth={2.4} />, title: v.waiting.length === 1 ? <><b>{v.waiting[0].title}</b> waits for your decision</> : <><b>{v.waiting.length} packages</b> wait for your decision</>, meta: [v.waiting.length === 1 ? names[v.waiting[0].ngo_id] : null, v.oldest === null ? null : v.oldest === 0 ? "submitted today" : `${v.waiting.length === 1 ? "waiting" : "oldest waiting"} ${v.oldest} ${v.oldest === 1 ? "day" : "days"}`].filter(Boolean).join(" · "), tag: "Decide", verb: "Review" }] : []),
          ...(v.withOperator.length ? [{ key: "op", href: "/city/review?tab=operator", tone: "amber", icon: <Undo2 size={10} strokeWidth={2.4} />, title: <><b>{v.withOperator.length}</b> queried or returned to the operator</>, meta: "Waiting on their answer", tag: "With operator", verb: "Open" }] : []),
        ]} clear="No package is waiting for your office." />
        <AskKaju questions={["Which packages have waited longest?", "What did we query last month, and why?", "How many sterilisations were accepted this year?", "Which wards have no operator?"]} />

        {v.waiting.length > 0 && <section className="dy-sec" aria-labelledby="os-ev-h">
          <h2 id="os-ev-h" className="dy-h">In the waiting {v.waiting.length === 1 ? "package" : "packages"}</h2>
          {cases === null ? <p className="os-muted">Reading records…</p> : cases.length === 0 ? <p className="os-muted">No records inside.</p> : (
            <ul className="os-ev">{ev.map((x) => (
              <li key={x.label}><span>{x.label}</span><b>{x.n} <small>of {cases.length}</small></b><i aria-hidden style={{ ["--p" as string]: x.n / cases.length }} data-full={x.n === cases.length ? "" : undefined} /></li>
            ))}</ul>
          )}
        </section>}

        <section className="dy-sec" aria-labelledby="os-claims-h">
          <h2 id="os-claims-h" className="dy-h">Claims in {year}</h2>
          {Object.keys(recs).length === 0 && list.length > 0 ? <p className="os-muted">Reading claims…</p> : thisYear.length === 0 ? <p className="os-muted">No claims submitted to this office yet this year.</p> : (
            <dl className="os-figs">
              <div><dt>Claimed</dt><dd>{claimed === null ? "Unknown" : money(String(claimed))}</dd></div>
              <div><dt>Accepted</dt><dd>{accepted === null ? "Unknown" : money(String(accepted))}</dd></div>
              <div><dt>Payment evidence</dt><dd className={paid === null || paid === 0 ? "is-none" : undefined}>{paid === null || paid === 0 ? "None recorded" : money(String(paid))}</dd></div>
            </dl>
          )}
          <p className="os-note">Accepted is not paid. Payment evidence is what your office records; StrayPaw does not process payments.{noAmount ? ` ${noAmount} ${noAmount === 1 ? "package has" : "packages have"} no contract amount.` : ""}</p>
        </section>

        <section className="dy-sec" aria-labelledby="os-ops-h">
          <header className="dy-sec-head"><h2 id="os-ops-h" className="dy-h">{v.ops.length === 1 ? "Operator" : `${v.ops.length} operators`}</h2><Link href="/city/contracts">Contracts and rates <ArrowRight size={13} aria-hidden /></Link></header>
          <ul className="os-ops">{v.ops.map((id) => {
            const ps = list.filter((p) => p.ngo_id === id), k = contractOf(id), rate = k ? terms?.rates.find((r) => r.contract_id === k.id) : null;
            const w = ps.filter((p) => isWaitingOnOffice(p.status)).length, d = ps.filter((p) => isDecided(p.status)).length;
            return (
              <li key={id}><Link href={`/city/review?op=${id}`}>
                <span className="os-ops-t"><b>{names[id] ?? "Operator"}</b><small>{terms === null ? "Reading the contract…" : k ? <>{rate ? `${money(rate.unit_rate)} per ${rate.code}` : k.name}, to {new Date(`${k.ends_on}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}{k.illustrative ? " · illustrative" : ""}</> : "No contract in force"}</small></span>
                <span className="os-ops-n">{w ? <em>{w} waiting</em> : null}<span>{d} decided</span></span>
                <ArrowRight size={14} aria-hidden className="os-ops-go" />
              </Link></li>
            );
          })}</ul>
        </section>

        {onPublic ? <button type="button" className="os-divider" aria-expanded={!!publicOpen} onClick={onPublic}><b>Public record</b><span>Published research data for the city, separate from your office&rsquo;s records.</span><em>{publicOpen ? "Hide" : "Show"}</em></button>
          : <p className="os-divider"><b>Public record</b> Published research data for the city, separate from your office&rsquo;s operational records.</p>}
      </div>
    </section>
  );
}
