"use client";

/* The reviewing office's command view, above the public city record.
   Everything here is read from what this office is authorised to see:
   packages operators submitted to it, their claims and contracts, and the
   records inside the waiting packages. Nothing is estimated; an amount the
   record cannot support is shown as unknown, and accepted is never paid. */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ClipboardCheck, Undo2 } from "lucide-react";
import { Btn, Head, Panel, Row, Rows, Section, Stats, Table, Tag, type Col } from "@/ws/kit";
import { AskKaju, firstName, greeting } from "../ui/Daily";
import "../ngo/brief.css";
import { useAuth } from "@/components/auth/AuthProvider";
import { myContext, orgNames, packageCases, packages, type AbcContext, type Package, type PackageCase } from "@/lib/abc";
import { readContracts, readReconciliation, money, type Contract, type ContractRate, type Reconciliation } from "@/lib/reconciliation";
import { isDecided, isVisibleToOffice, isWaitingOnOffice, isWithOperator } from "@/lib/machines/package";

/* Only what Kaju answers from this office's own packages and the public record. */
const ASK = ["What is waiting for me today?", "Which package has waited longest?", "Show ward coverage and sudden changes"];
const days = (iso: string) => Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000));
const REQUIRED = ["capture_photo", "surgery_record", "ear_notch_photo", "release_photo", "release_location"];
const sum = (xs: (string | null)[]) => xs.reduce<number | null>((t, x) => (x === null || t === null ? t : t + Number(x)), 0);

export function OfficeStrip({ onOffice }: { onOffice?: (on: boolean) => void; publicOpen?: boolean; onPublic?: () => void } = {}) {
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

  /* One column, one screen: the sentence, what waits for a decision (each package a row), what the
     waiting packages hold, the year's claims, then who submits. Each fact once. */
  const first = firstName(user?.name);
  const SHOW = 4;
  const wait = (p: Package) => { const d = days(p.submitted_at ?? p.created_at); return d === 0 ? "submitted today" : `waiting ${d} ${d === 1 ? "day" : "days"}`; };
  type Op = { id: string; name: string; contract: ReactNode; waiting: number; decided: number };
  const ops: Op[] = v.ops.map((id) => {
    const ps = list.filter((p) => p.ngo_id === id), k = contractOf(id), rate = k ? terms?.rates.find((r) => r.contract_id === k.id) : null;
    return {
      id, name: names[id] ?? "Operator",
      contract: terms === null ? "Reading the contract…" : k ? <>{rate ? `${money(rate.unit_rate)} per ${rate.code}` : k.name}, to {new Date(`${k.ends_on}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}{k.illustrative ? " · illustrative" : ""}</> : "No contract in force",
      waiting: ps.filter((p) => isWaitingOnOffice(p.status)).length, decided: ps.filter((p) => isDecided(p.status)).length,
    };
  });
  const cols: Col<Op>[] = [
    { key: "name", label: "Operator", width: "minmax(0, 1.2fr)", render: (o) => o.name },
    { key: "contract", label: "Contract in force", width: "minmax(0, 2fr)", render: (o) => o.contract },
    { key: "waiting", label: "Waiting", width: "96px", align: "end", keep: true, render: (o) => (o.waiting ? <Tag tone="violet">{o.waiting} waiting</Tag> : "None") },
    { key: "decided", label: "Decided", width: "80px", align: "end", render: (o) => o.decided },
  ];
  const needs = v.waiting.length > 0 || v.withOperator.length > 0;

  return (
    <section className="mh-office" aria-label={`${office.name}: operations and decisions`}>
      <Head title={`${greeting()}${first ? `, ${first}` : ""}.`}
        sum={<><b>{v.waiting.length} {v.waiting.length === 1 ? "package" : "packages"} waiting for your decision</b>{v.oldest !== null && v.waiting.length ? ` (oldest ${v.oldest === 0 ? "today" : `${v.oldest} ${v.oldest === 1 ? "day" : "days"}`})` : ""}.</>} />

      <div className="hm3-ask"><p className="hm3-ask-k">Ask Kaju</p><AskKaju questions={ASK} /></div>

      <Section title={needs ? "Needs you today" : "Today"}>
        <Panel>
          {needs ? (
            <Rows label="Needs you today">
              {v.waiting.slice(0, SHOW).map((p) => (
                <Row key={p.id} href={`/city/review/${p.id}`} tone="violet" icon={<ClipboardCheck size={14} />} title={p.title} meta={[names[p.ngo_id], wait(p)].filter(Boolean).join(" · ")} end={<Tag tone="violet">Decide</Tag>} />
              ))}
              {v.waiting.length > SHOW ? <Row href="/city/review" title={`All ${v.waiting.length} waiting packages`} meta="Oldest first, in Review" /> : null}
              {v.withOperator.length ? <Row href="/city/review?tab=operator" tone="amber" icon={<Undo2 size={14} />} title={`${v.withOperator.length} queried or returned to the operator`} meta="Waiting on their answer" end={<Tag tone="amber">With operator</Tag>} /> : null}
            </Rows>
          ) : <p className="mh-quiet">No package is waiting for your office.</p>}
        </Panel>
      </Section>

      {v.waiting.length > 0 && (
        <Section title={`In the waiting ${v.waiting.length === 1 ? "package" : "packages"}`} note={cases?.length ? `${cases.length} ${cases.length === 1 ? "record" : "records"} inside` : undefined}>
          <Panel>
            {cases === null ? <p className="mh-quiet">Reading records…</p> : cases.length === 0 ? <p className="mh-quiet">No records inside.</p> : (
              <ul className="mh-meters">{ev.map((x) => (
                <li key={x.label}><span>{x.label}</span><b>{x.n} <small>of {cases.length}</small></b><i aria-hidden style={{ ["--p" as string]: x.n / cases.length }} /></li>
              ))}</ul>
            )}
          </Panel>
        </Section>
      )}

      <Section title={`Claims in ${year}`}>
        {Object.keys(recs).length === 0 && list.length > 0 ? <p className="mh-quiet">Reading claims…</p> : thisYear.length === 0 ? <p className="mh-quiet">No claims submitted to this office yet this year.</p> : (
          <Stats label={`Claims in ${year}`} items={[
            { label: "Claimed", value: claimed === null ? "Unknown" : money(String(claimed)) },
            { label: "Accepted", value: accepted === null ? "Unknown" : money(String(accepted)) },
            { label: "Payment evidence", value: paid === null || paid === 0 ? "None recorded" : money(String(paid)) },
          ]} />
        )}
        <p className="mh-note">Accepted is not paid. StrayPaw does not process payments.{noAmount ? ` ${noAmount} ${noAmount === 1 ? "package has" : "packages have"} no contract amount.` : ""}</p>
      </Section>

      <Section title={v.ops.length === 1 ? "Operator" : "Operators"} count={v.ops.length === 1 ? null : v.ops.length} action={<Btn small variant="quiet" href="/city/contracts">Contracts and rates</Btn>}>
        <Panel><Table label="Operators that submit to this office" cols={cols} rows={ops} rowKey={(o) => o.id} href={(o) => `/city/review?op=${o.id}`} empty={<p className="mh-quiet">No operator has submitted a package yet.</p>} /></Panel>
      </Section>
    </section>
  );
}
