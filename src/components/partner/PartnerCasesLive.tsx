"use client";

import { useEffect, useState } from "react";
import { Loader2, LogIn, ShieldCheck } from "lucide-react";
import { CasesTable } from "@/components/cases/CasesTable";
import { usePartnerAccess } from "@/components/partner/PartnerGate";
import { useAuth } from "@/components/auth/AuthProvider";
import { getPartnerCases } from "@/lib/cases";
import type { Case } from "@/lib/types";

/* ════════════════════════════════════════════════════════════════════
   The workspace is visible to everyone; the records in it are not.

   Cases load through my_org_cases, which runs with the browser session and
   resolves each NGO's own rows. Signed out or unverified, that returns
   nothing and the dashboard renders genuinely empty, the data never
   reaches the page rather than being hidden in the markup.
   ════════════════════════════════════════════════════════════════════ */

export function PartnerCasesLive() {
  const { member, ready } = usePartnerAccess();
  const { openSignIn, user } = useAuth();
  const [cases, setCases] = useState<Case[] | null>(null);

  useEffect(() => {
    if (!ready || !member) {
      setCases([]);
      return;
    }
    let alive = true;
    getPartnerCases()
      .then((c) => alive && setCases(c))
      .catch(() => alive && setCases([]));
    return () => {
      alive = false;
    };
  }, [ready, member]);

  if (!ready || cases === null) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-paw-500" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="rounded border border-dashed border-bark-300 px-6 py-14 text-center dark:border-white/10">
        <ShieldCheck className="mx-auto mb-3 h-7 w-7 text-paw-400" strokeWidth={1.5} />
        <p className="font-display text-xl text-bark-900 dark:text-bark-50">
          No cases to show yet
        </p>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-bark-500">
          This is the workspace your team would work in. Case records load once
          you sign in with an organisation account that has been verified, each NGO sees only its own.
        </p>
        {!user && (
          <button onClick={openSignIn} className="btn-primary mt-5 px-5 py-2.5 text-[13px]">
            <LogIn className="h-4 w-4" /> Sign in
          </button>
        )}
      </div>
    );
  }

  return <CasesTable cases={cases} hrefBase="/partner/cases" />;
}
