"use client";

import { Suspense } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePartnerAccess } from "@/components/partner/PartnerGate";
import { SpatialMap } from "./SpatialMap";

/* The organisation's field map: the same instrument as the public map, read
   from the organisation's own register under its own access.

   The workspace is readable by anyone evaluating it, but its records are
   not: until someone signs in as a member (the sidebar offers it), the map
   shows the public register rather than an empty night. */
export function OrgSpatialMap() {
  const { user, ready } = useAuth();
  const { member, ready: accessReady } = usePartnerAccess();
  if (!ready || (user && !accessReady)) return <div className="sm-host is-fill" />;
  const org = Boolean(user && member);
  return (
    <div className="sm-host is-fill">
      <Suspense fallback={null}>
        <SpatialMap key={org ? "org" : "public"} scope={org ? "org" : "public"} userKey={user?.id ?? null} />
      </Suspense>
    </div>
  );
}
