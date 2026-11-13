"use client";

/* The parts every role's home is built from, drawn as the landing demo
   draws its daily brief: the greeting, one line on what changed, what needs
   you today (coloured rows with tags; the verb slides in on hover), and a
   line to ask Kaju. Pages bring their own rows and words. */
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUp, Check, Sparkles } from "lucide-react";
import { useAi } from "@/sp3/ai/AiPanel";
import { Feedforward } from "@/kaju/Feedforward";
import "./daily.css";

export const greeting = () => { const h = Number(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false })); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
/** First name, skipping a title ("Dr Meena" becomes "Meena"). */
export const firstName = (n?: string | null) => (n ?? "").trim().split(/\s+/).find((w) => !/^(dr|sister|mr|mrs|ms|prof)\.?$/i.test(w)) ?? "";

export function DailyHead({ name, since, loading, place }: { name?: string | null; since?: ReactNode; loading?: boolean; place?: string | null }) {
  const first = firstName(name);
  return (
    <header className="dy-head hm-head">
      {place ? <p className="dy-place">{place}</p> : null}
      <h1 className="br-hello dy-hello">{greeting()}{first ? `, ${first}` : ""}.<span>Here is your daily brief.</span></h1>
      {loading ? <div className="dy-skel" aria-hidden><i /><i /></div> : since ? <p className="dy-since">{since}</p> : null}
    </header>
  );
}

export type DailyRow = { key: string; href: string; tone: string; icon?: ReactNode; title: ReactNode; meta?: ReactNode; tag?: string; verb?: string };
const TAG: Record<string, string> = { violet: "Review", flame: "Urgent", amber: "Due", green: "Ready", slate: "Check", blue: "Open", teal: "Open", ink: "Kaju" };

export function NeedsYou({ rows, title = "Needs you today", clear = "You are all caught up. Nothing needs you today.", more }: { rows: DailyRow[]; title?: string; clear?: string; more?: ReactNode }) {
  return (
    <section className="dy-sec hm-first" aria-labelledby="dy-now-h">
      <h2 id="dy-now-h" className="dy-h">{rows.length ? title : "Today"}</h2>
      {rows.length ? (
        <ul className="dy-list">{rows.map((r, i) => (
          <li key={r.key} style={{ ["--j" as string]: i }}><Link href={r.href}>
            <span className="dy-sq" data-c={r.tone} aria-hidden>{r.icon}</span>
            <span className="dy-t"><span>{r.title}</span>{r.meta ? <small>{r.meta}</small> : null}</span>
            <em className="dy-tag" data-c={r.tone}>{r.tag ?? TAG[r.tone] ?? "Open"}</em>
            <span className="dy-go">{r.verb ?? "Open"}<ArrowRight size={13} aria-hidden /></span>
          </Link></li>
        ))}</ul>
      ) : <p className="dy-clear"><span className="dy-check" aria-hidden><Check size={11} strokeWidth={3} /></span>{clear}</p>}
      {more}
    </section>
  );
}

/* Ask Kaju, as on the landing page: a line that types real questions while it waits, and sends yours to Kaju. */
const QUESTIONS_NGO = ["Which releases this month are missing a photo?", "Draft this month's report package", "What are programme partners waiting for?", "Which cases have had no update for a week?"];
export function AskKaju({ questions = QUESTIONS_NGO }: { questions?: string[] }) {
  const ai = useAi();
  const [q, setQ] = useState("");
  const [hint, setHint] = useState(questions[0]);
  const [focus, setFocus] = useState(false);
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focus || q || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let k = 0, n = 0, dir = 1, wait = 0;
    const id = window.setInterval(() => {
      if (wait > 0) { wait--; return; }
      const full = questions[k];
      n += dir; setHint(full.slice(0, Math.max(0, n)));
      if (dir > 0 && n >= full.length) { dir = -1; wait = 60; }
      else if (dir < 0 && n <= 0) { dir = 1; k = (k + 1) % questions.length; wait = 8; }
    }, 38);
    return () => window.clearInterval(id);
  }, [focus, q, questions]);
  const send = (text: string) => { const t = text.trim(); if (!t) return; ai.ask(t); setQ(""); };
  return (
    <div className="dy-ff">
    <Feedforward text={q} onText={setQ} input={box} />
    <form className={`dy-ask${q || focus ? " is-typing" : ""}`} onSubmit={(e) => { e.preventDefault(); send(q || (focus ? "" : hint)); }} role="search" aria-label="Ask Kaju">
      <Sparkles size={15} aria-hidden />
      <input ref={box} value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} placeholder={focus ? "Ask Kaju anything about your programme…" : hint || "Ask Kaju anything about your programme…"} aria-label="Ask Kaju anything about your programme" />
      <button type="submit" className={`dy-send${q ? " is-ready" : ""}`} aria-label="Send to Kaju" disabled={!q.trim()}><ArrowUp size={14} aria-hidden /></button>
    </form>
    </div>
  );
}
