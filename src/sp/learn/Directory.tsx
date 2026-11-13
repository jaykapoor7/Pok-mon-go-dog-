"use client";

/* The national directory of animal-welfare organisations (lib/platform/orgs),
   filterable by state and text. Each entry names its source; listing is not
   an endorsement. */

import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { ORGS } from "@/lib/platform/orgs";
import { STATES } from "@/lib/platform/geography";
import { Empty, More, Panel, SearchBox, Table, Tools, type Col } from "@/ws/kit";
import { usePageState } from "@/ws/store";

const stateName = new Map(STATES.map((s) => [s.code, s.name]));
type Org = (typeof ORGS)[number];

export function Directory() {
  const [q, setQ] = usePageState("dir-q", "");
  const [st, setSt] = usePageState("dir-state", "");
  const states = useMemo(() => [...new Set(ORGS.map((o) => o.stateCode))].map((c) => [c, stateName.get(c) ?? c] as const).sort((a, b) => a[1].localeCompare(b[1])), []);
  const t = q.trim().toLowerCase();
  const rows = ORGS.filter((o) => (!st || o.stateCode === st) && (!t || `${o.name} ${o.city} ${o.focus.join(" ")}`.toLowerCase().includes(t)));
  const cols: Col<Org>[] = [
    { key: "name", label: "Organisation", width: "minmax(0, 1.4fr)", render: (o) => <span title={o.summary}>{o.name}</span> },
    { key: "place", label: "Place", width: "minmax(0, 1fr)", render: (o) => <>{o.city}, {stateName.get(o.stateCode) ?? o.stateCode}{o.founded ? ` · since ${o.founded}` : ""}</> },
    { key: "focus", label: "Work", width: "minmax(0, 1.4fr)", render: (o) => <span title={o.summary}>{o.focus.join(" · ")}</span> },
    { key: "source", label: "Source", width: "minmax(0, 1fr)", render: (o) => o.source },
    { key: "url", label: "Website", width: "80px", align: "end", keep: true, render: (o) => (o.url ? <a className="lrn-link" href={o.url} target="_blank" rel="noreferrer">Open <ExternalLink size={12} aria-hidden /><span className="sr-only"> {o.name} website</span></a> : "") },
  ];
  return (
    <div>
      <Tools end={<span className="lrn-fine">{rows.length} of {ORGS.length}</span>}>
        <SearchBox value={q} onChange={setQ} placeholder="Name, city or kind of work" label="Search organisations" />
        <select className="lrn-select" value={st} onChange={(e) => setSt(e.target.value)} aria-label="State"><option value="">Every state</option>{states.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
      </Tools>
      <Panel>
        {rows.length ? <More items={rows} cap={8} noun="organisations">{(shown) => <Table label="Animal-welfare organisations" cols={cols} rows={shown} rowKey={(o) => o.id} />}</More> : <Empty title="No organisation matches">Try a different name, city or state.</Empty>}
      </Panel>
    </div>
  );
}
