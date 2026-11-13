"use client";

/* Municipality · Package review: report packages that operators have
   submitted to the offices this person sits in. Drafts never appear; the
   database shows a package only once it is submitted, and only to its
   own office's reviewers. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { NotEnabled, PACKAGE_LABEL, myContext, orgNames, packageCases, packages, type AbcContext, type Package } from "@/lib/abc";
import { readReconciliation } from "@/lib/reconciliation";
import { checkPackage, type PackageCheck } from "@/sp3/ai/packageCheck";
import { Btn, Empty, Head, Lanes, Page, Panel, Section, Split, Table, Tag, Tools, type Col } from "@/ws/kit";
import { usePageState } from "@/ws/store";
import { Pager, pageOf } from "./Pager";
import { period } from "./Packages";
import "../ngo/ngo.css";
import { isVisibleToOffice, isWaitingOnOffice, isWithOperator } from "@/lib/machines/package";

type Tab = "waiting" | "operator" | "accepted" | "all";

export function ReviewInbox() {
  const { user, ready } = useAuth();
  const [ctx, setCtx] = useState<AbcContext | null>(null);
  const [list, setList] = useState<Package[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [off, setOff] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  /* The Overview links here already filtered: ?tab=operator|all and ?op=<operator>. */
  const params = useSearchParams();
  const askedTab = params?.get("tab");
  const [tab, setTab] = usePageState<Tab>("lane", askedTab === "operator" || askedTab === "all" || askedTab === "accepted" ? askedTab : "waiting");
  const [op, setOp] = usePageState<string | null>("op", params?.get("op") ?? null);
  const [page, setPage] = useState(0);
  const [checks, setChecks] = useState<Record<string, PackageCheck | "unavailable">>({});

  useEffect(() => {
    if (!user) return;
    let live = true;
    Promise.all([myContext(), packages()])
      .then(async ([c, p]) => {
        const mine = p.filter((x) => c.offices.some((o) => o.id === x.office_id) && isVisibleToOffice(x.status));
        const n = await orgNames([...new Set(mine.map((x) => x.ngo_id))]);
        if (live) { setCtx(c); setList(mine); setNames(n); }
      })
      .catch((e) => { if (!live) return; if (e instanceof NotEnabled) setOff(true); else setErr(e.message); });
    return () => { live = false; };
  }, [user]);

  /* Oldest submission first: the decision that has waited longest. */
  const waiting = useMemo(() => (list ?? []).filter((p) => isWaitingOnOffice(p.status)).sort((a, b) => (a.submitted_at ?? a.created_at).localeCompare(b.submitted_at ?? b.created_at)), [list]);
  const onOperator = useMemo(() => (list ?? []).filter((p) => isWithOperator(p.status)), [list]);
  const shown = tab === "waiting" ? waiting : tab === "operator" ? onOperator : list ?? [];
  /* Kaju checks the claims in each waiting package before it is opened. */
  useEffect(() => {
    let live = true;
    for (const p of waiting.slice(0, 8)) {
      if (checks[p.id] || !p.item_review_enabled) continue;
      Promise.all([readReconciliation(p.id), packageCases(p.id)])
        .then(([r, c]) => { if (live) setChecks((x) => ({ ...x, [p.id]: checkPackage(r.items, c) })); })
        .catch(() => { if (live) setChecks((x) => ({ ...x, [p.id]: "unavailable" })); });
    }
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);
  const days = (iso: string | null) => iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)) : null;

  if (ready && !user) return (
    <div className="ngo-door"><header className="ngo-door-head">
      <h1>Package review, for reviewing offices.</h1>
      <p className="ngo-door-sum">Submitted packages appear here.</p>
      <div className="ngo-door-act"><Link className="btn is-ink" href={`/sign-in?next=${encodeURIComponent("/city/review")}`}>Sign in</Link></div>
    </header></div>
  );

  const overdue = waiting.filter((p) => (days(p.submitted_at) ?? 0) > 14).length;
  const exceptions = Object.values(checks).reduce((n, c) => n + (c === "unavailable" ? 0 : c.exceptions), 0);
  const unread = waiting.filter((p) => p.item_review_enabled && (!checks[p.id] || checks[p.id] === "unavailable")).length;
  const accepted = (list ?? []).filter((p) => p.status === "accepted" || p.status === "partially_accepted");
  const shownTab = (tab === "accepted" ? accepted : shown).filter((p) => !op || p.ngo_id === op);
  const by = new Map<string, Package[]>();
  for (const p of list ?? []) by.set(p.ngo_id, [...(by.get(p.ngo_id) ?? []), p]);
  const office = ctx?.offices[0]?.name;

  const cols: Col<Package>[] = [
    { key: "pkg", label: "Package", width: "minmax(0, 1.6fr)", render: (p) => <span className="kx-cell"><span>{p.title}<small className="kx-sub">{[names[p.ngo_id] ?? "Operator", period(p)].join(" · ")}</small></span></span> },
    { key: "op", label: "Operator", render: (p) => names[p.ngo_id] ?? "Operator" },
    { key: "per", label: "Period", width: "168px", render: (p) => <span className="kx-num">{period(p)}</span> },
    { key: "n", label: "Animals", width: "72px", align: "end", render: (p) => p.summary.records ?? p.case_ids.length },
    { key: "wait", label: "Waiting", width: "88px", render: (p) => { const d = days(p.submitted_at); return isWaitingOnOffice(p.status) && d !== null ? <span className={d > 14 ? "kx-err" : undefined}>{d} {d === 1 ? "day" : "days"}</span> : null; } },
    { key: "kaju", label: "Kaju's check", width: "minmax(0, 1.4fr)", render: (p) => { const c = checks[p.id]; if (!isWaitingOnOffice(p.status)) return null; const t = c === "unavailable" ? "Kaju could not read the claims" : c ? `${c.clean} clean · ${c.exceptions} with exceptions${c.byIssue[0] ? ` (${c.byIssue[0].issue.toLowerCase()})` : ""}` : p.item_review_enabled ? "Kaju is checking…" : ""; return <span title={t}>{t}</span>; } },
    { key: "state", label: "Status", width: "136px", keep: true, render: (p) => <Tag tone={isWaitingOnOffice(p.status) ? "blue" : p.status === "accepted" ? "green" : p.status === "partially_accepted" ? "amber" : isWithOperator(p.status) ? "amber" : "plain"}>{PACKAGE_LABEL[p.status]}</Tag> },
  ];
  const { pg, pages, slice } = pageOf(shownTab, page, 20);
  const label = tab === "waiting" ? "Waiting for your decision" : tab === "operator" ? "With the operator" : tab === "accepted" ? "Accepted" : "All submissions";
  const main = (
    <>
      <Panel>
        <Table cols={cols} rows={slice} rowKey={(p) => p.id} href={(p) => `/city/review/${p.id}`} label={label}
          empty={<Empty title={tab === "waiting" ? "Nothing is waiting for your decision" : tab === "operator" ? "No package is with an operator" : tab === "accepted" ? "Nothing accepted yet" : "No submissions yet"}>{tab === "waiting" ? "Monthly packages appear here as soon as an operator submits them." : undefined}</Empty>} />
      </Panel>
      <Pager pg={pg} pages={pages} total={shownTab.length} size={20} onPage={setPage} />
      {tab === "accepted" || tab === "all" ? <p className="kx-quiet is-top">Accepted means approved for payment. It is not a payment.</p> : null}
    </>
  );

  /* One page: the sentence says what waits and whether any of it is late; the lanes are the lists; each row says what the package is and what Kaju found. */
  return (
    <Page>
      <Head title="Review"
        sum={off ? "Not switched on yet." : !ctx && !err ? "Reading your office's packages…" : ctx && ctx.offices.length === 0 ? "Your account is not part of a reviewing office." : !list ? null
          : <><b>{waiting.length}</b> {waiting.length === 1 ? "package needs" : "packages need"} your decision{waiting.length ? (overdue ? <>, <span className="is-hot">{overdue} over 14 days</span></> : ", none over 14 days") : null}.{waiting.length ? (unread ? ` Kaju is still checking ${unread === 1 ? "one" : unread}.` : exceptions ? <> Kaju found <b>{exceptions}</b> claim {exceptions === 1 ? "exception" : "exceptions"}; you decide.</> : " Kaju found no claim exceptions; you decide.") : null}</>} />
      {off ? <Panel><Empty title="Package review is not switched on here yet" /></Panel>
        : err ? <p className="kx-said" data-tone="err" role="alert">{err}</p>
        : ctx && ctx.offices.length === 0 ? <Panel><Empty title="No reviewing office" action={<Btn href="/contact">Contact us</Btn>}>Ask your programme lead to add you to the office.</Empty></Panel>
        : list ? (
          <>
            <Tools end={op ? <span className="kx-quiet">Only {names[op] ?? "one operator"} · <button type="button" className="kx-link" onClick={() => setOp(null)}>Show every operator</button></span> : undefined}>
              <Lanes<Tab> label="Show" value={tab} onChange={(t) => { setTab(t); setPage(0); }} lanes={[
                { id: "waiting", label: "Waiting for you", count: waiting.length, tone: overdue ? "flame" : undefined },
                { id: "operator", label: "With the operator", count: onOperator.length },
                { id: "accepted", label: "Accepted", count: accepted.length },
                { id: "all", label: "All", count: list.length },
              ]} />
            </Tools>
            {by.size > 1 || op ? <Split side={
              <Section title="Operators">
                <Panel><ul className="k-rows" aria-label="Operators">{[...by].map(([id, ps]) => {
                  const w = ps.filter((p) => isWaitingOnOffice(p.status)).length, q = ps.filter((p) => isWithOperator(p.status)).length, a = ps.filter((p) => p.status === "accepted" || p.status === "partially_accepted").length;
                  return <li key={id}><button type="button" className="k-row" aria-pressed={op === id} onClick={() => { setOp(op === id ? null : id); setPage(0); }}><span className="k-row-t"><b>{names[id] ?? "Operator"}</b><small>{w} waiting · {q} with them · {a} accepted</small></span>{op === id ? <span className="k-row-e"><Tag tone="blue">Shown</Tag></span> : null}</button></li>;
                })}</ul></Panel>
              </Section>}>{main}</Split> : main}
          </>
        ) : null}
    </Page>
  );
}
