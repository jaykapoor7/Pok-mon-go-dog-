"use client";

/* Kaju's package check above the claims: what is clean, what is not and
   why, with drafted notes. The reviewer records every decision; the
   operator sees the same exceptions before submitting, so queries are
   fixed before they are raised. */

import { Sparkles } from "lucide-react";
import type { PackageCheck } from "@/sp3/ai/packageCheck";

export function KajuPackageCheck({ check, side, canDecide, busy, onFill, onBatch }: {
  check: PackageCheck; side: "operator" | "reviewer"; canDecide: boolean; busy: boolean;
  onFill: () => void; onBatch: (decision: "accepted" | "query") => void;
}) {
  const total = check.checks.length;
  return (
    <section className="kpc" aria-labelledby="kpc-h">
      <h3 id="kpc-h"><Sparkles size={14} aria-hidden /> Kaju checked {total} claim{total === 1 ? "" : "s"} against their sources</h3>
      <p>
        <b>{check.clean}</b> pending claim{check.clean === 1 ? " has" : "s have"} complete evidence, sign-offs and matching amounts · <b>{check.exceptions}</b> {check.exceptions === 1 ? "has" : "have"} exceptions{check.decided ? ` · ${check.decided} already decided` : ""}.
      </p>
      {check.byIssue.length > 0 && <ul>{check.byIssue.slice(0, 5).map((x) => <li key={x.issue}>{x.issue}: {x.count}</li>)}</ul>}
      {side === "operator"
        ? check.exceptions > 0 && <p className="kpc-note">These are likely to be queried. Fixing them before submission saves a round of queries.</p>
        : canDecide && <div className="row">
          <button type="button" className="btn" disabled={busy} onClick={onFill}>Fill review notes with Kaju’s drafts</button>
          {check.clean > 0 && <button type="button" className="btn is-ink" disabled={busy} onClick={() => onBatch("accepted")}>Accept {check.clean} clean claim{check.clean === 1 ? "" : "s"}…</button>}
          {check.exceptions > 0 && <button type="button" className="btn" disabled={busy} onClick={() => onBatch("query")}>Send {check.exceptions} quer{check.exceptions === 1 ? "y" : "ies"}…</button>}
        </div>}
      <p className="kpc-note">Kaju compares records only. It does not accept, query or reject anything; each decision is yours and is recorded in your name with its note.</p>
    </section>
  );
}
