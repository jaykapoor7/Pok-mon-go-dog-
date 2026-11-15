"use client";

import { useMemo, useState } from "react";
import { shortCode } from "@/lib/caseCode";
import { STAGE_LABEL, stageOf, verificationQueue, type QueueRow, type Stage } from "@/lib/abc";
import { STAGE_ORDER } from "@/lib/machines/abc-stage";
import { useRead } from "@/oh/data";
import { read } from "../../../data/ngo-setup";
import { Failed, Skeleton, day, errText } from "../../../kit";
import { Chip } from "../../../ui";
import type { Tone } from "../../../fixtures";
import { Grid, Tools, Views, type GCol, type Who } from "../frame";
import { S_QUEUE } from "../sample";

/* Evidence readiness: every ABC procedure record, where it stands and what it still needs, from the database's own
   flags (abc_verification_queue, stageOf). A row opens the case, where evidence is added, signed and reviewed. */

const TONE: Record<Stage, Tone> = { evidence: "warn", returned: "bad", vet: "accent", review: "accent", ready: "ok", packaged: "plain", accepted: "ok" };
const WHO: Record<Stage, string> = { evidence: "Field team", returned: "Field team", vet: "Vet", review: "Coordinator", ready: "Coordinator", packaged: "Reviewing office", accepted: "Done" };
const MISSING: Record<string, string> = { surgery_record: "surgery record", ear_notch_photo: "ear-notch photo", release_photo: "release photo", release_location: "release place", capture_photo: "capture photo" };
/* The stages each role acts on; a lead also sees what the field team owes, under "With others". */
const MINE: Record<string, Stage[]> = { veterinarian: ["vet"], member: ["evidence", "returned"], field_worker: ["evidence", "returned"], coordinator: ["review", "ready"], admin: ["review", "ready"], lead: ["review", "ready"] };
const FINAL: Stage[] = ["packaged", "accepted"];
function nextOf(r: QueueRow, s: Stage) {
  const gap = r.missing.map((k) => MISSING[k] ?? k.replace(/_/g, " "));
  return s === "returned" ? `Fix and send back: ${(r.returned_note ?? "see the note").replace(/[.\s]+$/, "")}`
    : s === "evidence" ? `Add ${gap.slice(0, 2).join(" and ") || "the missing evidence"}${gap.length > 2 ? ` and ${gap.length - 2} more` : ""}`
    : s === "vet" ? "Veterinary sign-off" : s === "review" ? "Evidence review" : s === "ready" ? "Goes into the next package"
    : s === "packaged" ? "With the reviewing office" : "Accepted";
}
type Lane = "mine" | "others" | "reported" | Stage;

export function EvidenceTab({ who, stage }: { who: Who; stage?: string | null }) {
  const r = useRead<QueueRow[]>(() => read(() => verificationQueue(300)), "ns:queue", !who.sample && !!who.ngo);
  const rows = who.sample ? S_QUEUE : r.data;
  const mine = MINE[who.sample ? "coordinator" : who.role ?? ""] ?? [];
  const laneOf = (s: Stage): Lane => (FINAL.includes(s) ? "reported" : mine.includes(s) ? "mine" : "others");
  const counts = useMemo(() => { const m = Object.fromEntries(STAGE_ORDER.map((s) => [s, 0])) as Record<Stage, number>; for (const x of rows ?? []) m[stageOf(x)]++; return m; }, [rows]);
  const laneCount = (l: Lane) => STAGE_ORDER.filter((s) => laneOf(s) === l).reduce((n, s) => n + counts[s], 0);
  const initial: Lane | null = stage && stage in STAGE_LABEL ? (stage as Stage) : null;
  const [picked, setPicked] = useState<Lane | null>(initial);
  const active: Lane = picked ?? (laneCount("mine") ? "mine" : laneCount("others") ? "others" : "reported");
  if (!who.sample && r.loading && !r.data) return <Skeleton rows={6} label="Reading procedure records" />;
  if (!who.sample && r.error && !r.data) return <Failed error={/not switched on|does not exist|Could not find/i.test(r.error) ? "Evidence sign-off is not switched on for this organisation yet. Your records are unchanged." : errText(r.error)} retry={r.reload} />;
  const list = rows ?? [];
  const isStage = (l: Lane): l is Stage => (STAGE_ORDER as readonly string[]).includes(l);
  const shown = list.filter((x) => { const s = stageOf(x); return isStage(active) ? s === active : laneOf(s) === active; })
    .sort((a, b) => Number(stageOf(b) === "returned") - Number(stageOf(a) === "returned") || a.created_at.localeCompare(b.created_at));
  const cols: GCol<QueueRow>[] = [
    { label: "Record", width: "minmax(0, 1.7fr)", render: (x) => { const s = stageOf(x); return <span className="nx-cell-main"><span><b>{x.title || shortCode(x.case_code, "Procedure record")}</b><small>{FINAL.includes(s) ? "Now: " : "Next: "}{nextOf(x, s)}{FINAL.includes(s) ? "" : ` · ${WHO[s]}`}</small></span></span>; } },
    { label: "Code", width: "120px", render: (x) => <span className="ns-mono nx-t2">{shortCode(x.case_code, "—")}</span> },
    { label: "Recorded", width: "110px", render: (x) => <span className="nx-t3">{day(x.created_at)}</span> },
    { label: "Evidence", width: "92px", render: (x) => <span className="num nx-t2">{x.evidence_count} of {x.evidence_count + x.missing.length}</span> },
    { label: "Stage", width: "150px", keep: true, render: (x) => { const s = stageOf(x); return <Chip tone={TONE[s]}>{STAGE_LABEL[s]}</Chip>; } },
  ];
  return (
    <>
      <Tools><span className="ns-sum"><b>{laneCount("mine")}</b> waiting on you, <b>{laneCount("others")}</b> with others, <b>{laneCount("reported")}</b> reported. Historical imports are not listed; they stay in their own review.</span></Tools>
      <Views id="ev" value={active} onChange={setPicked} views={[
        { id: "mine", label: "Waiting on you", count: laneCount("mine") }, { id: "others", label: "With others", count: laneCount("others") }, { id: "reported", label: "Reported", count: laneCount("reported") },
        ...STAGE_ORDER.filter((s) => counts[s] > 0 || s === initial).map((s) => ({ id: s as Lane, label: STAGE_LABEL[s], count: counts[s] })),
      ]} />
      <Grid label="Procedure records" cols={cols} rows={shown} rowKey={(x) => x.case_id} rowLabel={(x) => x.title || x.case_code || "procedure record"} href={(x) => (who.sample ? null : `/next/ngo/cases/${x.case_id}`)}
        empty={<><b>{active === "mine" ? "Nothing is waiting on you" : active === "others" ? "Nothing is waiting on anyone else" : active === "reported" ? "Nothing has been reported yet" : `Nothing is ${STAGE_LABEL[active as Stage].toLowerCase()}`}</b>{active === "mine" && laneCount("others") ? <p>Open With others to see what the rest of the team holds.</p> : null}</>} />
      {who.sample ? <p className="nx-foot">Signed in, each row opens its case, where evidence is added, the vet signs and a coordinator reviews.</p> : null}
    </>
  );
}
