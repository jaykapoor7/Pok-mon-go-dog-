"use client";

/* ════════════════════════════════════════════════════════════════════
   Today in the field: what a coordinator hands out in the morning.

   Follow-ups that are due or overdue, open cases nobody holds (critical
   first), who holds how much, and where the open work sits. Read with the
   member's own session — this page used to read cases on the server,
   which has no session, so every list on it was always empty.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePartnerAccess } from "@/components/partner/PartnerGate";
import { openRegister, type RegisterRow } from "@/lib/case-register";
import { dueFollowups, type DueFollowup } from "@/lib/ops";
import { triageOf, type Triage } from "@/lib/register/taxonomy";
import "./field.css";

const DAY = 86_400_000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${MON[d.getMonth()]}`; };
const cond = (r: RegisterRow) => (r.condition_class && r.condition_class !== "Not recorded" ? r.condition_class : null);
const triage = (r: RegisterRow): Triage => (r.severity === "critical" ? "Critical" : cond(r) ? triageOf(cond(r)) : "Unclassified");
const RANK: Record<Triage, number> = { Critical: 0, Priority: 1, Routine: 2, Unclassified: 3 };

export function FieldToday() {
  const { user, ready } = useAuth();
  const { member, ready: accessReady } = usePartnerAccess();
  const [open, setOpen] = useState<RegisterRow[] | null>(null);
  const [due, setDue] = useState<DueFollowup[]>([]);

  useEffect(() => {
    if (!ready || !accessReady) return;
    if (!user || !member) { setOpen([]); return; }
    let live = true;
    Promise.all([openRegister(), dueFollowups()]).then(([o, d]) => { if (live) { setOpen(o); setDue(d); } }).catch(() => live && setOpen([]));
    return () => { live = false; };
  }, [ready, accessReady, user, member]);

  const now = Date.now();
  const byId = useMemo(() => new Map((open ?? []).map((r) => [r.id, r])), [open]);
  const nobody = useMemo(() => (open ?? []).filter((r) => !r.assignee_name).sort((a, b) => RANK[triage(a)] - RANK[triage(b)] || (a.occurred_at ?? "").localeCompare(b.occurred_at ?? "")), [open]);
  const holders = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of open ?? []) if (r.assignee_name) m.set(r.assignee_name, (m.get(r.assignee_name) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [open]);
  const places = useMemo(() => {
    const m = new Map<string, { n: number; crit: number }>();
    for (const r of open ?? []) {
      const z = (r.zone ?? "").trim() || "Place not recorded";
      const v = m.get(z) ?? { n: 0, crit: 0 };
      v.n++; if (triage(r) === "Critical") v.crit++;
      m.set(z, v);
    }
    return [...m].sort((a, b) => b[1].crit * 2 + b[1].n - (a[1].crit * 2 + a[1].n)).slice(0, 10);
  }, [open]);

  if (!ready || !accessReady || open === null) return <p className="ft-state"><Loader2 size={16} className="animate-spin" /> Reading today&rsquo;s work…</p>;
  if (!user || !member) return <p className="ft-state">Field work loads once you sign in with an organisation account.</p>;

  const overdue = due.filter((f) => Date.parse(f.due_at) < now).length;
  const maxPlace = places[0]?.[1].n ?? 1;

  return (
    <div className="ft">
      <p className="ft-line">
        <b>{due.length}</b> follow-up{due.length === 1 ? "" : "s"} due this week{overdue ? <>, <em>{overdue} already overdue</em></> : null}.{" "}
        <b>{nobody.length}</b> open case{nobody.length === 1 ? "" : "s"} with nobody on {nobody.length === 1 ? "it" : "them"}.
      </p>

      <div className="ft-grid">
        <section className="ft-sec">
          <h2>Follow-ups due <span className="sys-mono">{due.length}</span></h2>
          {due.length ? (
            <ol className="ft-list">
              {due.slice(0, 14).map((f) => {
                const c = f.case_id ? byId.get(f.case_id) : null;
                const late = Date.parse(f.due_at) < now;
                const href = f.case_id ? `/partner/cases/${f.case_id}` : f.dog_id ? `/partner/animals/${f.dog_id}` : "/partner/records";
                return (
                  <li key={f.id} className={late ? "is-late" : ""}>
                    <Link href={href}>
                      <time className="sys-mono">{day(f.due_at)}</time>
                      <span><b>{c ? cond(c) ?? "A case" : f.kind ? f.kind.replace(/_/g, " ") : "Follow-up"}</b><small>{c ? [c.animal_name, c.zone].filter(Boolean).join(" · ") : late ? "Overdue" : "Due"}</small></span>
                      <i>{late ? `${Math.floor((now - Date.parse(f.due_at)) / DAY)} d late` : "due"}</i>
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : <p className="ft-quiet">Nothing due in the next seven days.</p>}
        </section>

        <section className="ft-sec">
          <h2>Nobody on it <span className="sys-mono">{nobody.length}</span></h2>
          {nobody.length ? (
            <>
              <ol className="ft-list">
                {nobody.slice(0, 10).map((r) => (
                  <li key={r.id}>
                    <Link href={`/partner/cases/${r.id}`}>
                      <span className={`ft-mark is-${triage(r).toLowerCase()}`} />
                      <span><b>{cond(r) ?? "Condition not recorded"}</b><small>{[r.zone, r.occurred_at ? `open since ${day(r.occurred_at)} ${new Date(r.occurred_at).getFullYear()}` : null].filter(Boolean).join(" · ")}</small></span>
                      <ArrowUpRight size={14} />
                    </Link>
                  </li>
                ))}
              </ol>
              {nobody.length > 10 && <Link href="/partner/cases?lens=nobody" className="ft-more">All {nobody.length} in the register <ArrowUpRight size={14} /></Link>}
            </>
          ) : <p className="ft-quiet">Every open case has someone on it.</p>}
        </section>

        <section className="ft-sec">
          <h2>Who has what</h2>
          {holders.length ? (
            <ul className="ft-bars">
              {holders.map(([name, n]) => (
                <li key={name}><span>{name}</span><i style={{ width: `${(n / holders[0][1]) * 100}%` }} /><b className="sys-mono">{n}</b></li>
              ))}
            </ul>
          ) : <p className="ft-quiet">No open case is assigned to anyone yet. Taking a case on its page puts it here.</p>}
        </section>

        <section className="ft-sec">
          <h2>Where the open work is</h2>
          {places.length ? (
            <ul className="ft-bars is-places">
              {places.map(([z, v]) => (
                <li key={z}>
                  <span>{z}</span>
                  <i style={{ width: `${(v.n / maxPlace) * 100}%` }}><em style={{ width: `${(v.crit / v.n) * 100}%` }} /></i>
                  <b className="sys-mono">{v.n}{v.crit ? <small> · {v.crit} critical</small> : null}</b>
                </li>
              ))}
            </ul>
          ) : <p className="ft-quiet">No open cases.</p>}
          <Link href="/partner/map?lens=open" className="ft-more">See it on the map <ArrowUpRight size={14} /></Link>
        </section>
      </div>
    </div>
  );
}
