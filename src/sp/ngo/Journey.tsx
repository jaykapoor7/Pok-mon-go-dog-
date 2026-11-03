"use client";

/* The five-step journey on Home, as live counts that open the exact queue:
   arrived → identity → veterinary → recovery & release → submission.
   Each count is read under the member's own session; a count that could
   not be read shows "not read", never zero. The person's own step is
   marked so a vet, a field worker and a coordinator each see where they
   start. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { orgIncoming } from "@/lib/campaigns";
import { stageOf, verificationQueue } from "@/lib/abc";

type Counts = { arrived: number | null; identity: number | null; vet: number | null; release: number | null; claimable: number | null; capped?: boolean };
type Step = { key: keyof Counts; n: string; title: string; hint: string; href: string; mine: boolean };

export function Journey({ orgId, role }: { orgId: string; role: string | null }) {
  const [c, setC] = useState<Counts | null>(null);
  useEffect(() => {
    let live = true;
    const db = getSupabase();
    const identity = db ? db.from("dogs").select("id", { count: "exact", head: true }).eq("ngo_id", orgId).in("identity_state", ["provisional", "possible_duplicate"]) : null;
    Promise.allSettled([orgIncoming("ours"), orgIncoming("community"), identity, verificationQueue(500)]).then(([ours, community, ident, queue]) => {
      if (!live) return;
      const total = (r: PromiseSettledResult<{ total_count?: number }[]>) => r.status === "fulfilled" ? (r.value[0]?.total_count ?? r.value.length) : null;
      const a = total(ours as PromiseSettledResult<{ total_count?: number }[]>), b = total(community as PromiseSettledResult<{ total_count?: number }[]>);
      const idr = ident.status === "fulfilled" && ident.value && !ident.value.error ? ident.value.count ?? 0 : null;
      const rows = queue.status === "fulfilled" ? queue.value.filter((r) => r.provenance !== "imported_historical_record") : null;
      setC({
        arrived: a === null || b === null ? null : a + b,
        identity: idr,
        vet: rows ? rows.filter((r) => stageOf(r) === "vet").length : null,
        release: rows ? rows.filter((r) => ["evidence", "returned"].includes(stageOf(r)) && r.missing.some((k) => k === "release_photo" || k === "release_location")).length : null,
        claimable: rows ? rows.filter((r) => stageOf(r) === "ready").length : null,
        /* The queue returns at most 500 records; counts from a full read are lower bounds. */
        capped: queue.status === "fulfilled" && queue.value.length >= 500,
      });
    });
    return () => { live = false; };
  }, [orgId]);

  const lead = role === "admin" || role === "coordinator";
  const steps: Step[] = [
    { key: "arrived", n: "1", title: "Receive", hint: "New reports to prepare", href: "/ngo/inbox", mine: role === "member" || lead },
    { key: "identity", n: "2", title: "Register", hint: "Animals to confirm", href: "/ngo/animals/identity", mine: lead },
    { key: "vet", n: "3", title: "Treat", hint: "Waiting for the vet", href: "/ngo/verification?stage=vet", mine: role === "veterinarian" },
    { key: "release", n: "4", title: "Release", hint: "Photo or place missing", href: "/ngo/verification?stage=evidence", mine: role === "member" || lead },
    { key: "claimable", n: "5", title: "Submit", hint: "Approved, ready to bill", href: "/ngo/packages", mine: lead },
  ];
  return (
    <nav className="jy" aria-label="Today across the five steps">
      <ol>{steps.map((s) => {
        const v = c?.[s.key];
        const fromQueue = s.key === "vet" || s.key === "release" || s.key === "claimable";
        return <li key={s.key} className={s.mine ? "is-mine" : undefined}><Link href={s.href}>
          <span className="jy-n" aria-hidden>{s.n}</span>
          <span className="jy-t"><b>{s.title}</b><small>{s.hint}</small></span>
          <span className={`jy-c${v ? " is-on" : ""}`}>{c === null ? "…" : v === null || v === undefined || typeof v === "boolean" ? "not read" : `${v}${fromQueue && c.capped ? "+" : ""}`}</span>
        </Link></li>;
      })}</ol>
    </nav>
  );
}
