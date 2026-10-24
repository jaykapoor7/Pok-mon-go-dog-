import { Suspense } from "react";
import { FieldMap } from "@/sp/map/FieldMap";
import { MapSkeleton } from "@/sp/map/MapSkeleton";
import { NGO_LENSES } from "@/sp/atlas/lenses";
import { NgoGate } from "@/sp/ngo/Gate";

export const dynamic = "force-dynamic";
export const metadata = { title: "Map, StrayPaw NGO", robots: { index: false, follow: false } };

/* NGO · Map: the organisation's own open work, needs and care by area,
   read with the member's token (scope=org, never cached). */
export default function NgoMapPage() {
  return (
    <NgoGate title="Map" lede="Your organisation's open work, needs and care, by area.">
      <Suspense fallback={<MapSkeleton label="Reading your organisation's map…" />}>
        <FieldMap variant="ngo" scope="org" lenses={NGO_LENSES} defaultLens="help" />
      </Suspense>
    </NgoGate>
  );
}
