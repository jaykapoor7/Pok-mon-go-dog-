"use client";

/* NGO · Verification: every sterilisation case of the organisation, where
   it stands in the ABC workflow, and what it still needs. Historical
   imports and research datasets are not listed (the database excludes
   them); they stay in their own review until validated by this workflow. */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { NotEnabled, STAGE_LABEL, myContext, stageOf, verificationQueue, type AbcContext, type QueueRow, type Stage } from "@/lib/abc";
import { NgoGate } from "../ngo/Gate";
import { Reading } from "../ui/Reading";
import "../ngo/ngo.css";
import "./abc.css";

const ORDER: Stage[] = ["evidence", "vet", "review", "returned", "ready", "packaged", "accepted"];
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function Dots({ n }: { n: number }) {
  return <span className="abc-dots" aria-label={`${n} of 5 evidence items`}>{[0, 1, 2, 3, 4].map((i) => <i key={i} className={i < n ? "is-on" : undefined} />)}<span aria-hidden>{n}/5</span></span>;
}

export function Verification() {
  const [rows, setRows] = useState<QueueRow[] | null>(null);
  const [ctx, setCtx] = useState<AbcContext | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [off, setOff] = useState(false);
  const [stage, setStage] = useState<Stage | "all">("all");

  useEffect(() => {
    let live = true;
    Promise.all([verificationQueue(), myContext()])
      .then(([r, c]) => { if (live) { setRows(r); setCtx(c); } })
      .catch((e) => { if (!live) return; if (e instanceof NotEnabled) setOff(true); else setErr(e.message); });
    return () => { live = false; };
  }, []);

  const counts = useMemo(() => {
    const m = Object.fromEntries(ORDER.map((s) => [s, 0])) as Record<Stage, number>;
    (rows ?? []).forEach((r) => { m[stageOf(r)]++; });
    return m;
  }, [rows]);
  const shown = (rows ?? []).filter((r) => stage === "all" || stageOf(r) === stage);
  const roleLine = ctx?.role === "veterinarian" ? "You sign off procedures." : ctx?.role === "coordinator" || ctx?.role === "admin" ? "You review evidence and prepare report packages." : "You can add evidence; a veterinarian and a coordinator sign off.";

  return (
    <NgoGate title="Verification" lede="Every ABC procedure with its evidence, veterinary sign-off and review.">
      <div className="ngo-page abc">
        <header className="ngo-head">
          <div><h1>Verification</h1></div>
          <p className="ngo-sum">{off ? "Not switched on for this workspace yet." : rows === null && !err ? <Reading>Reading your ABC records</Reading> : err ? "The verification queue could not be read. Nothing is shown as zero." : <><b>{counts.review}</b> ready for review · <b>{counts.vet}</b> waiting for a vet · <b>{counts.evidence + counts.returned}</b> need evidence. {roleLine}</>}</p>
          <div className="row ngo-head-act"><Link className="btn is-ink is-s" href="/ngo/packages">Report packages</Link></div>
        </header>

        {off ? (
          <div className="abc-empty"><b>Verification is not switched on here yet.</b>Your organisation&apos;s records are unchanged. Once StrayPaw enables the ABC workflow for this workspace, each procedure will list its evidence, its veterinary sign-off and its review here.</div>
        ) : err ? <p className="abc-err" role="alert">{err}</p> : rows && (
          <>
            <div className="abc-stages" role="group" aria-label="Filter by stage">
              <button type="button" aria-pressed={stage === "all"} onClick={() => setStage("all")}>All <b>{rows.length}</b></button>
              {ORDER.filter((s) => counts[s] > 0 || s === "review").map((s) => (
                <button key={s} type="button" aria-pressed={stage === s} onClick={() => setStage(s)}>{STAGE_LABEL[s]} <b>{counts[s]}</b></button>
              ))}
            </div>
            {shown.length ? (
              <ul className="abc-list">{shown.map((r) => { const s = stageOf(r); return (
                <li key={r.case_id}><Link href={`/ngo/verification/${r.case_id}`}>
                  <span className="abc-t"><b>{r.title || r.case_code || "ABC case"}</b><small>{[r.city, day(r.created_at), r.returned_note ? `Returned: ${r.returned_note}` : r.vet_name ? `Vet: ${r.vet_name}` : null].filter(Boolean).join(" · ")}</small></span>
                  <Dots n={r.evidence_count} />
                  <span className={`abc-tag t-${s}`}>{STAGE_LABEL[s]}</span>
                  <ArrowRight size={14} aria-hidden className="abc-go" />
                </Link></li>
              ); })}</ul>
            ) : (
              <div className="abc-empty"><b>{stage === "all" ? "No ABC procedures yet." : `Nothing is ${STAGE_LABEL[stage as Stage].toLowerCase()}.`}</b>{stage === "all" ? "Open a sterilisation case and its verification starts here." : "Choose another stage to see the rest."}</div>
            )}
            <p className="abc-note">Imported historical records and research datasets are not listed. They keep their historical label until someone validates them through this workflow.</p>
          </>
        )}
      </div>
    </NgoGate>
  );
}
