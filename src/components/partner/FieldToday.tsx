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
const day = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };
/* "1004 d late" reads as a counter; past a month, say it in months or years. */
const lateBy = (ms: number) => { const d = Math.floor(ms / DAY); return d < 45 ? `${d} d late` : d < 540 ? `${Math.round(d / 30)} months late` : `${(d / 365).toFixed(1)} years late`; };
const cond = (r: RegisterRow) => (r.condition_class && r.condition_class !== "Not recorded" ? r.condition_class : null);
const triage = (r: RegisterRow): Triage => (r.severity === "critical" ? "Critical" : cond(r) ? triageOf(cond(r)) : "Unclassified");
const RANK: Record<Triage, number> = { Critical: 0, Priority: 1, Routine: 2, Unclassified: 3 };

export function FieldToday() {
  const { user, ready } = useAuth();
  const { member, ready: accessReady } = usePartnerAccess();
  const [open, setOpen] = useState<RegisterRow[] | null>(null);
  const [due, setDue] = useState<DueFollowup[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!ready || !accessReady) return;
    if (!user || !member) { setOpen([]); return; }
    let live = true;
    setLoadError(false);
    Promise.all([openRegister(), dueFollowups()]).then(([o, d]) => { if (live) { setOpen(o); setDue(d); } }).catch(() => { if (live) { setLoadError(true); setOpen([]); } });
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
  if (loadError) return <p className="ft-state" role="alert">Field work could not be loaded. Please refresh to try again.</p>;

  const overdue = due.filter((f) => Date.parse(f.due_at) < now).length;
  const dueSoon = due.length - overdue;
  const maxPlace = Math.max(1, ...places.map(([, v]) => v.n));
  // Follow-ups more than three months late are almost all from imported
  // registers; they sit in their own fold so this week's work stays on top.
  const BACKLOG = 90 * 86400000;
  const current = due.filter((f) => now - Date.parse(f.due_at) <= BACKLOG).sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at));
  const backlog = due.filter((f) => now - Date.parse(f.due_at) > BACKLOG);
  const item = (f: DueFollowup) => {
    const c = f.case_id ? byId.get(f.case_id) : null;
    const late = Date.parse(f.due_at) < now;
    const href = f.case_id ? `/partner/cases/${f.case_id}` : f.dog_id ? `/partner/animals/${f.dog_id}` : "/partner/records?view=overdue";
    return (
      <li key={f.id} className={late ? "is-late" : ""}>
        <Link href={href}>
          <time className="sys-mono">{day(f.due_at)}</time>
          <span><b>{c ? cond(c) ?? "A case" : f.kind && !/^imported/i.test(f.kind) ? f.kind.replace(/_/g, " ") : "Follow-up from the imported register"}</b><small>{c ? [c.animal_name, c.zone].filter(Boolean).join(" · ") : late ? "Overdue" : "Due"}</small></span>
          <i>{late ? lateBy(now - Date.parse(f.due_at)) : "due"}</i>
        </Link>
      </li>
    );
  };

  const curRows = Math.min(10, current.length) + (backlog.length ? 2 : 0);
  const nobodyRows = Math.max(4, Math.min(10, curRows + 2));
  const whoLeft = curRows + 2 <= Math.min(nobody.length, nobodyRows);
  const whoSec = (
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
  );

  return (
    <div className="ft">
      {(open.length >= 300 || due.length >= 200) && <p className="ft-quiet">This view uses up to 300 loaded open cases and 200 follow-ups. Counts and assignments below describe that loaded slice; search the case register for other records.</p>}
      <p className="ft-line">
        <b>{dueSoon}</b> follow-up{dueSoon === 1 ? "" : "s"} due in the next seven days{overdue ? <>, <em>{overdue} overdue</em></> : null}.{" "}
        <b>{nobody.length}</b> open case{nobody.length === 1 ? "" : "s"} with nobody on {nobody.length === 1 ? "it" : "them"}.
      </p>

      <div className="ft-grid">
        {/* Two columns that keep level: "Nobody on it" lists about as many
            rows as the follow-ups beside it, and "Who has what" sits under
            whichever column is shorter. */}
        <div className="ft-stack">
        <section className="ft-sec">
          <h2>Follow-ups, overdue first <span className="sys-mono">{due.length}</span></h2>
          {due.length ? (
            <>
              {current.length ? <ol className="ft-list">{current.slice(0, 10).map(item)}</ol> : <p className="ft-quiet">Nothing due this week, and nothing late from the last three months.</p>}
              {current.length > 10 && <Link href="/partner/records?view=overdue" className="ft-more">All {current.length} in the register <ArrowUpRight size={14} /></Link>}
              {backlog.length > 0 && (
                <details className="ft-fold">
                  <summary><b>{backlog.length}</b> older follow-up{backlog.length === 1 ? "" : "s"}, more than three months late</summary>
                  <ol className="ft-list">{backlog.slice(0, 8).map(item)}</ol>
                  <Link href="/partner/records?view=overdue" className="ft-more">Review or close them in Records <ArrowUpRight size={14} /></Link>
                </details>
              )}
            </>
          ) : <p className="ft-quiet">Nothing due in the next seven days.</p>}
        </section>
        {whoLeft && whoSec}
        </div>
        <div className="ft-stack">
        <section className="ft-sec">
          <h2>Nobody on it <span className="sys-mono">{nobody.length}</span></h2>
          {nobody.length ? (
            <>
              <ol className="ft-list">
                {nobody.slice(0, nobodyRows).map((r) => (
                  <li key={r.id}>
                    <Link href={`/partner/cases/${r.id}`}>
                      <span className={`ft-mark is-${triage(r).toLowerCase()}`} />
                      <span><b>{cond(r) ?? "Condition not recorded"}</b><small>{[r.zone, r.occurred_at ? `open since ${day(r.occurred_at)} ${new Date(r.occurred_at).getFullYear()}` : null].filter(Boolean).join(" · ")}</small></span>
                      <ArrowUpRight size={14} />
                    </Link>
                  </li>
                ))}
              </ol>
              {nobody.length > nobodyRows && <Link href="/partner/cases?lens=nobody" className="ft-more">All {nobody.length} in the register <ArrowUpRight size={14} /></Link>}
            </>
          ) : <p className="ft-quiet">Every open case has someone on it.</p>}
        </section>
        {!whoLeft && whoSec}
        </div>

        <section className="ft-sec is-wide">
          <h2>Where the open work is</h2>
          {places.length ? (
            <ul className="ft-bars is-places" style={{ ["--rows" as string]: Math.ceil(places.length / 2) }}>
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
