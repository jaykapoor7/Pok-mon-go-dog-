"use client";

import Link from "next/link";
import { Scissors } from "lucide-react";
import { shortCode } from "@/lib/caseCode";
import { Shell } from "../../Shell";
import { Sample } from "../../ui";
import { Denied, Empty, RecordHead, dayTime } from "../../kit";
import { useLive } from "../../live";
import { AbcEvidence, useAbcCase } from "../abc/AbcEvidence";
import { GhMark, Opening } from "../gh/parts";

/* A veterinary procedure for sign-off: the case's evidence, the veterinarian's authorisation and the coordinator's
   review, from the veterinarian's side. The same evidence component serves the NGO's case record. */

export function ProcedureSignOff({ id }: { id: string }) {
  const live = useLive();
  if (!live.ready) return <Opening ws="health" crumb={["Procedures", "Procedure"]} />;
  if (!live.org) return <View id={id} sample />;
  /* Procedures belong to an NGO's cases: a veterinarian, coordinator or member of that NGO opens them. */
  const ngo = live.orgFor("healthcare")?.kind === "veterinary" ? live.orgFor("healthcare") : live.orgFor("ngo");
  if (!ngo) return <Shell ws="health" crumb={["Procedures", "Procedure"]}><div className="nx-page" style={{ maxWidth: 760 }}><h1 className="nx-h1">Procedure</h1><Denied what="Procedures are signed in the NGO that did them" why="Your account is not a veterinarian or member of an NGO, so there is no procedure here for you to sign or review." back={{ href: "/health/today", label: "Back to Today" }} /></div></Shell>;
  return <View id={id} sample={false} />;
}

function View({ id, sample }: { id: string; sample: boolean }) {
  const c = useAbcCase(id, sample);
  const h = c.d?.head;
  if (!sample && c.d && !h) return <Shell ws="health" crumb={["Procedures", "Procedure"]}><div className="nx-page" style={{ maxWidth: 760 }}><h1 className="nx-h1">Procedure</h1><Empty title="This procedure is not visible to you" hint="It may belong to another organisation, or the link is wrong." action={<Link href="/health/procedures" className="nx-btn is-quiet">Back to procedures</Link>} /></div></Shell>;
  const code = h?.case_code ? shortCode(h.case_code) : null;
  return (
    <Shell ws="health" crumb={["Procedures", code ?? "Procedure"]}>
      <RecordHead av={<Scissors size={18} />} title={<>{h?.title || code || "ABC procedure"}{sample ? <Sample /> : null}</>}
        sub={h ? <>{[h.zone || h.city, `opened ${dayTime(h.created_at)}`].filter(Boolean).join(" · ")}{code ? <span className="gh-code"> · {code}</span> : null} </> : "Reading the procedure…"}
        actions={!sample && h ? <Link href={`/ngo/cases/${id}`} className="nx-btn is-quiet is-sm">Open the case</Link> : undefined} />
      <GhMark />
      <div className="gh-body" style={{ maxWidth: 1120, borderTop: "1px solid var(--line)", marginTop: 16 }}>
        <AbcEvidence caseId={id} sample={sample} data={c} />
      </div>
    </Shell>
  );
}
