"use client";

import { Suspense } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePartnerAccess } from "@/components/partner/PartnerGate";
import { ExportStudio } from "@/components/partner/ExportStudio";
import { Report } from "./Report";

/* An organisation's own records, explained: the same report as /insights,
   read from the organisation's register under its own access, with exact
   counts and the exports at the end. Until someone signs in as a member it
   shows the public register and says so. */
export function OrgReport() {
  const { user, ready } = useAuth();
  const { member, ready: accessReady } = usePartnerAccess();
  if (!ready || (user && !accessReady)) return null;
  const org = Boolean(user && member);
  /* Signed out, the partner layout already asks for a sign-in; a signed-in
     person who is not yet a member is told why they see the public register. */
  const notice = user && !member
    ? <>This is the public register. Your organisation&rsquo;s own records, with exact counts and exports, appear here once your membership is verified.</>
    : null;
  return (
    <Suspense fallback={null}>
      <Report
        key={org ? "org" : "public"}
        scope={org ? "org" : "public"}
        userKey={user?.id ?? null}
        notice={notice}
        tail={org ? (
          <section className="an-ch" id="export" aria-labelledby="export-q">
            <header className="an-ch-head">
              <p className="an-ch-n sys-mono">—</p>
              <h2 id="export-q">Take the record out</h2>
              <p className="an-ch-answer">Everything above, as files a funder, a municipality or a vet can open.</p>
            </header>
            <ExportStudio />
          </section>
        ) : null}
      />
    </Suspense>
  );
}
