"use client";

import { FieldMap } from "@/sp/map/FieldMap";
import type { NationalCity, Unplaced } from "@/lib/livingmap/types";

/** Reuses the public map with the existing non-reporting municipal variant.
 * Its camera/URL state lives in this document, never on the landing page. */
export function PublicMapPreview({ cities, unplaced }: { cities: NationalCity[]; unplaced: Unplaced[] }) {
  return <div className="public-map-preview" onClickCapture={e => {
    const link = (e.target as Element).closest("a");
    if (link) link.setAttribute("target", "_top");
  }}><FieldMap variant="city" scope="public" initialCities={cities} initialUnplaced={unplaced} /></div>;
}
