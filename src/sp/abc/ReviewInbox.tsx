"use client";

/* Municipality · Package review: report packages that operators have
   submitted to the offices this person sits in. Drafts never appear; the
   database shows a package only once it is submitted, and only to its
   own office's reviewers. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { NotEnabled, PACKAGE_LABEL, myContext, orgNames, packages, type AbcContext, type Package } from "@/lib/abc";
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
  const [tab, setTab] = useState<"waiting" | "all">("waiting");

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

  const waiting = useMemo(() => (list ?? []).filter((p) => p.status === "submitted"), [list]);
  const shown = tab === "waiting" ? waiting : list ?? [];

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
        <p className="ngo-sum">{off ? "Not switched on yet." : !ctx && !err ? <Reading>Reading your office&apos;s packages</Reading> : ctx && ctx.offices.length === 0 ? "Your account is not part of a reviewing office." : <><b>{waiting.length}</b> waiting for your review{ctx ? ` · ${ctx.offices.map((o) => o.name).join(", ")}` : ""}</>}</p>
      </header>
      {off ? <div className="abc-empty"><b>Package review is not switched on here yet.</b></div>
        : err ? <p className="abc-err" role="alert">{err}</p>
        : ctx && ctx.offices.length === 0 ? <div className="abc-empty"><b>No reviewing office.</b>Reviewers are added by StrayPaw for the office that funds a programme. Ask your programme lead, or <Link href="/contact">contact us</Link>.</div>
        : list && (
          <>
            <div className="abc-stages" role="group" aria-label="Show">
              <button type="button" aria-pressed={tab === "waiting"} onClick={() => setTab("waiting")}>Waiting for you <b>{waiting.length}</b></button>
              <button type="button" aria-pressed={tab === "all"} onClick={() => setTab("all")}>All <b>{list.length}</b></button>
            </div>
            {shown.length ? (
              <ul className="abc-list">{shown.map((p) => (
                <li key={p.id}><Link href={`/city/review/${p.id}`}>
                  <span className="abc-t"><b>{p.title}</b><small>{names[p.ngo_id] ?? "Operator"} · {period(p)}</small></span>
                  <span className="abc-dots"><span>{(() => { const n = p.summary.records ?? p.case_ids.length; return `${n} ${n === 1 ? "record" : "records"}`; })()}</span></span>
                  <span className={`abc-tag t-${p.status}`}>{PACKAGE_LABEL[p.status]}</span>
                  <ArrowRight size={14} aria-hidden className="abc-go" />
                </Link></li>
              ))}</ul>
            ) : <div className="abc-empty"><b>{tab === "waiting" ? "Nothing is waiting for your review." : "No packages yet."}</b>Operators submit packages when their records are authorised and approved.</div>}
          </>
        )}
    </div>
  );
}
