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
import { ArrowRight, Camera, Check, ClipboardCheck, Package, Stethoscope, Undo2 } from "lucide-react";
import { NotEnabled, STAGE_LABEL, myContext, stageOf, verificationQueue, type AbcContext, type QueueRow, type Stage } from "@/lib/abc";
import { NgoGate, useOrgOpen } from "../ngo/Gate";
import { KajuEmptyState } from "@/kaju/Presence";
import { Reading } from "../ui/Reading";
import { Empty, Meter, PageHead, Seg } from "../ui/Page";
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
const MISSING: Record<string, string> = { surgery_record: "surgery record", ear_notch_photo: "ear-notch photo", release_photo: "release photo", release_location: "release place", capture_photo: "capture photo" };
/* Who a record is waiting on, and what happens to it next, from the database's own flags. */
const WHO: Record<Stage, string> = { evidence: "Field team", returned: "Field team", vet: "Vet", review: "Coordinator", ready: "Coordinator", packaged: "Reviewing office", accepted: "Done" };
const TONE: Record<Stage, "flame" | "amber" | "blue" | "green" | undefined> = { evidence: "amber", returned: "flame", vet: "blue", review: "blue", ready: "green", packaged: undefined, accepted: "green" };
const GLYPH: Record<Stage, typeof Camera> = { evidence: Camera, returned: Undo2, vet: Stethoscope, review: ClipboardCheck, ready: Check, packaged: Package, accepted: Check };
function nextOf(r: QueueRow, s: Stage) {
  const gap = r.missing.map((k) => MISSING[k] ?? k.replace(/_/g, " "));
  return s === "returned" ? `Fix and send back: ${(r.returned_note ?? "see the note").replace(/[.\s]+$/, "")}`
    : s === "evidence" ? `Add ${gap.slice(0, 2).join(" and ") || "the missing evidence"}${gap.length > 2 ? ` and ${gap.length - 2} more` : ""}`
    : s === "vet" ? "Veterinary sign-off" : s === "review" ? "Evidence review" : s === "ready" ? "Goes into the next package"
    : s === "packaged" ? "With the reviewing office" : "Accepted";
}
type Lane = "mine" | "others" | "reported";
const FINAL: Stage[] = ["packaged", "accepted"];
/* The stages each role acts on. A lead also sees what the field team owes, under "With others". */
const MINE: Record<string, Stage[]> = { veterinarian: ["vet"], member: ["evidence", "returned"], coordinator: ["review", "ready"], admin: ["review", "ready"] };

const PAGE = 12;

export function Verification() {
  const [rows, setRows] = useState<QueueRow[] | null>(null);
  const [ctx, setCtx] = useState<AbcContext | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [off, setOff] = useState(false);
  const [page, setPage] = useState(0);
  const [lane, setLane] = useState<Lane | null>(null);
  /* A stage in the address (from the board, Reports or Kaju) narrows the list to exactly that stage. */
  const params = useSearchParams(), router = useRouter(), here = usePathname();
  const q = params?.get("stage");
  const stage: Stage | "all" = q && q in STAGE_LABEL ? (q as Stage) : "all";
  const clearStage = () => { setPage(0); router.replace(here, { scroll: false }); };

  const open = useOrgOpen();
  useEffect(() => {
    if (!open) return;
    let live = true;
    Promise.all([verificationQueue(), myContext()])
      .then(([r, c]) => { if (live) { setRows(r); setCtx(c); } })
      .catch((e) => { if (!live) return; if (e instanceof NotEnabled) setOff(true); else setErr(e.message); });
    return () => { live = false; };
  }, [open]);

  const mine = MINE[ctx?.role ?? ""] ?? [];
  const laneOf = (s: Stage): Lane => (FINAL.includes(s) ? "reported" : mine.includes(s) ? "mine" : "others");
  const counts = useMemo(() => {
    const m = Object.fromEntries(ORDER.map((s) => [s, 0])) as Record<Stage, number>;
    (rows ?? []).forEach((r) => { m[stageOf(r)]++; });
    return m;
  }, [rows]);
  const laneCount = (l: Lane) => ORDER.filter((s) => laneOf(s) === l).reduce((n, s) => n + counts[s], 0);
  /* Open on what is yours; if nothing is, on what is with others. */
  const active: Lane = lane ?? (laneCount("mine") ? "mine" : laneCount("others") ? "others" : "reported");
  const shown = (rows ?? []).filter((r) => { const s = stageOf(r); return stage === "all" ? laneOf(s) === active : s === stage; })
    .sort((a, b) => Number(stageOf(b) === "returned") - Number(stageOf(a) === "returned") || a.created_at.localeCompare(b.created_at));
  /* One screen of rows at a time, so the list never becomes a long scroll. */
  const { pg, pages, slice } = pageOf(shown, page, PAGE);
  const lead = ctx?.role === "admin" || ctx?.role === "coordinator";

  return (
    <NgoGate title="Verification" lede="Every ABC procedure with its evidence, veterinary sign-off and review.">
      <div className="vw abc">
        <PageHead title="Sign-off & evidence"
          sum={off ? "Not switched on for this workspace yet." : rows === null && !err ? <Reading>Reading your procedure records</Reading> : err ? "The records could not be read. Nothing is shown as zero."
            : <><b>{laneCount("mine")}</b> waiting on you · <b>{laneCount("others")}</b> with others · <b>{laneCount("reported")}</b> reported</>}
          actions={lead ? <Link className="btn is-s" href="/ngo/packages">Reports</Link> : null} />

        {off ? <Empty title="Sign-off is not switched on here yet.">Your records are unchanged.</Empty>
          : err ? <p className="vw-err" role="alert">{err}</p> : rows && (
          <>
            {stage === "all" ? (
              <div className="vw-bar">
                <Seg<Lane> label="Who a record is waiting on" value={active} onChange={(l) => { setLane(l); setPage(0); }} options={[
                  { id: "mine", label: "Waiting on you", count: laneCount("mine"), tone: laneCount("mine") ? "flame" : "plain" },
                  { id: "others", label: "With others", count: laneCount("others") },
                  { id: "reported", label: "Reported", count: laneCount("reported") },
                ]} />
              </div>
            ) : <p className="vw-note"><span>Showing only: <b>{STAGE_LABEL[stage]}</b> ({counts[stage]})</span><button type="button" onClick={clearStage}>Show everything</button></p>}
            {shown.length ? (
              <><ul className="vw-list">{slice.map((r, j) => { const s = stageOf(r), Icon = GLYPH[s]; return (
                <li key={r.case_id} style={{ ["--j" as string]: j }}><Link className="vw-row" href={`/ngo/verification/${r.case_id}`}>
                  <span className="vw-glyph" data-tone={TONE[s]} aria-hidden><Icon size={15} /></span>
                  <span className="vw-row-t"><b>{r.title || shortCode(r.case_code, "Procedure record")}</b>
                    <span className="vw-row-next"><i>{FINAL.includes(s) ? "Now" : "Next"}</i><span>{nextOf(r, s)}{FINAL.includes(s) ? "" : ` · ${WHO[s]}`}</span></span>
                    <small>{[r.city, day(r.created_at)].filter(Boolean).join(" · ")}</small></span>
                  <Meter total={r.evidence_count + r.missing.length} n={r.evidence_count} label="evidence items" />
                  <span className="vw-tag" data-tone={TONE[s]}>{STAGE_LABEL[s]}</span>
                  <ArrowRight size={14} aria-hidden className="vw-go" />
                </Link></li>
              ); })}</ul>
              <Pager pg={pg} pages={pages} total={shown.length} size={PAGE} onPage={setPage} /></>
            ) : (
              <KajuEmptyState title={stage !== "all" ? EMPTY_STAGE[stage as Stage] : active === "mine" ? "Nothing is waiting on you." : active === "others" ? "Nothing is waiting on anyone else." : "Nothing has been reported yet."}>{stage === "all" && active === "mine" && laneCount("others") ? "Open “With others” to see what the rest of the team holds." : null}</KajuEmptyState>
            )}
          </>
        )}
      </div>
    </NgoGate>
  );
}
