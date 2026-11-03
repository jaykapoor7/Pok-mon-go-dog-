"use client";

/* Municipality · Package review: report packages that operators have
   submitted to the offices this person sits in. Drafts never appear; the
   database shows a package only once it is submitted, and only to its
   own office's reviewers. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { NotEnabled, PACKAGE_LABEL, myContext, orgNames, packageCases, packages, type AbcContext, type Package } from "@/lib/abc";
import { readReconciliation } from "@/lib/reconciliation";
import { checkPackage, type PackageCheck } from "@/sp3/ai/packageCheck";
import { Reading } from "../ui/Reading";
import { period } from "./Packages";
import "../ngo/ngo.css";
import "./abc.css";

export function ReviewInbox() {
  const { user, ready } = useAuth();
  const [ctx, setCtx] = useState<AbcContext | null>(null);
  const [list, setList] = useState<Package[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [off, setOff] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"waiting" | "operator" | "all">("waiting");
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
  const waiting = useMemo(() => (list ?? []).filter((p) => p.status === "submitted").sort((a, b) => (a.submitted_at ?? a.created_at).localeCompare(b.submitted_at ?? b.created_at)), [list]);
  const onOperator = useMemo(() => (list ?? []).filter((p) => p.status === "queried" || p.status === "returned"), [list]);
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
      <p className="ngo-door-sum">Report packages that operators submit to your office appear here. Sign in with your work account to open them.</p>
      <div className="ngo-door-act"><Link className="btn is-ink" href={`/sign-in?next=${encodeURIComponent("/city/review")}`}>Sign in</Link></div>
    </header></div>
  );

  return (
    <div className="ngo-page abc">
      <header className="ngo-head">
        <div><h1>Package review</h1></div>
        <p className="ngo-sum">{off ? "Not switched on yet." : !ctx && !err ? <Reading>Reading your office&apos;s packages</Reading> : ctx && ctx.offices.length === 0 ? "Your account is not part of a reviewing office." : <><b>{waiting.length}</b> waiting for you</>}</p>
      </header>
      {off ? <div className="abc-empty"><b>Package review is not switched on here yet.</b></div>
        : err ? <p className="abc-err" role="alert">{err}</p>
        : ctx && ctx.offices.length === 0 ? <div className="abc-empty"><b>No reviewing office.</b>Ask your programme lead, or <Link href="/contact">contact us</Link>.</div>
        : list && (
          <>
            {/* Oversight at a glance: decisions due, what is overdue, where packages stand. */}
            {(() => {
              const overdue = waiting.filter((p) => (days(p.submitted_at) ?? 0) > 14).length;
              const exceptions = Object.values(checks).reduce((n, c) => n + (c === "unavailable" ? 0 : c.exceptions), 0);
              const unread = waiting.filter((p) => p.item_review_enabled && (!checks[p.id] || checks[p.id] === "unavailable")).length;
              const accepted = list.filter((p) => p.status === "accepted").length, partly = list.filter((p) => p.status === "partially_accepted").length;
              return <dl className="abc-glance">
                <div><dt>Waiting for decision</dt><dd>{waiting.length}{overdue ? <small className="is-late"> · {overdue} over 14 days</small> : null}</dd></div>
                <div><dt>Claim exceptions found</dt><dd>{exceptions}{unread ? <small> · {unread} not yet checked</small> : null}</dd></div>
                <div><dt>With the operator</dt><dd>{onOperator.length}</dd></div>
                <div><dt>Accepted</dt><dd>{accepted}{partly ? <small> · {partly} partly</small> : null}</dd></div>
              </dl>;
            })()}
            <div className="abc-stages" role="group" aria-label="Show">
              <button type="button" aria-pressed={tab === "waiting"} onClick={() => setTab("waiting")}>Waiting for you <b>{waiting.length}</b></button>
              <button type="button" aria-pressed={tab === "operator"} onClick={() => setTab("operator")}>Waiting on the operator <b>{onOperator.length}</b></button>
              <button type="button" aria-pressed={tab === "all"} onClick={() => setTab("all")}>All <b>{list.length}</b></button>
            </div>
            {/* Contractor performance from recorded package outcomes only. */}
            {(() => {
              const by = new Map<string, Package[]>();
              for (const p of list) by.set(p.ngo_id, [...(by.get(p.ngo_id) ?? []), p]);
              if (!by.size) return null;
              return <table className="abc-perf"><caption>Operators · recorded package outcomes</caption><thead><tr><th scope="col">Operator</th><th scope="col">Waiting</th><th scope="col">Query or returned</th><th scope="col">Accepted (fully / partly)</th></tr></thead>
                <tbody>{[...by].map(([id, ps]) => <tr key={id}><th scope="row">{names[id] ?? "Operator"}</th><td>{ps.filter((p) => p.status === "submitted").length}</td><td>{ps.filter((p) => p.status === "queried" || p.status === "returned").length}</td><td>{ps.filter((p) => p.status === "accepted").length} / {ps.filter((p) => p.status === "partially_accepted").length}</td></tr>)}</tbody></table>;
            })()}
            {shown.length ? (
              <ul className="abc-list">{shown.map((p) => (
                <li key={p.id}><Link href={`/city/review/${p.id}`}>
                  <span className="abc-t"><b>{p.title}</b><small>{names[p.ngo_id] ?? "Operator"} · {period(p)}{p.status === "submitted" && days(p.submitted_at) !== null ? ` · waiting ${days(p.submitted_at)} d` : ""}</small>
                    {p.status === "submitted" && (() => { const c = checks[p.id]; return c === "unavailable" ? <small>Kaju could not read the claims; open the package to review.</small> : c ? <small className="abc-kaju">Kaju: {c.clean} clean · {c.exceptions} with exceptions{c.byIssue[0] ? ` (most: ${c.byIssue[0].issue.toLowerCase()})` : ""}</small> : p.item_review_enabled ? <small>Kaju is checking the claims…</small> : null; })()}</span>
                  <span className="abc-dots"><span>{(() => { const n = p.summary.records ?? p.case_ids.length; return `${n} ${n === 1 ? "record" : "records"}`; })()}</span></span>
                  <span className={`abc-tag t-${p.status}`}>{PACKAGE_LABEL[p.status]}</span>
                  <ArrowRight size={14} aria-hidden className="abc-go" />
                </Link></li>
              ))}</ul>
            ) : <div className="abc-empty"><b>{tab === "waiting" ? "Nothing is waiting for you." : tab === "operator" ? "No package is waiting on an operator." : "No packages yet."}</b></div>}
          </>
        )}
    </div>
  );
}
