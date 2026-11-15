"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check as Tick, ChevronDown, CornerDownLeft, Sparkles } from "lucide-react";
import { Shell } from "../Shell";
import { VoiceEntry } from "@/kaju/voice/VoiceEntry";
import { Chip, Sample } from "../ui";
import { CONNECTED, DECISIONS, MISSIONS, VOCAB, type Mission, type Step, type Tone } from "../fixtures";
import { approveMission, cancelMission, startFollowups, useLive, useMissions, useVocab, type MissionRow } from "../live";

type Span = { kind: string; start: number; end: number; value: string };
type Vocab = { kind: string; words: string[] }[];

/** Find what the sentence already says, without sending it anywhere. Longest match wins; each kind once. */
function read(text: string, vocab: Vocab): Span[] {
  const out: Span[] = [], low = text.toLowerCase();
  for (const v of vocab) {
    let best: Span | null = null;
    for (const w of v.words) { const i = low.indexOf(w.toLowerCase()); if (i >= 0 && (!best || w.length > best.value.length)) best = { kind: v.kind, start: i, end: i + w.length, value: w }; }
    if (best) out.push(best);
  }
  return out.sort((a, b) => a.start - b.start);
}

type Req = { place?: string; when?: string; team?: string; channel?: string };
type View = {
  sample: boolean; vocab: Vocab; missions: Mission[]; quick: string[]; note?: string | null; eyebrow: string;
  decisions: { title: string; body: string }[];
  plan: (r: Req) => React.ReactNode; canRun: (text: string) => boolean;
  run: (text: string, r: Req) => Promise<string | null> | void; approve: (id: string) => Promise<string | null> | void; cancel?: (id: string) => Promise<string | null> | void;
};

function KajuView(v: View) {
  const [text, setText] = useState("");
  const [fix, setFix] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const calm = useReducedMotion();
  /* Words handed over from the command bar arrive as ?q= and wait in the box; nothing runs until the person presses Run. */
  useEffect(() => { try { const q = new URLSearchParams(window.location.search).get("q"); if (q) { setText(q.slice(0, 2000)); box.current?.focus(); } } catch {} }, []);
  /* The guided demo can hand over a question: it fills the box and waits for the person to send it. */
  useEffect(() => { const on = (e: Event) => { const q = (e as CustomEvent<{ q?: string }>).detail?.q; if (q) { setText(q.slice(0, 2000)); box.current?.focus(); } }; window.addEventListener("sp:kaju-ask", on); return () => window.removeEventListener("sp:kaju-ask", on); }, []);
  const spans = useMemo(() => read(text, v.vocab), [text, v.vocab]);
  const val = (s: Span) => fix[s.kind] ?? s.value;
  const cycle = (s: Span) => { const ws = v.vocab.find((x) => x.kind === s.kind)!.words; setFix((f) => ({ ...f, [s.kind]: ws[(ws.indexOf(val(s)) + 1) % ws.length] })); };
  const isTask = v.canRun(text);
  const get = (k: string) => { const s = spans.find((x) => x.kind === k); return s ? val(s) : undefined; };
  const req: Req = { place: get("Place"), when: get("When"), team: get("Team"), channel: get("Channel")?.replace(/^#/, "") };
  const marked = useMemo(() => { const parts: React.ReactNode[] = []; let at = 0; spans.forEach((s, i) => { if (s.start < at) return; parts.push(text.slice(at, s.start), <u key={i}>{text.slice(s.start, s.end)}</u>); at = s.end; }); parts.push(text.slice(at)); return parts; }, [text, spans]);
  const act = async (key: string, f: () => Promise<string | null> | void) => { setBusy(key); setErr(null); const e = await f(); setBusy(null); if (e) setErr(e); };
  const run = () => { if (!text.trim() || !isTask || busy) return; const t = text; void act("run", async () => { const e = await v.run(t, req); if (!e) { setText(""); setFix({}); } return e ?? null; }); };
  const waiting = v.missions.filter((m) => m.act).length;

  return (
    <Shell ws="kaju" crumb={["Kaju"]}>
      <div className="nx-kj">
        <div className="nx-head">
          <div><p className="nx-eyebrow">{v.eyebrow}{v.sample ? <Sample /> : null}</p><h1 className="nx-h1">What should we get done?</h1><p className="nx-sub">Hand over an outcome, check what it found, and approve before anything is created.</p></div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><VoiceEntry />{waiting ? <Chip tone="warn">{waiting} waiting for you</Chip> : <Chip tone="ok">Nothing waiting</Chip>}</div>
        </div>
        <div className="nx-kj-cols">
          <div>
            <form className="nx-ask" onSubmit={(e) => { e.preventDefault(); run(); }}>
              <div className="nx-ask-in">
                <div aria-hidden>{marked}{"\n"}</div>
                <textarea ref={box} rows={2} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); run(); } }} placeholder={v.quick[0] ? `${v.quick[0]}…` : "Prepare follow-ups…"} aria-label="Ask Kaju" aria-describedby="kj-read" />
              </div>
              <div className="nx-ask-f">
                <Sparkles size={13} />
                <span id="kj-read">{!text.trim() ? "Kaju reads as you type. Nothing is sent until you press Run." : spans.length ? `Understood ${spans.length} ${spans.length === 1 ? "detail" : "details"}. Change any below before you run.` : isTask ? "No places, people or dates recognised yet." : v.sample ? "A question. Answers come from records you can see." : "Here Kaju prepares follow-up tasks. Start with “Prepare follow-ups…”."}</span>
                <button type="submit" className="nx-btn is-sm" disabled={!text.trim() || !isTask || !!busy}>{busy === "run" ? "Running…" : "Run"}<CornerDownLeft size={12} /></button>
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
            {isTask ? <p className="nx-plan"><Sparkles size={13} /><span>{v.plan(req)}</span></p> : null}
            {err ? <p className="nx-foot" role="alert" style={{ color: "var(--bad)" }}>{err}</p> : null}
            {v.note ? <p className="nx-foot" role="status">{v.note}</p> : null}

            <section className="nx-sec" style={{ marginTop: 26 }} aria-labelledby="kj-m">
              <div className="nx-sec-h"><h2 id="kj-m">Missions</h2><span className="nx-count">{v.missions.length}</span></div>
              {!v.missions.length ? <p className="nx-foot" style={{ marginTop: 0 }}>No missions yet. Start one above.</p> : null}
              <AnimatePresence initial={false}>
                {v.missions.map((m) => (
                  <motion.article key={m.id} layout={calm ? false : "position"} className="nx-mission" initial={calm ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 460, damping: 40 }}>
                    <div className="nx-mission-h"><div><b>{m.title}</b><small>{m.meta}</small></div><Chip tone={m.tone}>{m.state}</Chip></div>
                    <ol className="nx-steps">{m.steps.map((s, i) => <li key={i} className={`s-${s.state}`}><span className="nx-st">{s.state === "done" ? <Tick size={10} strokeWidth={3} /> : null}</span><span>{s.text}</span></li>)}</ol>
                    {m.preview?.length ? <details className="nx-preview"><summary>See the {m.preview.length} drafted {m.preview.length === 1 ? "task" : "tasks"}</summary><ul>{m.preview.map((p) => <li key={p}>{p}</li>)}</ul></details> : null}
                    {m.act ? <div className="nx-mission-f"><button type="button" className="nx-btn is-sm" disabled={!!busy} onClick={() => void act(m.id, () => v.approve(m.id))}>{busy === m.id ? "Working…" : m.act}</button>{v.cancel ? <button type="button" className="nx-btn is-quiet is-sm" disabled={!!busy} onClick={() => void act(`x${m.id}`, () => v.cancel!(m.id))}>Cancel</button> : null}<span>Stops here until you approve.</span></div> : null}
                  </motion.article>
                ))}
              </AnimatePresence>
            </section>
          </div>
          <aside>
            <section className="nx-sec" aria-labelledby="kj-d"><div className="nx-sec-h"><h2 id="kj-d">Needs your decision</h2></div>
              {v.decisions.length ? <ul className="nx-feed">{v.decisions.map((d) => <li key={d.title}><span className="nx-feed-i is-kaju"><Sparkles size={12} /></span><div><b>{d.title}</b><p>{d.body}</p></div></li>)}</ul> : <p className="nx-foot" style={{ marginTop: 0 }}>Nothing is waiting for you.</p>}</section>
            <section className="nx-sec" aria-labelledby="kj-c"><div className="nx-sec-h"><h2 id="kj-c">What Kaju can use</h2></div>
              <ul className="nx-conn">{CONNECTED.map(([n, s, t]) => <li key={n}>{n}<Chip tone={t}>{s}</Chip></li>)}</ul></section>
            {v.quick.length ? <section className="nx-sec" aria-labelledby="kj-q"><div className="nx-sec-h"><h2 id="kj-q">Try</h2></div>
              <div className="nx-quick">{v.quick.map((q) => <button key={q} type="button" onClick={() => { setText(q); setFix({}); box.current?.focus(); }}><ArrowUpRight size={13} style={{ flex: "none" }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q}</span></button>)}</div></section> : null}
          </aside>
        </div>
      </div>
    </Shell>
  );
}

/* ── Sample: the same screen, with a timed walk-through instead of the database ── */
const SAMPLE_QUICK = ["Prepare next week's vaccination follow-ups for Ward 12, assign to Field team A, and notify #field-operations", "What needs attention today?", "Explain the coverage figure for Ward 08"];
function SampleKaju() {
  const [missions, setMissions] = useState<Mission[]>(MISSIONS);
  const timers = useRef<number[]>([]);
  const calm = useReducedMotion();
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const setStep = (id: string, i: number, state: Step["state"]) => setMissions((ms) => ms.map((m) => (m.id === id ? { ...m, steps: m.steps.map((s, j) => (j === i ? { ...s, state } : s)) } : m)));
  return <KajuView sample eyebrow="Works inside what you are allowed to see" vocab={VOCAB} missions={missions} quick={SAMPLE_QUICK} decisions={DECISIONS}
    canRun={(t) => /prepare|assign|notify|send|schedule|create/i.test(t)}
    plan={(r) => <>Plan: find follow-ups due {r.when ?? "this week"}{r.place ? ` in ${r.place}` : ""}, draft assignments{r.team ? ` for ${r.team}` : ""}, then <b>stop for your approval</b> before posting{r.channel ? ` to #${r.channel}` : ""}.</>}
    run={(text, r) => {
      const id = `ms${Date.now()}`;
      setMissions((ms) => [{ id, title: text.trim().replace(/\s+/g, " ").slice(0, 80), meta: "Started just now · sample run", state: "Running", tone: "accent", steps: [
        { text: `Find follow-ups due ${r.when ?? "this week"}${r.place ? ` in ${r.place}` : ""}`, state: "run" }, { text: `Draft assignments${r.team ? ` for ${r.team}` : ""}`, state: "todo" }, { text: `Post to ${r.channel ? `#${r.channel}` : "the team"} — needs your approval`, state: "todo" }] }, ...ms]);
      const d = calm ? 0 : 900;
      timers.current.push(window.setTimeout(() => { setStep(id, 0, "done"); setStep(id, 1, "run"); }, d), window.setTimeout(() => { setStep(id, 1, "done"); setStep(id, 2, "wait"); setMissions((ms) => ms.map((m) => (m.id === id ? { ...m, state: "Waiting for your approval", tone: "warn", act: "Approve and post" } : m))); }, d * 2));
    }}
    approve={(id) => setMissions((ms) => ms.map((m) => (m.id === id ? { ...m, state: "Completed", tone: "ok", act: undefined, steps: m.steps.map((s) => ({ ...s, state: "done" })) } : m)))} />;
}

/* ── Live: missions stored in the database, stopped at approval, safe to approve twice ── */
const STATE: Record<string, [string, Tone]> = { waiting_person: ["Waiting for your approval", "warn"], completed: ["Completed", "ok"], cancelled: ["Cancelled", "plain"], running: ["Running", "accent"], failed: ["Failed", "bad"], blocked: ["Blocked", "bad"] };
const STEP: Record<string, Step["state"]> = { done: "done", running: "run", waiting_approval: "wait", todo: "todo", skipped: "todo", failed: "todo" };
const ago = (iso: string) => { const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 6e4)); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }); };
function shape(m: MissionRow): Mission {
  const [label, tone] = STATE[m.state] ?? [m.state, "plain" as Tone];
  const steps = [...(m.nx_mission_steps ?? [])].sort((a, b) => a.position - b.position);
  const drafted = steps.find((s) => s.position === 2)?.result?.tasks ?? [];
  return { id: m.id, title: m.title, meta: `Started ${ago(m.created_at)}`, state: label, tone, act: m.state === "waiting_person" ? `Approve: create ${drafted.length} ${drafted.length === 1 ? "task" : "tasks"}` : undefined, steps: steps.map((s) => ({ text: s.label, state: STEP[s.state] ?? "todo" })), preview: m.state === "waiting_person" ? drafted.map((t) => `${t.title}${t.due ? ` · due ${new Date(t.due).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}`) : undefined };
}
function LiveKaju() {
  const live = useLive();
  const ngo = live.orgFor("ngo");
  const missions = useMissions(ngo?.org_id ?? null);
  const vocab = useVocab(ngo?.org_id ?? null);
  const list = useMemo(() => (missions.rows ?? []).map(shape), [missions.rows]);
  const v = vocab ?? [{ kind: "When", words: ["next week", "tomorrow", "today", "this week"] }];
  const place = v.find((x) => x.kind === "Place")?.words[0], channel = v.find((x) => x.kind === "Channel")?.words[0];
  const quick = [`Prepare follow-ups${place ? ` in ${place}` : ""} due next week${channel ? ` and tell ${channel}` : ""}`, "Prepare follow-ups due this week"];
  if (!ngo) return <Shell ws="kaju" crumb={["Kaju"]}><div className="nx-kj"><h1 className="nx-h1">Kaju</h1><p className="nx-sub">Kaju&apos;s missions work on an NGO&apos;s cases for now. Your account is not part of an NGO, so there is nothing for it to prepare here yet.</p></div></Shell>;
  return <KajuView sample={false} eyebrow={`Works inside ${ngo.name}`} vocab={v} missions={list} quick={quick}
    note={missions.error ? `Missions could not be read: ${missions.error}` : null}
    decisions={list.filter((m) => m.act).map((m) => ({ title: m.title, body: `${m.preview?.length ?? 0} drafted tasks wait for your approval.` }))}
    canRun={(t) => /prepare|follow[- ]?up|create|assign/i.test(t)}
    plan={(r) => <>Plan: find {ngo.name}&apos;s open cases{r.place ? ` in ${r.place}` : ""}{r.when ? ` due ${r.when}` : ""}, draft one follow-up task each{r.team ? ` for ${r.team}` : ""}, then <b>stop for your approval</b> before creating them{r.channel ? ` and telling #${r.channel}` : ""}.</>}
    run={async (_t, r) => { const { error } = await startFollowups(ngo.org_id, r); if (error) return error.message; missions.reload(); return null; }}
    approve={async (id) => { const { error } = await approveMission(id); missions.reload(); return error ? error.message : null; }}
    cancel={async (id) => { const { error } = await cancelMission(id); missions.reload(); return error ? error.message : null; }} />;
}

export function Kaju() {
  const live = useLive();
  if (!live.ready) return <Shell ws="kaju" crumb={["Kaju"]}><div className="nx-kj"><p className="nx-sub">Opening…</p></div></Shell>;
  return live.org ? <LiveKaju /> : <SampleKaju />;
}
