"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check as Tick, ChevronDown, CornerDownLeft, Sparkles } from "lucide-react";
import { Shell } from "../Shell";
import { Chip, Sample } from "../ui";
import { CONNECTED, DECISIONS, MISSIONS, VOCAB, type Mission, type Step } from "../fixtures";

type Span = { kind: string; start: number; end: number; value: string };

/** Find what the sentence already says, without sending it anywhere. Longest match wins; each kind once. */
function read(text: string): Span[] {
  const out: Span[] = [], low = text.toLowerCase();
  for (const v of VOCAB) {
    let best: Span | null = null;
    for (const w of v.words) { const i = low.indexOf(w.toLowerCase()); if (i >= 0 && (!best || w.length > best.value.length)) best = { kind: v.kind, start: i, end: i + w.length, value: w }; }
    if (best) out.push(best);
  }
  return out.sort((a, b) => a.start - b.start);
}
const QUICK = ["Prepare next week's vaccination follow-ups for Ward 12, assign to Field team A, and notify #field-operations", "What needs attention today?", "Explain the coverage figure for Ward 08"];

export function Kaju() {
  const [text, setText] = useState("");
  const [fix, setFix] = useState<Record<string, string>>({});
  const [missions, setMissions] = useState<Mission[]>(MISSIONS);
  const box = useRef<HTMLTextAreaElement>(null);
  const timers = useRef<number[]>([]);
  const calm = useReducedMotion();
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  /* Words handed over from the command bar arrive as ?q= and wait in the box; nothing runs until the person presses Run. */
  useEffect(() => { try { const q = new URLSearchParams(window.location.search).get("q"); if (q) { setText(q.slice(0, 2000)); box.current?.focus(); } } catch {} }, []);
  const spans = useMemo(() => read(text), [text]);
  const val = (s: Span) => fix[s.kind] ?? s.value;
  const cycle = (s: Span) => { const ws = VOCAB.find((v) => v.kind === s.kind)!.words; setFix((f) => ({ ...f, [s.kind]: ws[(ws.indexOf(val(s)) + 1) % ws.length] })); };
  const isTask = /prepare|assign|notify|send|schedule|create/i.test(text);
  const place = spans.find((s) => s.kind === "Place"), team = spans.find((s) => s.kind === "Team"), ch = spans.find((s) => s.kind === "Channel"), when = spans.find((s) => s.kind === "When");

  /* The overlay repeats the text with the recognised spans underlined; the textarea on top holds the real text. */
  const marked = useMemo(() => { const parts: React.ReactNode[] = []; let at = 0; spans.forEach((s, i) => { if (s.start < at) return; parts.push(text.slice(at, s.start), <u key={i}>{text.slice(s.start, s.end)}</u>); at = s.end; }); parts.push(text.slice(at)); return parts; }, [text, spans]);

  const setStep = (id: string, i: number, state: Step["state"]) => setMissions((ms) => ms.map((m) => (m.id === id ? { ...m, steps: m.steps.map((s, j) => (j === i ? { ...s, state } : s)) } : m)));
  const run = () => {
    if (!text.trim() || !isTask) return;
    const id = `ms${Date.now()}`;
    const steps: Step[] = [
      { text: `Find follow-ups due ${when ? val(when) : "this week"}${place ? ` in ${val(place)}` : ""}`, state: "run" },
      { text: `Draft assignments${team ? ` for ${val(team)}` : ""}`, state: "todo" },
      { text: `Post to ${ch ? val(ch) : "the team"} — needs your approval`, state: "todo" },
    ];
    setMissions((ms) => [{ id, title: text.trim().replace(/\s+/g, " ").slice(0, 80), meta: "Started just now · sample run", state: "Running", tone: "accent", steps }, ...ms]);
    setText(""); setFix({});
    const d = calm ? 0 : 900;
    timers.current.push(window.setTimeout(() => { setStep(id, 0, "done"); setStep(id, 1, "run"); }, d), window.setTimeout(() => { setStep(id, 1, "done"); setStep(id, 2, "wait"); setMissions((ms) => ms.map((m) => (m.id === id ? { ...m, state: "Waiting for your approval", tone: "warn", act: "Approve and post" } : m))); }, d * 2));
  };
  const approve = (id: string) => setMissions((ms) => ms.map((m) => (m.id === id ? { ...m, state: "Completed", tone: "ok", act: undefined, steps: m.steps.map((s) => ({ ...s, state: "done" })) } : m)));
  const waiting = missions.filter((m) => m.act).length;

  return (
    <Shell ws="kaju" crumb={["Kaju"]}>
      <div className="nx-kj">
        <div className="nx-head">
          <div><p className="nx-eyebrow">Works inside what you are allowed to see<Sample /></p><h1 className="nx-h1">What should we get done?</h1><p className="nx-sub">Ask a question, hand over an outcome, or check on work that is running.</p></div>
          {waiting ? <Chip tone="warn">{waiting} waiting for you</Chip> : <Chip tone="ok">Nothing waiting</Chip>}
        </div>

        <div className="nx-kj-cols">
          <div>
            <form className="nx-ask" onSubmit={(e) => { e.preventDefault(); run(); }}>
              <div className="nx-ask-in">
                <div aria-hidden>{marked}{"\n"}</div>
                <textarea ref={box} rows={2} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); run(); } }} placeholder="Prepare next week's follow-ups for Ward 12 and tell the field team…" aria-label="Ask Kaju" aria-describedby="kj-read" />
              </div>
              <div className="nx-ask-f">
                <Sparkles size={13} />
                <span id="kj-read">{!text.trim() ? "Kaju reads as you type. Nothing is sent until you press Run." : spans.length ? `Understood ${spans.length} ${spans.length === 1 ? "detail" : "details"}. Change any below before you run.` : isTask ? "No places, people or dates recognised yet." : "A question. Answers come from records you can see."}</span>
                <button type="submit" className="nx-btn is-sm" disabled={!text.trim() || !isTask}>{isTask ? "Run" : "Ask"}<CornerDownLeft size={12} /></button>
              </div>
            </form>

            <div className="nx-spans" aria-live="polite">
              <AnimatePresence initial={false}>
                {spans.map((s) => (
                  <motion.button key={s.kind} type="button" className="nx-span" onClick={() => cycle(s)} aria-label={`${s.kind}: ${val(s)}. Change`} initial={calm ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .14 }}>
                    <small>{s.kind}</small>{val(s)}<ChevronDown size={12} />
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
            {isTask && spans.length ? <p className="nx-plan"><Sparkles size={13} /><span>Plan: find follow-ups due {when ? val(when) : "this week"}{place ? ` in ${val(place)}` : ""}, draft assignments{team ? ` for ${val(team)}` : ""}, then <b>stop for your approval</b> before posting{ch ? ` to ${val(ch)}` : ""}.</span></p> : null}

            <section className="nx-sec" style={{ marginTop: 26 }} aria-labelledby="kj-m">
              <div className="nx-sec-h"><h2 id="kj-m">Missions</h2><span className="nx-count">{missions.length}</span></div>
              <AnimatePresence initial={false}>
                {missions.map((m) => (
                  <motion.article key={m.id} layout={calm ? false : "position"} className="nx-mission" initial={calm ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 460, damping: 40 }}>
                    <div className="nx-mission-h"><div><b>{m.title}</b><small>{m.meta}</small></div><Chip tone={m.tone}>{m.state}</Chip></div>
                    <ol className="nx-steps">{m.steps.map((s, i) => <li key={i} className={`s-${s.state}`}><span className="nx-st">{s.state === "done" ? <Tick size={10} strokeWidth={3} /> : null}</span><span>{s.text}</span></li>)}</ol>
                    {m.act ? <div className="nx-mission-f"><button type="button" className="nx-btn is-sm" onClick={() => approve(m.id)}>{m.act}</button><span>Stops here until a person approves.</span></div> : null}
                  </motion.article>
                ))}
              </AnimatePresence>
            </section>
          </div>

          <aside>
            <section className="nx-sec" aria-labelledby="kj-d"><div className="nx-sec-h"><h2 id="kj-d">Needs your decision</h2></div>
              <ul className="nx-feed">{DECISIONS.map((d) => <li key={d.title}><span className="nx-feed-i is-kaju"><Sparkles size={12} /></span><div><b>{d.title}</b><p>{d.body}</p></div></li>)}</ul></section>
            <section className="nx-sec" aria-labelledby="kj-c"><div className="nx-sec-h"><h2 id="kj-c">What Kaju can use</h2></div>
              <ul className="nx-conn">{CONNECTED.map(([n, s, t]) => <li key={n}>{n}<Chip tone={t}>{s}</Chip></li>)}</ul></section>
            <section className="nx-sec" aria-labelledby="kj-q"><div className="nx-sec-h"><h2 id="kj-q">Try</h2></div>
              <div className="nx-quick">{QUICK.map((q) => <button key={q} type="button" onClick={() => { setText(q); setFix({}); box.current?.focus(); }}><ArrowUpRight size={13} style={{ flex: "none" }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q}</span></button>)}</div></section>
          </aside>
        </div>
      </div>
    </Shell>
  );
}
