"use client";

/* Municipality · Package review: report packages that operators have
   submitted to the offices this person sits in. Drafts never appear; the
   database shows a package only once it is submitted, and only to its
   own office's reviewers. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, FileCheck2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { NotEnabled, PACKAGE_LABEL, myContext, orgNames, packageCases, packages, type AbcContext, type Package } from "@/lib/abc";
import { readReconciliation } from "@/lib/reconciliation";
import { checkPackage, type PackageCheck } from "@/sp3/ai/packageCheck";
import { Reading } from "../ui/Reading";
import { Empty, PageHead, Seg } from "../ui/Page";
import { period } from "./Packages";
import "../ngo/ngo.css";
import "./abc.css";
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
  const [tab, setTab] = useState<Tab>(askedTab === "operator" || askedTab === "all" || askedTab === "accepted" ? askedTab : "waiting");
  const [op, setOp] = useState<string | null>(params?.get("op") ?? null);
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

  /* One page: the sentence says what waits and whether any of it is late; the lanes are the lists; each row says what the package is and what Kaju found. */
  return (
    <div className="vw gv">
      <PageHead title="Review submissions"
        sum={off ? "Not switched on yet." : !ctx && !err ? <Reading>Reading your office&apos;s packages</Reading> : ctx && ctx.offices.length === 0 ? "Your account is not part of a reviewing office." : !list ? null
          : <><b>{waiting.length}</b> {waiting.length === 1 ? "package needs" : "packages need"} your decision{waiting.length ? (overdue ? <>, <span className="is-hot">{overdue} over 14 days</span></> : ", none over 14 days") : null}.{waiting.length ? (unread ? ` Kaju is still checking ${unread === 1 ? "one" : unread}.` : exceptions ? <> Kaju found <b>{exceptions}</b> claim {exceptions === 1 ? "exception" : "exceptions"}; you decide.</> : " Kaju found no claim exceptions; you decide.") : null}</>}
        actions={ctx && ctx.offices.length > 0 ? <Link className="btn is-s" href="/city/contracts">Contracts and rates</Link> : undefined} />
      {off ? <Empty title="Package review is not switched on here yet" />
        : err ? <p className="abc-err" role="alert">{err}</p>
        : ctx && ctx.offices.length === 0 ? <Empty title="No reviewing office" action={<Link className="btn is-s" href="/contact">Contact us</Link>}>Ask your programme lead to add you to the office.</Empty>
        : list ? (
          <>
            <div className="vw-bar">
              <Seg<Tab> label="Show" value={tab} onChange={setTab} options={[
                { id: "waiting", label: "Waiting for you", count: waiting.length, tone: overdue ? "flame" : undefined },
                { id: "operator", label: "With the operator", count: onOperator.length },
                { id: "accepted", label: "Accepted", count: accepted.length },
                { id: "all", label: "All", count: list.length },
              ]} />
              {op ? <p className="vw-note" style={{ margin: 0 }}>Only {names[op] ?? "one operator"}<button type="button" onClick={() => setOp(null)}>Show every operator</button></p> : null}
            </div>
            <div className="gv-cols">
              <section className="gv-main" aria-label={tab === "waiting" ? "Waiting for your decision" : tab === "operator" ? "With the operator" : tab === "accepted" ? "Accepted" : "All submissions"}>
                {shownTab.length ? (
                  <ul className="vw-list">{shownTab.map((p, j) => {
                    const c = checks[p.id], d = days(p.submitted_at), wait = isWaitingOnOffice(p.status);
                    const n = p.summary.records ?? p.case_ids.length;
                    return (
                      <li key={p.id} style={{ ["--j" as string]: j }}>
                        <Link href={`/city/review/${p.id}`} className="vw-row">
                          <span className="vw-glyph" data-tone={wait ? (d !== null && d > 14 ? "flame" : "blue") : p.status === "accepted" ? "green" : undefined} aria-hidden><FileCheck2 size={16} /></span>
                          <span className="vw-row-t"><b>{p.title}</b><small>{[names[p.ngo_id] ?? "Operator", period(p), `${n} ${n === 1 ? "animal" : "animals"}`, wait && d !== null ? `waiting ${d} ${d === 1 ? "day" : "days"}` : null].filter(Boolean).join(" · ")}</small></span>
                          <span className="vw-row-next">{wait ? (c === "unavailable" ? <span>Kaju could not read the claims</span> : c ? <span><i>Kaju</i> {c.clean} clean · {c.exceptions} with exceptions{c.byIssue[0] ? ` (${c.byIssue[0].issue.toLowerCase()})` : ""}</span> : p.item_review_enabled ? <span>Kaju is checking…</span> : null) : null}</span>
                          <span className="vw-tag" data-tone={wait ? "blue" : p.status === "accepted" ? "green" : p.status === "partially_accepted" ? "amber" : isWithOperator(p.status) ? "amber" : undefined}>{PACKAGE_LABEL[p.status]}</span>
                          <ArrowRight size={14} aria-hidden className="vw-go" />
                        </Link>
                      </li>
                    );
                  })}</ul>
                ) : <Empty title={tab === "waiting" ? "Nothing is waiting for your decision" : tab === "operator" ? "No package is with an operator" : tab === "accepted" ? "Nothing accepted yet" : "No submissions yet"}>{tab === "waiting" ? "Monthly packages appear here as soon as an operator submits them." : undefined}</Empty>}
                {tab === "accepted" || tab === "all" ? <p className="gv-foot">Accepted means approved for payment. It is not a payment.</p> : null}
              </section>

              {by.size > 1 || op ? <aside className="gv-side" aria-label="Operators">
                <h2 className="gv-h">Operators</h2>
                <ul className="gv-ops">{[...by].map(([id, ps]) => {
                  const w = ps.filter((p) => isWaitingOnOffice(p.status)).length, q = ps.filter((p) => isWithOperator(p.status)).length, a = ps.filter((p) => p.status === "accepted" || p.status === "partially_accepted").length;
                  return <li key={id}><button type="button" aria-pressed={op === id} onClick={() => setOp(op === id ? null : id)}><b>{names[id] ?? "Operator"}</b><small>{w} waiting · {q} with them · {a} accepted</small></button></li>;
                })}</ul>
              </aside> : null}
            </div>
          </>
        ) : null}
      {office ? <p className="gv-foot">{office}. Only packages its operators have submitted appear here; drafts never do.</p> : null}
    </div>
  );
}
