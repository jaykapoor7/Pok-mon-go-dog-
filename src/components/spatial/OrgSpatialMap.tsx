"use client";

import { Suspense } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePartnerAccess } from "@/components/partner/PartnerGate";
import { SpatialMap } from "./SpatialMap";

/* The organisation's field map: the same instrument as the public map, read
   from the organisation's own register under its own access.

   The workspace is readable by anyone evaluating it, but its records are
   not: until someone signs in as a member, the map shows the public
   register and says so, rather than an empty night. */
export function OrgSpatialMap() {
  const { user, ready, openSignIn } = useAuth();
  const { member, ready: accessReady } = usePartnerAccess();
  if (!ready || (user && !accessReady)) return <div className="sm-host is-fill" />;
  const org = Boolean(user && member);
  const notice = org ? null : (
    <>
      This is the public register.{" "}
      {user
        ? <>Your organisation&rsquo;s own records appear here once your membership is verified.</>
        : <><button type="button" onClick={openSignIn}>Sign in</button> as a member to see your organisation&rsquo;s own records and every open case.</>}
    </>
  );
  return (
    <div className="sm-host is-fill">
      <Suspense fallback={null}>
        <SpatialMap key={org ? "org" : "public"} scope={org ? "org" : "public"} userKey={user?.id ?? null} notice={notice} />
      </Suspense>
    </div>
  );
}
