"use client";

import { Suspense } from "react";
import { BoundedSpatialMap } from "./BoundedSpatialMap";

/* The field-map shell now uses the same bounded city/viewport contract as
   the public map. Operational queues remain on the NGO dashboard; no route
   downloads an organisation-wide register merely to draw a map. */
export function OrgSpatialMap() {
  return (
    <div className="sm-host is-fill">
      <Suspense fallback={null}>
        <BoundedSpatialMap scope="org" />
      </Suspense>
    </div>
  );
}
