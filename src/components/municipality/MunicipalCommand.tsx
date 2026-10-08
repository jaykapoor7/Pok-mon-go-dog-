"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SpatialMap } from "@/components/spatial/SpatialMap";
import "./municipal.css";

/* The public municipal surface deliberately reuses the atlas engine rather
 * than creating a separate KPI dashboard. The same bounded city data,
 * filters, source-aware cells and inspectors are what make coverage auditable
 * and allow a council to drill from a city layer to the underlying records. */
export function MunicipalCommand() {
  const params = useSearchParams();
  const href = (mode: string) => { const next = new URLSearchParams(params.toString()); next.set("mode", mode); return `/municipality?${next}`; };
  return (
    <div className="sm-host municipal-command">
      <div className="mc-protocol">
        <div><p>StrayPaw / municipal evidence desk</p><h1>Read the place. <em>Then decide.</em></h1></div>
        <nav aria-label="Municipal planning questions"><Link href={href("arv")}>Recorded care</Link><Link href={href("cases")}>Case activity</Link><Link href={href("coverage")}>Evidence quality</Link></nav>
        <details><summary>Planning limits</summary><p>These are recorded profiles and interventions—not a population denominator. H3 cells are not wards. Empty areas mean incomplete reporting, not verified absence of animals or care. Allocation decisions need compatible local population, cost and programme evidence.</p></details>
      </div>
      <div className="mc-atlas"><Suspense fallback={null}>
        <SpatialMap surface="municipality" />
      </Suspense></div>
    </div>
  );
}
