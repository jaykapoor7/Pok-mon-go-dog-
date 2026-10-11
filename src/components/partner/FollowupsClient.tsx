"use client";

/* ════════════════════════════════════════════════════════════════════
   Follow-ups. The rechecks that keep care continuous, in the order they
   need doing: overdue, then today, then the rest of the week. Each row
   says which animal and case it belongs to and who owns the case, and the
   two actions staff take most (done, push two days) are one tap each.
   Updates are applied immediately and rolled back if the server refuses.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Check, Clock } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePartnerAccess } from "@/components/partner/PartnerGate";
import { dueFollowups, openCases, type DueFollowup, type OpenCase } from "@/lib/ops";
import { updateCaseFollowupStatus } from "@/lib/case-actions";
import "./careos-ws.css";

const DAY = 86_400_000;
const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
const isoDate = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const KIND: Record<string, string> = { review: "Recheck", recheck: "Recheck", post_op: "Post-operative check", vaccination: "Vaccine due", dressing: "Dressing change", medication: "Medication check" };

function dueLabel(dueAt: string, today: number) {
  const d = startOfDay(new Date(dueAt));
  const diff = Math.round((d - today) / DAY);
  if (diff < 0) return { text: `${-diff} ${diff === -1 ? "day" : "days"} late`, tone: "late" as const };
  if (diff === 0) return { text: "Today", tone: "today" as const };
  if (diff === 1) return { text: "Tomorrow", tone: "soon" as const };
  return { text: new Date(dueAt).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }), tone: "soon" as const };
}

export function FollowupsClient() {
  const { user, ready } = useAuth();
  const { member, ready: accessReady } = usePartnerAccess();
  const isMember = Boolean(user && member);
  const [rows, setRows] = useState<DueFollowup[] | null>(null);
  const [cases, setCases] = useState<Map<string, OpenCase>>(new Map());
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [said, setSaid] = useState("");
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [f, c] = await Promise.all([dueFollowups(), openCases().catch(() => [] as OpenCase[])]);
      setRows(f);
      setCases(new Map(c.map((x) => [x.id, x])));
    } catch { setError(true); setRows([]); }
  }, []);

  useEffect(() => { if (ready && accessReady && isMember) load(); }, [ready, accessReady, isMember, load]);

  const today = startOfDay();
  const groups = useMemo(() => {
    const g = { late: [] as DueFollowup[], today: [] as DueFollowup[], week: [] as DueFollowup[] };
    for (const f of rows ?? []) {
      const d = startOfDay(new Date(f.due_at));
      if (d < today) g.late.push(f); else if (d === today) g.today.push(f); else g.week.push(f);
    }
    return g;
  }, [rows, today]);

  const act = async (f: DueFollowup, kind: "done" | "later") => {
    if (busy.has(f.id)) return;
    setBusy((b) => new Set(b).add(f.id));
    const before = rows;
    const next = kind === "later" ? isoDate(Math.max(today, startOfDay(new Date(f.due_at))) + 2 * DAY) : null;
    /* Optimistic: done leaves the list; a push moves the row to its new day. */
    setRows((r) => (r ?? []).flatMap((x) => (x.id !== f.id ? [x] : kind === "done" ? [] : [{ ...x, due_at: `${next}T09:00:00` }])).sort((a, b) => a.due_at.localeCompare(b.due_at)));
    try {
      const ok = await updateCaseFollowupStatus(kind === "done" ? { followupId: f.id, status: "done" } : { followupId: f.id, status: "upcoming", dueAt: next });
      if (!ok) throw new Error("refused");
      setSaid(kind === "done" ? "Follow-up marked done." : `Follow-up moved to ${new Date(`${next}T09:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}.`);
    } catch {
      setRows(before);
      setSaid("That change was not saved. Try again.");
    } finally {
      setBusy((b) => { const n = new Set(b); n.delete(f.id); return n; });
    }
  };

  if (!ready || !accessReady) return <div className="ws-state" aria-busy="true">Loading follow-ups…</div>;
  if (!isMember) return <div className="ws-state"><b>Follow-ups belong to an organisation.</b><p>Sign in as a member of your NGO to see and complete its rechecks. <Link href="/join">Sign in with your code</Link></p></div>;
  if (rows === null) return <div className="ws-state" aria-busy="true">Loading follow-ups…</div>;
  if (error) return <div className="ws-state"><b>Follow-ups could not load.</b><p>Nothing was changed. <button type="button" className="ws-linkbtn" onClick={load}>Try again</button></p></div>;

  const total = rows.length;
  const Section = ({ id, title, list, note }: { id: string; title: string; list: DueFollowup[]; note: string }) => (
    <section className="ws-group" aria-labelledby={`fu-${id}`}>
      <header><h2 id={`fu-${id}`}>{title} <span className="ws-count">{list.length}</span></h2><p>{note}</p></header>
      {list.length === 0 ? <p className="ws-none">Nothing here.</p> : (
        <ul className="ws-rows">
          {list.map((f) => {
            const c = f.case_id ? cases.get(f.case_id) : undefined;
            const due = dueLabel(f.due_at, today);
            const title = c?.animal_name || c?.title || "Follow-up";
            return (
              <li key={f.id} className={busy.has(f.id) ? "is-busy" : ""}>
                <span className={`ws-due is-${due.tone}`}>{due.text}</span>
                <span className="ws-what">
                  <b>{KIND[f.kind ?? ""] ?? "Follow-up"} · {title}</b>
                  <small>{[c?.condition_class && c.condition_class !== "Not recorded" ? c.condition_class : null, c?.zone, c?.assignee_name ? `Owner · ${c.assignee_name}` : "No owner yet"].filter(Boolean).join(" · ")}</small>
                </span>
                <span className="ws-acts">
                  <button type="button" className="ws-btn is-primary" onClick={() => act(f, "done")} disabled={busy.has(f.id)}><Check size={15} aria-hidden /> Done</button>
                  <button type="button" className="ws-btn" onClick={() => act(f, "later")} disabled={busy.has(f.id)}><Clock size={15} aria-hidden /> +2 days</button>
                  {f.case_id && <Link className="ws-btn is-quiet" href={`/partner/cases/${f.case_id}`} aria-label={`Open the case for ${title}`}>Case <ArrowUpRight size={14} aria-hidden /></Link>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  return (
    <div className="ws">
      <p className="ws-live" role="status" aria-live="polite">{said}</p>
      {total === 0 ? (
        <div className="ws-state"><b>No follow-ups due this week.</b><p>Rechecks you schedule on a case appear here, overdue ones first. <Link href="/partner/cases">Open cases</Link></p></div>
      ) : (
        <>
          <Section id="late" title="Overdue" list={groups.late} note="Past their date. Do these first, or move them to a day you can." />
          <Section id="today" title="Today" list={groups.today} note="Due today." />
          <Section id="week" title="This week" list={groups.week} note="Coming up in the next seven days." />
        </>
      )}
    </div>
  );
}
