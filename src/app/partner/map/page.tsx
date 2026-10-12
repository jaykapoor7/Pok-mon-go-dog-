import { Suspense } from "react";
import { LivingMap } from "@/components/livingmap/LivingMap";

export const dynamic = "force-dynamic";
export const metadata = { title: "Living map, StrayPaw Partner" };

/* The organisation's own Living Map: the same product as /map, read from
 * its own records (including those that are not public), opening on Work
 * next, with the people who hold each request and the actions to take. */
export default function PartnerMapPage() {
  return (
    <div className="lm-host is-fill">
      <Suspense fallback={null}>
        <LivingMap scope="org" defaultQ="act" />
      </Suspense>
    </div>
  );
}
