"use client";

/* NGO · Verification: every sterilisation case of the organisation, where
   it stands in the ABC workflow, and what it still needs. Historical
   imports and research datasets are not listed (the database excludes
   them); they stay in their own review until validated by this workflow. */

import { shortCode } from "@/lib/caseCode";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Pager, pageOf } from "./Pager";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { NotEnabled, STAGE_LABEL, myContext, stageOf, verificationQueue, type AbcContext, type QueueRow, type Stage } from "@/lib/abc";
import { NgoGate, useOrgOpen } from "../ngo/Gate";
import { KajuEmptyState } from "@/kaju/Presence";
import { Reading } from "../ui/Reading";
import "../ngo/ngo.css";
import "./abc.css";
import { STAGE_ORDER } from "@/lib/machines/abc-stage";

const ORDER = STAGE_ORDER;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function Dots({ n,total=5 }: { n: number;total?:number }) {
  return <span className="abc-dots" aria-label={`${n} of ${total} evidence items`}>{Array.from({length:total},(_,i)=>i).map((i) => <i key={i} className={i < n ? "is-on" : undefined} />)}<span aria-hidden>{n} of {total}</span></span>;
}

const EMPTY_STAGE: Record<Stage, string> = {
  evidence: "No procedure is missing evidence.", vet: "Nothing is waiting for the vet.", review: "Nothing is waiting for review.",
  returned: "Nothing has been returned.", ready: "Nothing is approved and waiting.", packaged: "Nothing is in a package.", accepted: "Nothing has been accepted yet.",
};

const PAGE = 12;

export function Verification() {
  const [rows, setRows] = useState<QueueRow[] | null>(null);
  const [ctx, setCtx] = useState<AbcContext | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [off, setOff] = useState(false);
  const [page, setPage] = useState(0);
  /* The stage lives in the address, so the sidebar's Treat (vet) and Release (evidence)
     steps, Kaju's links and the filter buttons always agree. */
  const params = useSearchParams(), router = useRouter(), here = usePathname();
  const q = params?.get("stage");
  const stage: Stage | "all" = q && q in STAGE_LABEL ? (q as Stage) : "all";
  const setStage = (s: Stage | "all") => { setPage(0); router.replace(s === "all" ? here : `${here}?stage=${s}`, { scroll: false }); };

  const open = useOrgOpen();
  useEffect(() => {
    if (!open) return;
    let live = true;
    Promise.all([verificationQueue(), myContext()])
      .then(([r, c]) => { if (live) { setRows(r); setCtx(c); } })
      .catch((e) => { if (!live) return; if (e instanceof NotEnabled) setOff(true); else setErr(e.message); });
    return () => { live = false; };
  }, [open]);

  const counts = useMemo(() => {
    const m = Object.fromEntries(ORDER.map((s) => [s, 0])) as Record<Stage, number>;
    (rows ?? []).forEach((r) => { m[stageOf(r)]++; });
    return m;
  }, [rows]);
  const shown = (rows ?? []).filter((r) => stage === "all" || stageOf(r) === stage);
  /* One screen of rows at a time, so the queue never becomes a long scroll. */
  const { pg, pages, slice } = pageOf(shown, page, PAGE);

  return (
    <NgoGate title="Verification" lede="Every ABC procedure with its evidence, veterinary sign-off and review.">
      <div className="ngo-page abc">
        <header className="ngo-head">
          <div>{stage === "vet" ? <h1>Treatment &amp; sign-off</h1> : stage === "evidence" ? <h1>Release evidence</h1> : <h1>Verification</h1>}</div>
          <p className="ngo-sum">{off ? "Not switched on for this workspace yet." : rows === null && !err ? <Reading>Reading your ABC records</Reading> : err ? "The verification queue could not be read. Nothing is shown as zero." : <><b>{counts.review}</b> to review · Awaiting vet: <b>{counts.vet}</b> · <b>{counts.evidence + counts.returned}</b> {counts.evidence + counts.returned === 1 ? "case needs" : "cases need"} evidence</>}</p>
          {(ctx?.role === "admin" || ctx?.role === "coordinator") && <div className="row ngo-head-act"><Link className="btn is-s" href="/ngo/packages">Report packages</Link></div>}
        </header>

        {off ? (
          <div className="abc-empty"><b>Verification is not switched on here yet.</b>Your records are unchanged.</div>
        ) : err ? <p className="abc-err" role="alert">{err}</p> : rows && (
          <>
            <div className="abc-stages" role="group" aria-label="Filter by stage">
              <button type="button" aria-pressed={stage === "all"} onClick={() => setStage("all")}>All <b>{rows.length}</b></button>
              {ORDER.filter((s) => counts[s] > 0 || s === "review").map((s) => (
                <button key={s} type="button" aria-pressed={stage === s} onClick={() => setStage(s)}>{STAGE_LABEL[s]} <b>{counts[s]}</b></button>
              ))}
            </div>
            {shown.length ? (
              <><ul className="abc-list">{slice.map((r) => { const s = stageOf(r); return (
                <li key={r.case_id}><Link href={`/ngo/verification/${r.case_id}`}>
                  <span className="abc-t"><b>{r.title || shortCode(r.case_code, "ABC case")}</b><small>{[r.city, day(r.created_at), r.returned_note ? `Returned: ${r.returned_note}` : null].filter(Boolean).join(" · ")}</small></span>
                  <Dots total={r.evidence_count+r.missing.length} n={r.evidence_count} />
                  <span className={`abc-tag t-${s}`}>{STAGE_LABEL[s]}</span>
                  <ArrowRight size={14} aria-hidden className="abc-go" />
                </Link></li>
              ); })}</ul>
              <Pager pg={pg} pages={pages} total={shown.length} size={PAGE} onPage={setPage} /></>
            ) : (
              <KajuEmptyState title={stage === "all" ? "No ABC procedures yet." : EMPTY_STAGE[stage as Stage]}>{stage === "all" ? "Sterilisation cases appear here." : null}</KajuEmptyState>
            )}
          </>
        )}
      </div>
    </NgoGate>
  );
}
