"use client";

/* Municipality · Package review: report packages that operators have
   submitted to the offices this person sits in. Drafts never appear; the
   database shows a package only once it is submitted, and only to its
   own office's reviewers. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { NotEnabled, PACKAGE_LABEL, myContext, orgNames, packageCases, packages, type AbcContext, type Package } from "@/lib/abc";
import { readReconciliation } from "@/lib/reconciliation";
import { checkPackage, type PackageCheck } from "@/sp3/ai/packageCheck";
import { Reading } from "../ui/Reading";
import { period } from "./Packages";
import "../ngo/ngo.css";
import "./abc.css";
import { isWaitingOnOffice, isWithOperator } from "@/lib/machines/package";

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
  const [tab, setTab] = useState<"waiting" | "operator" | "all">(askedTab === "operator" || askedTab === "all" ? askedTab : "waiting");
  const [op, setOp] = useState<string | null>(params?.get("op") ?? null);
  const [checks, setChecks] = useState<Record<string, PackageCheck | "unavailable">>({});

  useEffect(() => {
    if (!user) return;
    let live = true;
    Promise.all([myContext(), packages()])
      .then(async ([c, p]) => {
        const mine = p.filter((x) => c.offices.some((o) => o.id === x.office_id) && x.status !== "draft");
        const n = await orgNames([...new Set(mine.map((x) => x.ngo_id))]);
        if (live) { setCtx(c); setList(mine); setNames(n); }
      })
      .catch((e) => { if (!live) return; if (e instanceof NotEnabled) setOff(true); else setErr(e.message); });
    return () => { live = false; };
  }, [user]);

  /* Oldest submission first: the decision that has waited longest. */
  const waiting = useMemo(() => (list ?? []).filter((p) => isWaitingOnOffice(p.status)).sort((a, b) => (a.submitted_at ?? a.created_at).localeCompare(b.submitted_at ?? b.created_at)), [list]);
  const onOperator = useMemo(() => (list ?? []).filter((p) => isWithOperator(p.status)), [list]);
  const shown = (tab === "waiting" ? waiting : tab === "operator" ? onOperator : list ?? []).filter((p) => !op || p.ngo_id === op);
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

  return (
    <div className="ngo-page abc">
      <header className="ngo-head">
        <div><p className="ngo-step">{ctx?.offices[0]?.name ?? "Your reviewing office"}</p><h1>Review submissions</h1></div>
        <p className="ngo-sum">{off ? "Not switched on yet." : !ctx && !err ? <Reading>Reading your office&apos;s packages</Reading> : ctx && ctx.offices.length === 0 ? "Your account is not part of a reviewing office." : <><b>{waiting.length}</b> {waiting.length === 1 ? "package needs" : "packages need"} your decision</>}</p>
        {ctx && ctx.offices.length > 0 && <div className="row ngo-head-act"><Link className="btn is-s" href="/city/contracts">Contracts &amp; rates</Link></div>}
      </header>
      {off ? <div className="abc-empty"><b>Package review is not switched on here yet.</b></div>
        : err ? <p className="abc-err" role="alert">{err}</p>
        : ctx && ctx.offices.length === 0 ? <div className="abc-empty"><b>No reviewing office.</b>Ask your programme lead, or <Link href="/contact">contact us</Link>.</div>
        : list && (() => {
            const overdue = waiting.filter((p) => (days(p.submitted_at) ?? 0) > 14).length;
            const exceptions = Object.values(checks).reduce((n, c) => n + (c === "unavailable" ? 0 : c.exceptions), 0);
            const unread = waiting.filter((p) => p.item_review_enabled && (!checks[p.id] || checks[p.id] === "unavailable")).length;
            const accepted = list.filter((p) => p.status === "accepted").length, partly = list.filter((p) => p.status === "partially_accepted").length;
            const by = new Map<string, Package[]>();
            for (const p of list) by.set(p.ngo_id, [...(by.get(p.ngo_id) ?? []), p]);
            return <>
              {/* What needs a decision, at a glance. Each figure opens the list it counts. */}
              <div className="gv-stats" role="group" aria-label="Where submissions stand">
                <button type="button" className={`gv-stat${tab === "waiting" ? " is-on" : ""}`} onClick={() => setTab("waiting")}><span>Waiting for your decision</span><b>{waiting.length}</b>{overdue ? <small className="is-late">{overdue} over 14 days</small> : <small>None overdue</small>}</button>
                <button type="button" className="gv-stat" onClick={() => setTab("waiting")}><span>Claim exceptions found</span><b>{exceptions}</b><small>{unread ? `${unread} ${unread === 1 ? "package" : "packages"} not yet checked` : "Checked by Kaju; you decide"}</small></button>
                <button type="button" className={`gv-stat${tab === "operator" ? " is-on" : ""}`} onClick={() => setTab("operator")}><span>Queried or returned</span><b>{onOperator.length}</b><small>Waiting on the operator</small></button>
                <button type="button" className={`gv-stat${tab === "all" ? " is-on" : ""}`} onClick={() => setTab("all")}><span>Accepted</span><b>{accepted}</b><small>{partly ? `${partly} partly · ` : ""}accepted is not paid</small></button>
              </div>

              <div className="gv-cols">
                <section className="gv-main" aria-labelledby="gv-q">
                  <div className="gv-bar">
                    <h2 id="gv-q" className="gv-h">{tab === "waiting" ? "Decision queue" : tab === "operator" ? "With the operator" : "All submissions"}{op ? <> · {names[op] ?? "Operator"} <button type="button" className="link" onClick={() => setOp(null)}>clear</button></> : null}</h2>
                    <div className="abc-stages" role="group" aria-label="Show">
                      <button type="button" aria-pressed={tab === "waiting"} onClick={() => setTab("waiting")}>Waiting <b>{waiting.length}</b></button>
                      <button type="button" aria-pressed={tab === "operator"} onClick={() => setTab("operator")}>With operator <b>{onOperator.length}</b></button>
                      <button type="button" aria-pressed={tab === "all"} onClick={() => setTab("all")}>All <b>{list.length}</b></button>
                    </div>
                  </div>
                  {shown.length ? (
                    <ul className="abc-list">{shown.map((p) => (
                      <li key={p.id}><Link href={`/city/review/${p.id}`}>
                        <span className="abc-t"><b>{p.title}</b><small>{names[p.ngo_id] ?? "Operator"} · {period(p)}{isWaitingOnOffice(p.status) && days(p.submitted_at) !== null ? ` · waiting ${days(p.submitted_at)} ${days(p.submitted_at) === 1 ? "day" : "days"}` : ""}</small>
                          {isWaitingOnOffice(p.status) && (() => { const c = checks[p.id]; return c === "unavailable" ? <small>Kaju could not read the claims; open the package to review.</small> : c ? <small className="abc-kaju">Kaju: {c.clean} clean · {c.exceptions} with exceptions{c.byIssue[0] ? ` (most: ${c.byIssue[0].issue.toLowerCase()})` : ""}</small> : p.item_review_enabled ? <small>Kaju is checking the claims…</small> : null; })()}</span>
                        <span className="abc-dots"><span>{(() => { const n = p.summary.records ?? p.case_ids.length; return `${n} ${n === 1 ? "animal" : "animals"}`; })()}</span></span>
                        <span className={`abc-tag t-${p.status}`}>{PACKAGE_LABEL[p.status]}</span>
                        <span className="gv-go">{isWaitingOnOffice(p.status) ? "Review" : "Open"}<ArrowRight size={14} aria-hidden /></span>
                      </Link></li>
                    ))}</ul>
                  ) : <div className="abc-empty"><b>{tab === "waiting" ? "Nothing is waiting for your decision." : tab === "operator" ? "No package is waiting on an operator." : "No submissions yet."}</b>{tab === "waiting" ? " New monthly packages appear here as soon as an operator submits them." : null}</div>}
                </section>

                {by.size > 0 && <aside className="gv-side" aria-labelledby="gv-ops">
                  <h2 id="gv-ops" className="gv-h">Operators</h2>
                  <table className="gv-table"><thead><tr><th scope="col">Operator</th><th scope="col">Waiting</th><th scope="col">Queried</th><th scope="col">Accepted</th></tr></thead>
                    <tbody>{[...by].map(([id, ps]) => <tr key={id} className={op === id ? "is-on" : undefined}><th scope="row"><button type="button" className="gv-op" aria-pressed={op === id} onClick={() => setOp(op === id ? null : id)}>{names[id] ?? "Operator"}</button></th><td>{ps.filter((p) => isWaitingOnOffice(p.status)).length}</td><td>{ps.filter((p) => isWithOperator(p.status)).length}</td><td>{ps.filter((p) => p.status === "accepted").length}{ps.some((p) => p.status === "partially_accepted") ? <small> +{ps.filter((p) => p.status === "partially_accepted").length} partly</small> : null}</td></tr>)}</tbody></table>
                </aside>}
              </div>
            </>;
          })()}
    </div>
  );
}
