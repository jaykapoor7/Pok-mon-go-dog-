"use client";

import { Suspense } from "react";
import { SpatialMap } from "./SpatialMap";

/* Full field-map controls over one of the signed-in organisation's bounded
   city datasets. Operational queues remain on the NGO dashboard. */
export function OrgSpatialMap() {
  return (
    <div className="sm-host is-fill">
      <Suspense fallback={null}>
        <SpatialMap scope="org" />
      </Suspense>
    </div>
  );
}
