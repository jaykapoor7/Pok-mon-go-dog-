"use client";

/* ════════════════════════════════════════════════════════════════════
   The evidence drawer (decisions 023, 027, 034; City Layers' lesson:
   tapping a figure reveals why it exists).

   For the active layer and city: what is counted (unit), from which
   source, at what precision, over what period, against what
   denominator (here: none — these are records, not a population), what
   is excluded, how fresh the build is, and the programmes on the public
   record that cover the city. Every statement comes from the data or
   from the source audit; nothing here is a computed claim of coverage.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { getPublicProgrammes, programmeCategory, type PublicProgramme } from "@/lib/public-programmes";
import type { MapCell, MapCity } from "@/lib/livingmap/types";
import { LENSES, type LensId } from "./lenses";
import { KINDS, type EvidenceKind } from "./evidence";

const f = (n: number) => n.toLocaleString("en-IN");
let programmes: Promise<PublicProgramme[]> | null = null;

export function EvidenceDrawer({ lens, city, data, cells, evidence, ranged }: { lens: LensId; city: string; data: MapCity; cells: MapCell[]; evidence: { kind: EvidenceKind; precision: string; note: string } | null; ranged: boolean }) {
  const [open, setOpen] = useState(true);
  const [progs, setProgs] = useState<PublicProgramme[] | null>(null);
  useEffect(() => { let live = true; (programmes ??= getPublicProgrammes(200).catch(() => [])).then((p) => { if (live) setProgs(p.filter((x) => (x.city ?? "").toLowerCase() === city.toLowerCase())); }); return () => { live = false; }; }, [city]);
  const L = LENSES[lens];
  let exact = 0, animals = 0, unconf = 0, unk = 0;
  for (const c of cells) { exact += c.exact_loc; animals += c.animals; unconf += c.open_unconfirmed ?? 0; unk += c.ster_unknown; }
  const rows: [string, string][] = [
    ["What is counted", L.unit === "needing help" ? "Animals flagged as needing help or with a confirmed open request (whichever is larger in each area), plus missed rechecks" : `${L.unit[0].toUpperCase()}${L.unit.slice(1)} on the public record`],
    ["Unit of area", "H3 area, ≈0.74 km². Not a ward: ward views need ward boundaries StrayPaw does not hold"],
    ["Source", evidence ? `${KINDS[evidence.kind].label}: ${KINDS[evidence.kind].reads.toLowerCase()}` : "Public animal and request records"],
    ["Placement", `${evidence?.precision ?? "Area level"}. ${animals ? Math.round((exact / animals) * 100) : 0}% of animals placed from a map point; the rest by locality name`],
    ["Period", ranged ? "The months selected on the timeline" : "All recorded time"],
    ["Denominator", "None. These are records, not a population: no figure here is a share of the city's animals"],
    ["Not known", lens === "abc" || lens === "care" ? `${f(unk)} animals with no recorded sterilisation status, shown hatched` : lens === "requests" || lens === "help" ? `${f(unconf)} requests open only in an imported register, shown apart` : "Areas with no record are hatched rings, never zero"],
    ["Built", `${new Date(data.built).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} from the public projection`],
  ];
  return (
    <section className="insp-sec evd">
      <button type="button" className="evd-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}><span className="k">Evidence · {L.label}</span><ChevronDown size={15} aria-hidden /></button>
      {open && (
        <>
          <p className="small">{L.define}</p>
          <dl className="ledger evd-ledger">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          <p className="small">{evidence?.note}</p>
        </>
      )}
      <div className="evd-progs">
        <h3 className="insp-sh">Programmes on the record here <span className="mono">{progs ? progs.length : "…"}</span></h3>
        {progs && !progs.length && <p className="small">No public programme is recorded for {city}. That is a gap in the record, not proof none ran.</p>}
        {progs && progs.length > 0 && (
          <ul>{progs.slice(0, 6).map((p) => (
            <li key={p.id}><Link href={`/city/programmes/${p.id}`}><b>{p.name}</b><small>{p.ngo_name} · {programmeCategory(p)} · {[p.starts_on, p.ends_on].filter(Boolean).map((d) => new Date(d!).getFullYear()).join("–") || "dates not recorded"} · {f(p.animals_recorded)} animals recorded</small></Link></li>
          ))}</ul>
        )}
      </div>
      <div className="row"><Link className="btn is-ink is-s" href={`/city/report?city=${encodeURIComponent(city)}`}>Publish a city report <ArrowUpRight size={14} aria-hidden /></Link><Link className="btn is-ghost is-s" href={`/city/insights?city=${encodeURIComponent(city)}`}>Findings</Link></div>
    </section>
  );
}
