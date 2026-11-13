"use client";

/* Kaju speaks first. Before anything is asked, he shows what he has
   noticed in the organisation's own checks and what he can take off the
   person's hands: look at it now, or have him watch it and tell the team.
   Every figure is a recorded count from the last check; nothing is
   offered that the checks did not find, and nothing starts until the
   person presses it and then confirms. */

import { useEffect, useState } from "react";
import { ArrowRight, BellRing, FileText } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { useMembership } from "@/sp/shell/Shell";
import { useAi } from "@/sp3/ai/AiPanel";
import "./offers.css";

type Finding = { rule: string; count: number };
const SAY: Record<string, { one: string; many: string; show: string; watch: string }> = {
  overdue_followup: { one: "follow-up is overdue", many: "follow-ups are overdue", show: "What follow-ups are overdue?", watch: "remind us about overdue follow-ups" },
  missing_evidence: { one: "record is missing evidence", many: "records are missing evidence", show: "Which records are missing evidence?", watch: "remind us about missing evidence" },
  awaiting_vet: { one: "procedure is waiting for the vet", many: "procedures are waiting for the vet", show: "What is waiting for the vet's sign-off?", watch: "remind us about procedures waiting for sign-off" },
  open_clarification: { one: "question from the office is unanswered", many: "questions from the office are unanswered", show: "What has the reviewing office asked?", watch: "remind us about questions from the reviewing office" },
};

export function KajuOffers({ compact = false }: { /** One line under a Kaju bar: the single biggest thing he noticed. */ compact?: boolean }) {
  const ai = useAi();
  const mem = useMembership();
  const [found, setFound] = useState<Finding[] | null>(null);
  const org = mem.org?.id ?? null;
  useEffect(() => {
    if (!org) { setFound([]); return; }
    let live = true;
    void (async () => {
      const r = await getSupabase()?.from("kaju_check_runs").select("findings").eq("ngo_id", org).order("checked_at", { ascending: false }).limit(1).maybeSingle();
      const f = Array.isArray(r?.data?.findings) ? (r!.data!.findings as { rule?: string; count?: number }[]) : [];
      if (live) setFound(f.filter((x): x is Finding => typeof x.rule === "string" && typeof x.count === "number" && x.count > 0 && x.rule in SAY).sort((a, b) => b.count - a.count).slice(0, 3));
    })();
    return () => { live = false; };
  }, [org]);
  const lead = mem.role === "admin" || mem.role === "coordinator";
  if (!org || found === null) return null;
  if (compact) { const f = found[0]; if (!f) return null; const x = SAY[f.rule]; return (
    <p className="ko-line" role="status"><span><b>Kaju noticed:</b> {f.count} {f.count === 1 ? x.one : x.many}.</span>
      <button type="button" className="ko-go" disabled={ai.busy || !ai.scope} onClick={() => { ai.setOpen(true); ai.ask(x.show); }}>Show me</button>
      {lead ? <button type="button" className="ko-watch" disabled={ai.busy || !ai.scope} onClick={() => { ai.setOpen(true); ai.ask(x.watch); }}><BellRing size={16} aria-hidden />Watch this for us</button> : null}
    </p>); }
  return (
    <section className="ko" aria-label="What Kaju noticed">
      {found.map((f) => { const s = SAY[f.rule]; return (
        <article key={f.rule} className="ko-card">
          <p><b>{f.count}</b>{f.count === 1 ? s.one : s.many}</p>
          <div>
            <button type="button" className="ko-go" disabled={ai.busy || !ai.scope} onClick={() => ai.ask(s.show)}>Show me<ArrowRight size={16} aria-hidden /></button>
            {lead ? <button type="button" className="ko-watch" disabled={ai.busy || !ai.scope} onClick={() => ai.ask(s.watch)}><BellRing size={16} aria-hidden />Watch this for us</button> : null}
          </div>
        </article>); })}
      {lead ? <article className="ko-card is-quiet">
        <p><FileText size={20} aria-hidden />This month&apos;s report</p>
        <div><button type="button" className="ko-go" disabled={ai.busy || !ai.scope} onClick={() => ai.ask("Draft this month's claim")}>Prepare it<ArrowRight size={16} aria-hidden /></button></div>
      </article> : null}
    </section>
  );
}
