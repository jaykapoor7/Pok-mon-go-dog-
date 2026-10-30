"use client";

/* ════════════════════════════════════════════════════════════════════
   Moderation · Recent arrivals. Everything that came in, newest first:
   sightings in any status (an auto-approved one never waits in New
   reports, so this is the only place it is listed) and requests for
   help opened in StrayPaw, from the community or an organisation.
   Read-only; a pending sighting is decided in New reports.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { day, since } from "../../ui";
import { Filters, Inspector, Line, Pane, Photo, Readout, Table, type Col } from "./parts";
import type { P } from "./Queues";
import type { Arrival, ArrivalsRead, SectionId } from "./types";

type F = "all" | "community" | "organisation";

const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Waiting for review", tone: "is-caution" },
  live: { label: "Live", tone: "is-care" },
  rejected: { label: "Rejected", tone: "is-plain" },
  unverified: { label: "Not yet taken", tone: "is-caution" },
  open: { label: "Open", tone: "is-caution" },
  in_progress: { label: "In progress", tone: "is-care" },
  closed: { label: "Closed", tone: "is-plain" },
  resolved: { label: "Resolved", tone: "is-plain" },
};
const pill = (s: string) => { const x = STATUS[s] ?? { label: s.replace(/_/g, " "), tone: "is-plain" }; return <span className={`pill ${x.tone}`}>{x.label}</span>; };
const channel = (c: string | null) => (!c ? null : c === "own_line" ? "StrayPaw report form" : c === "whatsapp" ? "WhatsApp" : c.replace(/_/g, " "));

export function Arrivals({ read, reload, empty, onGo }: P<ArrivalsRead> & { onGo: (id: SectionId) => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const [f, setF] = useState<F>("all");
  const rows = useMemo(() => read?.data?.arrivals ?? [], [read]);
  const shown = rows.filter((x) => f === "all" || x.source === f);
  const cur = rows.find((x) => x.id === sel) ?? null;
  const n = (k: F) => (k === "all" ? rows.length : rows.filter((x) => x.source === k).length);

  if (!read || !read.data) return <Readout read={read} what="arrivals" onRetry={() => void reload()}>{() => null}</Readout>;
  if (!rows.length) return <>{empty}</>;

  const cols: Col<Arrival>[] = [
    { key: "what", head: "What came in", primary: true, cell: (x) => <><b>{x.title}</b><small className="cn-sub">{x.kind === "sighting" ? "Sighting" : "Request for help"}{x.demo ? " · demo" : ""}</small></> },
    { key: "from", head: "From", cell: (x) => <><span className={`pill ${x.source === "organisation" ? "is-plain" : "is-care"}`}>{x.source === "organisation" ? "Organisation" : "Community"}</span><small className="cn-sub">{x.by}</small></> },
    { key: "where", head: "Place", cell: (x) => x.place ?? <span className="cn-unk">Not recorded</span> },
    { key: "status", head: "Status", cell: (x) => pill(x.status) },
    { key: "when", head: "Received", className: "mono", cell: (x) => since(x.at) },
  ];

  return (
    <Pane receipt={null} idle="Choose an arrival to read it."
      tools={<Filters label="Filter by source" value={f} onChange={(k) => { setF(k); setSel(null); }}
        options={([["all", "Everything"], ["community", "Community"], ["organisation", "Organisations"]] as [F, string][]).map(([key, label]) => ({ key, label, n: n(key) }))} />}
      inspector={cur && (
        <Inspector kicker={cur.kind === "sighting" ? "Sighting" : "Request for help"} title={cur.title} onClose={() => setSel(null)}>
          {cur.photo && <Photo src={cur.photo} sensitive alt={`Photo sent with this ${cur.kind === "sighting" ? "sighting" : "request"}`} />}
          <dl className="ledger">
            <Line k="Status">{pill(cur.status)}</Line>
            <Line k="Received">{day(cur.at)} · {since(cur.at)}</Line>
            <Line k="From">{cur.by}</Line>
            {cur.org && cur.source === "community" && <Line k="Taken by">{cur.org}</Line>}
            <Line k="Place">{cur.place ?? <span className="cn-unk">Not recorded</span>}</Line>
            {channel(cur.channel) && <Line k="Came in through">{channel(cur.channel)}</Line>}
            {cur.code && <Line k="Case code"><span className="mono">{cur.code}</span></Line>}
          </dl>
          {cur.notes && <blockquote className="tr-notes">{cur.notes}</blockquote>}
          <div className="cn-do">
            {cur.kind === "sighting" && cur.status === "pending" && <button type="button" className="btn is-s is-ink" onClick={() => onGo("sightings")}>Review in New reports <ArrowRight size={14} aria-hidden /></button>}
            {cur.animal && <Link className="btn is-s" href={`/animal/${cur.animal}`} target="_blank">Open the animal <ExternalLink size={13} aria-hidden /></Link>}
          </div>
          {cur.kind === "request" && cur.status === "unverified" && !cur.org && <p className="small">No organisation has taken this request yet.</p>}
        </Inspector>
      )}>
      <Table label="Recent arrivals" rows={shown} cols={cols} selected={sel} onSelect={setSel} />
    </Pane>
  );
}
