"use client";

/* The line of work on Home: the same five stages as the board, with the same names and the same counts
   (./pipeline.ts), as one strip of figures. Each stage opens the board at that stage. A count that could not be
   read says "not read", never zero. The person's own step is marked. Animals whose identity still needs a person
   are not a stage of the line: they are named underneath. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Role } from "../shell/workspaces";
import { stageHref, usePipeline } from "./pipeline";
import "./brief.css";

export function Journey({ orgId, role }: { orgId: string; role: string | null }) {
  const { cols, capped } = usePipeline(true, role as Role | null);
  const [identity, setIdentity] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    const db = getSupabase();
    if (!db) return;
    void db.from("dogs").select("id", { count: "exact", head: true }).eq("ngo_id", orgId).in("identity_state", ["provisional", "possible_duplicate"]).then((r) => { if (live && !r.error) setIdentity(r.count ?? 0); });
    return () => { live = false; };
  }, [orgId]);
  const lead = role === "admin" || role === "coordinator";

  return (
    <nav className="jy2" aria-label="The line of work today">
      <ol>{cols.map((s) => {
        const v = s.cards?.length ?? 0;
        const fromQueue = s.id === "vet" || s.id === "evidence" || s.id === "report";
        return <li key={s.id}><Link href={stageHref(s.id)} title={s.hint}>
          <span className="jy2-t">{s.title}{s.mine ? <em>Yours</em> : null}</span>
          <b className={s.state === "ready" ? undefined : "is-quiet"}>{s.state === "loading" ? "…" : s.state === "failed" ? "not read" : `${v}${fromQueue && capped ? "+" : ""}`}</b>
        </Link></li>;
      })}</ol>
      {lead && identity ? <p className="jy2-note"><Link className="kc-link" href="/ngo/animals/identity"><b>{identity}</b> {identity === 1 ? "animal needs" : "animals need"} their identity confirmed</Link></p> : null}
    </nav>
  );
}
