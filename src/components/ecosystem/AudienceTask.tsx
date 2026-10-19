"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Figure } from "@/sp/ui";
import { useDemo, type DemoView } from "@/components/request/DemoProvider";
import { WorkflowPreview } from "@/components/request/WorkflowPreview";
import type { CityBrief, Loc, Queue } from "./Commons";

/** Task previews share only the in-memory example. Public data is read-only and separate. */
export function AudienceTask({ kind, queue, brief, locs, map }: { kind: string; queue: Queue; brief: CityBrief; locs: Loc[]; map?: ReactNode }) {
  const { demo, change } = useDemo();
  const [view, setView] = useState<DemoView>("case");
  const [layer, setLayer] = useState<"requests" | "unknown">("requests");
  const [sources, setSources] = useState(false);
  return <div className="lp-audience-task" data-ui>
    {kind === "res" && <article><header><span>Resident view · example</span><h3>Follow the report you sent.</h3></header><div className="lp-resident-receipt"><span className="lp-receipt-stamp">EXAMPLE</span><b>Report near the bus stand</b><p>{demo.sent ? demo.observation : "Try the example report. See how a resident follows the next step."}</p><dl className="brief"><div><dt>Receipt</dt><dd>{demo.sent ? "Received" : "Not sent"}</dd></div><div><dt>Organisation</dt><dd>{demo.accepted ? "Example organisation · demo only" : "Pending acceptance"}</dd></div><div><dt>Updates</dt><dd>No care recorded</dd></div></dl>{!demo.sent ? <button className="lp-primary" type="button" onClick={() => change({ sent: true })}>Load example receipt</button> : <a className="lp-live-link" href="#why">Inspect this example <ArrowRight size={16} aria-hidden /></a>}</div><p className="lp-footnote">The same isolated example as One Request. No report is published.</p></article>}
    {kind === "ngo" && <><WorkflowPreview prefix="audience-example" view={view} setView={setView} map={map} />{!demo.sent && <button type="button" className="lp-primary lp-load" onClick={() => change({ sent: true })}>Load the shared example</button>}<p className="lp-footnote lp-public-note">Public context: {queue.length ? `${queue.length} sampled requests available in the public record; imported history may be included.` : "Public requests are unavailable right now."} The example queue above is separate.</p></>}
    {kind === "city" && <article><header><span>Municipal view · actual public record</span><h3>{brief?.city ?? "City"}, area by area.</h3></header><div className="lp-layer-switch" role="group" aria-label="Public information layer"><button type="button" aria-pressed={layer === "requests"} onClick={() => setLayer("requests")}>Requests by area</button><button type="button" aria-pressed={layer === "unknown"} onClick={() => setLayer("unknown")}>Unknown sterilisation</button></div>{layer === "requests" ? <><div className="lp-city-map">{map}</div>{locs.length ? <ul className="lp-area-list">{locs.slice(0, 3).map(l => <li key={l.name}><span>{l.name}</span><b>{l.open.toLocaleString("en-IN")} open</b></li>)}</ul> : <p className="lp-footnote">Locality information unavailable.</p>}</> : <div className="lp-public-figures"><PublicFigure label="Sterilisation not recorded" value={brief?.ster_unknown} note="Unknown is not counted as unsterilised." /><PublicFigure label="Animals on the record" value={brief?.animals} note="Recorded coverage, not the city's animal population." /></div>}<Link className="lp-live-link" href={brief ? `/explore?city=${encodeURIComponent(brief.city)}` : "/explore"}>Explore this public geography <ArrowRight size={16} aria-hidden /></Link></article>}
    {kind === "fund" && <article><header><span>Partner view · actual public record</span><h3>Check what the evidence says.</h3></header><div className="lp-public-figures"><PublicFigure label="Recorded requests" value={brief?.cases} note={`${brief?.city ?? "City"} · open and closed requests, not rescue outcomes.`} /><PublicFigure label="Recorded animals" value={brief?.animals} note="Includes imported records. Coverage is incomplete." /></div><button className="lp-source-control" type="button" onClick={() => setSources(s => !s)} aria-expanded={sources} aria-controls="audience-sources">{sources ? "Hide source notes" : "Inspect sources and limits"}</button>{sources && <div id="audience-sources" className="lp-source-notes"><p>Figures come from StrayPaw’s public geographic rollups. Imported history is not evidence of current StrayPaw activity. This example report contributes to none of these figures.</p><Link href="/evidence">Read methodology and credited data sources</Link></div>}<Link className="lp-live-link" href="/community/organisations">Explore the organisation directory <ArrowRight size={16} aria-hidden /></Link></article>}
  </div>;
}

function PublicFigure({ label, value, note }: { label: string; value: number | null | undefined; note: ReactNode }) {
  return <div><dl><Figure label={label} value={value} /></dl><small>{note}</small></div>;
}
