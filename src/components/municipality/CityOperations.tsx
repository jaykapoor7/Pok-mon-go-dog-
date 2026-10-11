"use client";

/* ════════════════════════════════════════════════════════════════════
   Field operations and documented programmes, for one city.

   Moves the City Brief from "where are records" toward "what was done":
   what became of the requests recorded here, how soon a first action was
   dated, and which named programmes organisations have published for the
   city, each with its own source-backed totals. Every figure is a count of
   records with its qualifier beside it; nothing here is coverage, cost or
   population.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Panel } from "@/components/dash/Dashboard";
import { getSupabase } from "@/lib/supabase";
import { getPublicProgrammes, type PublicProgramme } from "@/lib/public-programmes";

type Ops = { total: number; fieldClosed: number; handedOn: number; noAction: number; live: number; unknown: number; medianFirst: number | null; withFirst: number };
const fmt = (n: number) => n.toLocaleString("en-IN");
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const period = (a: string | null, b: string | null) => {
  const f = (s: string | null) => { if (!s) return null; const d = new Date(s); return Number.isFinite(d.getTime()) ? `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}` : null; };
  const x = f(a), y = f(b);
  return x && y ? (x === y ? x : `${x} – ${y}`) : x ?? y ?? "Dates not recorded";
};

export function CityOperations({ city }: { city: string | null }) {
  const [ops, setOps] = useState<Ops | null | "error">(null);
  const [progs, setProgs] = useState<PublicProgramme[] | null>(null);

  useEffect(() => {
    if (!city) return;
    let live = true;
    setOps(null); setProgs(null);
    (async () => {
      const supa = getSupabase();
      if (!supa) { if (live) setOps("error"); return; }
      /* The API returns at most 1,000 rows a call, so read the city's
         requests page by page; a total is never a page size in disguise. */
      const rows: { status_class: string | null; first_action_days: number | null }[] = [];
      for (let from = 0; from < 40_000; from += 1000) {
        const { data, error } = await supa.from("public_case_facts").select("id,status_class,first_action_days").eq("city", city).order("id").range(from, from + 999);
        if (!live) return;
        if (error) { setOps("error"); return; }
        rows.push(...((data ?? []) as typeof rows));
        if (!data || data.length < 1000) break;
      }
      const o: Ops = { total: rows.length, fieldClosed: 0, handedOn: 0, noAction: 0, live: 0, unknown: 0, medianFirst: null, withFirst: 0 };
      const firsts: number[] = [];
      for (const r of rows) {
        const s = r.status_class;
        if (s === "closed") o.fieldClosed++; else if (s === "other_ngo") o.handedOn++;
        else if (s === "no_action" || s === "not_attended") o.noAction++;
        else if (s === "open" || s === "in_progress") o.live++; else o.unknown++;
        if (typeof r.first_action_days === "number" && r.first_action_days >= 0) firsts.push(r.first_action_days);
      }
      firsts.sort((a, b) => a - b);
      o.withFirst = firsts.length;
      o.medianFirst = firsts.length ? firsts[Math.floor(firsts.length / 2)] : null;
      setOps(o);
    })();
    getPublicProgrammes(250).then((all) => { if (live) setProgs(all.filter((p) => (p.city ?? "").toLowerCase() === city.toLowerCase())); }).catch(() => { if (live) setProgs([]); });
    return () => { live = false; };
  }, [city]);

  const bar = (o: Ops) => {
    const parts = [
      { k: "Closed after field work", n: o.fieldClosed, c: "is-done" },
      { k: "Handed to another organisation", n: o.handedOn, c: "is-hand" },
      { k: "Still open", n: o.live, c: "is-live" },
      { k: "Closed, no field action recorded", n: o.noAction, c: "is-none" },
      { k: "Status not recorded", n: o.unknown, c: "is-unk" },
    ].filter((p) => p.n > 0);
    return (
      <figure className="co-ops">
        <div className="co-ops-bar" role="img" aria-label={parts.map((p) => `${p.k}: ${fmt(p.n)}`).join(", ")}>
          {parts.map((p) => <i key={p.k} className={p.c} style={{ flexGrow: p.n }} />)}
        </div>
        <ul>{parts.map((p) => <li key={p.k}><i className={p.c} aria-hidden /><span>{p.k}</span><b>{fmt(p.n)}</b></li>)}</ul>
      </figure>
    );
  };

  return (
    <div className="db-row2">
      <Panel title="Field operations" note={ops && ops !== "error" && ops.total ? `What became of the ${fmt(ops.total)} requests recorded in ${city}` : undefined}>
        {ops === null ? <p className="db-empty">Reading…</p>
          : ops === "error" ? <p className="db-empty">The request record could not be read just now.</p>
            : ops.total === 0 ? <p className="db-empty">No requests for help are recorded in {city}. Its record here is animal profiles or programme registers, not field cases.</p>
              : (
                <>
                  {bar(ops)}
                  <p className="co-ops-k">{ops.medianFirst !== null ? <>Median <b>{ops.medianFirst === 0 ? "same day" : `${ops.medianFirst} ${ops.medianFirst === 1 ? "day" : "days"}`}</b> from report to a first dated action, across the {fmt(ops.withFirst)} requests that record one.</> : "No request here records the date of a first action."} &ldquo;No field action recorded&rdquo; is what the source register says, not proof that nothing was done.</p>
                </>
              )}
      </Panel>
      <Panel title="Documented programmes" count={progs?.length} action={{ label: "All programmes", href: "/programmes" }}>
        {progs === null ? <p className="db-empty">Reading…</p>
          : progs.length === 0 ? <p className="db-empty">No organisation has published a programme for {city} yet. Drives, vet camps and registers appear here with their own totals once published.</p>
            : (
              <ul className="co-progs">
                {progs.slice(0, 6).map((p) => (
                  <li key={p.id}>
                    <Link href={`/programmes/${p.id}`}>
                      <span><b>{p.name}</b><small>{p.ngo_name} · {period(p.starts_on, p.ends_on)}</small></span>
                      <span className="co-progs-n">
                        {p.sterilised_recorded > 0 && <em>{fmt(p.sterilised_recorded)} sterilisations</em>}
                        {p.vaccinated_recorded > 0 && <em>{fmt(p.vaccinated_recorded)} vaccinations</em>}
                        {!p.sterilised_recorded && !p.vaccinated_recorded && <em>{fmt(p.animals_recorded)} animals recorded</em>}
                      </span>
                      <ArrowUpRight size={14} aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
      </Panel>
    </div>
  );
}
