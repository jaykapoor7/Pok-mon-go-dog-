"use client";

/* The national directory of animal-welfare organisations (lib/platform/orgs),
   filterable by state and text. Each entry names its source; listing is not
   an endorsement. */

import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { ORGS } from "@/lib/platform/orgs";
import { STATES } from "@/lib/platform/geography";

const stateName = new Map(STATES.map((s) => [s.code, s.name]));

export function Directory() {
  const [q, setQ] = useState("");
  const [st, setSt] = useState("");
  const states = useMemo(() => [...new Set(ORGS.map((o) => o.stateCode))].map((c) => [c, stateName.get(c) ?? c] as const).sort((a, b) => a[1].localeCompare(b[1])), []);
  const t = q.trim().toLowerCase();
  const rows = ORGS.filter((o) => (!st || o.stateCode === st) && (!t || `${o.name} ${o.city} ${o.focus.join(" ")}`.toLowerCase().includes(t)));
  return (
    <div className="dr">
      <div className="row dr-tools">
        <label className="search"><Search size={15} aria-hidden /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, city or kind of work" aria-label="Search organisations" /></label>
        <select className="select" value={st} onChange={(e) => setSt(e.target.value)} aria-label="State"><option value="">Every state</option>{states.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
        <span className="small">{rows.length} of {ORGS.length}</span>
      </div>
      <ul className="dr-list">
        {rows.map((o) => (
          <li key={o.id}>
            <div><b>{o.name}</b><small>{o.city}, {stateName.get(o.stateCode) ?? o.stateCode}{o.founded ? ` · since ${o.founded}` : ""}</small></div>
            <p>{o.summary}</p>
            <p className="small">{o.focus.join(" · ")} · source: {o.source}</p>
            {o.url && <a className="link small" href={o.url} target="_blank" rel="noreferrer">Website <ExternalLink size={11} aria-hidden /></a>}
          </li>
        ))}
      </ul>
    </div>
  );
}
