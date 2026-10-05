"use client";

import { Suspense } from "react";
import { SpatialMap } from "@/components/spatial/SpatialMap";

/* The public municipal surface deliberately reuses the atlas engine rather
 * than creating a separate KPI dashboard. The same bounded city data,
 * filters, source-aware cells and inspectors are what make coverage auditable
 * and allow a council to drill from a city layer to the underlying records. */
export function MunicipalCommand() {
  return (
    <div className="sm-host municipal-command">
      <Suspense fallback={null}>
        <SpatialMap surface="municipality" />
      </Suspense>
    </div>
  );
}
