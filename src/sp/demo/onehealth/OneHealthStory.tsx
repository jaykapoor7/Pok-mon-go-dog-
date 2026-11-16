"use client";

/* The One Health product demo. One dog bite is followed through the citizen, the hospital, the veterinary team and
   NGO, the municipality and researchers, with Kaju alongside, one step at a time. It plays by itself (for a grant
   panel or a recording) or is stepped through by hand: arrow keys, the chapter line, or each step's own entry.
   A chapter is linkable (#hospital, #hospital/3), ?play=1 starts it playing. Nothing is read from or written to a
   database: every screen is illustrative and says so. */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BarChart3, Check, ExternalLink, Landmark, Mic, Pause, PawPrint, Play, RotateCcw, Sparkles, Stethoscope } from "lucide-react";
import { Kaju } from "@/kaju/Kaju";
import { AvailTag } from "./parts";
import { SCREENS } from "./screens";
import { CASE, CHAPTERS, TOTAL_MS, type ChapterId } from "./story";
import "./onehealth.css";

const ICON: Record<ChapterId, typeof Mic> = { citizen: Mic, hospital: Stethoscope, "vet-ngo": PawPrint, municipality: Landmark, research: BarChart3, kaju: Sparkles };
const LAST = CHAPTERS.length - 1;
const minutes = Math.round(TOTAL_MS / 30000) / 2;

type At = { c: number; b: number };
const COVER: At = { c: -1, b: 0 };

function parse(hash: string): At {
  const [id, n] = hash.replace(/^#/, "").split("/");
  const c = CHAPTERS.findIndex((x) => x.id === id);
  if (c < 0) return COVER;
  const b = Math.max(0, Math.min(CHAPTERS[c].beats.length - 1, (Number(n) || 1) - 1));
  return { c, b };
}

export function OneHealthStory() {
  const [at, setAt] = useState<At>(COVER);
  const [playing, setPlaying] = useState(false);
  const [calm, setCalm] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const ch = at.c >= 0 ? CHAPTERS[at.c] : null;
  const beat = ch ? ch.beats[at.b] : null;
  const ended = at.c === LAST && at.b === CHAPTERS[LAST].beats.length - 1;

  /* Arrive where the link points; ?play=1 plays from there (from the start if it points nowhere). */
  useEffect(() => {
    const first = parse(window.location.hash);
    const play = new URLSearchParams(window.location.search).get("play") === "1";
    setAt(play && first.c < 0 ? { c: 0, b: 0 } : first);
    if (play) setPlaying(true);
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setCalm(m.matches);
    read(); m.addEventListener("change", read);
    const onHash = () => setAt(parse(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => { m.removeEventListener("change", read); window.removeEventListener("hashchange", onHash); };
  }, []);

  /* Keep the address on the step shown, without adding history for every step. */
  useEffect(() => {
    const h = at.c < 0 ? "" : `#${CHAPTERS[at.c].id}${at.b ? `/${at.b + 1}` : ""}`;
    if (window.location.hash !== h) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${h}`);
  }, [at]);

  const next = useCallback(() => setAt((a) => {
    if (a.c < 0) return { c: 0, b: 0 };
    if (a.b < CHAPTERS[a.c].beats.length - 1) return { c: a.c, b: a.b + 1 };
    if (a.c < LAST) return { c: a.c + 1, b: 0 };
    return a;
  }), []);
  const back = useCallback(() => setAt((a) => {
    if (a.c < 0) return a;
    if (a.b > 0) return { c: a.c, b: a.b - 1 };
    if (a.c > 0) return { c: a.c - 1, b: CHAPTERS[a.c - 1].beats.length - 1 };
    return COVER;
  }), []);
  const go = useCallback((c: number, b = 0) => setAt({ c, b }), []);
  const restart = useCallback(() => { setAt({ c: 0, b: 0 }); setPlaying(true); }, []);

  /* Playing: each step stays for its own time, then the next one comes. The last step stops the play. */
  useEffect(() => {
    if (!playing) return;
    if (at.c < 0) { setAt({ c: 0, b: 0 }); return; }
    if (ended) { const t = window.setTimeout(() => setPlaying(false), CHAPTERS[LAST].beats[at.b].ms); return () => window.clearTimeout(t); }
    const t = window.setTimeout(next, CHAPTERS[at.c].beats[at.b].ms);
    return () => window.clearTimeout(t);
  }, [playing, at, ended, next]);

  /* Keys: arrows move, space plays or pauses (unless a button has focus), Home returns to the cover. */
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
      else if (e.key === " " && !(t && t.closest("button, a"))) { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.key === "Home") { e.preventDefault(); setPlaying(false); setAt(COVER); }
      else if (e.key === "Escape") setPlaying(false);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [next, back]);

  /* Bring what the step is about into view inside the screen, never by scrolling the whole page on a phone. */
  useEffect(() => {
    const root = stage.current;
    if (!root) return;
    const place = () => {
      const on = root.querySelector<HTMLElement>(".ohd-hl.is-on");
      const box = on?.closest<HTMLElement>("[data-scroll]");
      if (!on || !box) return;
      const r = on.getBoundingClientRect(), p = box.getBoundingClientRect();
      if (r.top >= p.top + 8 && r.bottom <= p.bottom - 8) return;
      const top = box.scrollTop + (r.top - p.top) - Math.max(16, (p.height - r.height) / 3);
      box.scrollTo({ top: Math.max(0, top), behavior: calm ? "auto" : "smooth" });
    };
    const ts = [60, 700, 1800, 3400, 4600].map((ms) => window.setTimeout(place, ms));
    return () => ts.forEach(window.clearTimeout);
  }, [at, calm]);

  const key = `${at.c}:${at.b}`;
  const said = ch && beat ? `${ch.label}, step ${at.b + 1} of ${ch.beats.length}. ${beat.say}` : "";
  const Screen = ch ? SCREENS[ch.id] : null;
  const pose = beat?.pose ?? "sitting";
  const nextLabel = useMemo(() => {
    if (!ch) return "Start";
    if (at.b < ch.beats.length - 1) return "Next step";
    if (at.c < LAST) return `Next: ${CHAPTERS[at.c + 1].label}`;
    return null;
  }, [ch, at]);

  return (
    <div className={`ohd${calm ? " is-calm" : ""}`} data-chapter={ch?.id ?? "cover"}>
      <header className="ohd-top">
        <Link className="ohd-brand" href="/"><img src="/straypaw-symbol.svg" alt="" width={24} height={24} /><b>StrayPaw</b></Link>
        <span className="ohd-top-t">One Health product demo</span>
        <span className="ohd-illus">Illustrative data</span>
        <span className="ohd-top-act">
          <button type="button" className="ohd-tbtn is-main" onClick={() => setPlaying((p) => !p)}>
            {playing ? <><Pause size={16} aria-hidden />Pause</> : <><Play size={16} aria-hidden />{at.c < 0 ? `Play · ${minutes} min` : ended ? "Play again" : "Play"}</>}
          </button>
          {at.c >= 0 ? <button type="button" className="ohd-tbtn" onClick={restart} aria-label="Play from the beginning"><RotateCcw size={16} aria-hidden /></button> : null}
        </span>
      </header>

      <nav className="ohd-steps" aria-label="Chapters">
        <ol>
          {CHAPTERS.map((c, i) => {
            const I = ICON[c.id];
            const state = at.c > i ? "is-done" : at.c === i ? "is-on" : "";
            return (
              <li key={c.id} className={state}>
                <button type="button" onClick={() => go(i)} aria-current={at.c === i ? "step" : undefined} aria-label={`${c.label}, ${c.when}`}>
                  <span className="ohd-step-n" aria-hidden>{at.c > i ? <Check size={14} /> : <I size={14} />}</span>
                  <span className="ohd-step-t"><b>{c.label}</b><small>{c.when}</small></span>
                </button>
              </li>
            );
          })}
        </ol>
        {playing && beat && !calm ? <span key={key} className="ohd-prog" style={{ animationDuration: `${beat.ms}ms` }} aria-hidden /> : null}
      </nav>

      {!ch || !beat || !Screen ? (
        <main className="ohd-cover" id="main">
          <div className="ohd-cover-in">
            <p className="ohd-k">{CASE.programme}</p>
            <h1>One dog bite, one shared record.</h1>
            <p className="ohd-lede">A resident of Jayanagar is bitten at a bus stop. Follow her report from a Kannada call to the hospital, the veterinary team and NGO, the municipality and researchers, with Kaju coordinating at every step.</p>
            <p className="ohd-cover-go">
              <button type="button" className="ohd-go" onClick={() => { setAt({ c: 0, b: 0 }); setPlaying(true); }}><Play size={18} aria-hidden />Play the demo · {minutes} minutes</button>
              <button type="button" className="ohd-go is-line" onClick={() => go(0)}>Step through it<ArrowRight size={18} aria-hidden /></button>
            </p>
            <ol className="ohd-roles">
              {CHAPTERS.map((c, i) => { const I = ICON[c.id]; return (
                <li key={c.id}><button type="button" onClick={() => go(i)}><span className="ohd-role-ic" aria-hidden><I size={18} /></span><b>{c.label}</b><small>{c.title}</small></button></li>
              ); })}
            </ol>
            <div className="ohd-legend-c">
              <p><AvailTag s="today" /><span>Works in StrayPaw now, shown on illustrative records.</span></p>
              <p><AvailTag s="proposed" /><span>Proposed in this application. Drawn with a dashed edge wherever it appears.</span></p>
            </div>
            <p className="ohd-fine">Every person, place, number and date is invented. Institutions are named by their role. Use the arrow keys to move, space to play or pause.</p>
          </div>
          <div className="ohd-cover-kaju" aria-hidden><Kaju state="greeting" size={200} /></div>
        </main>
      ) : (
        <main className="ohd-main" id="main">
          <section className="ohd-tell" aria-labelledby="ohd-title">
            <p className="ohd-k">{at.c + 1} of {CHAPTERS.length} · {ch.label}{ch.proposed ? <AvailTag s="proposed" small /> : null}</p>
            <h1 id="ohd-title">{ch.title}</h1>
            <p className="ohd-where"><b>{ch.where}</b><span>{ch.who} · {ch.when}</span></p>
            <ol className="ohd-beats">
              {ch.beats.map((x, i) => (
                <li key={i} className={i < at.b ? "is-done" : i === at.b ? "is-on" : ""}>
                  <button type="button" onClick={() => go(at.c, i)} aria-current={i === at.b ? "step" : undefined}><span className="ohd-dot" aria-hidden>{i < at.b ? <Check size={12} /> : i + 1}</span><span>{x.say}</span></button>
                </li>
              ))}
            </ol>
          </section>

          <div className="ohd-stage" ref={stage}>
            <div key={ch.id} className="ohd-screen">{Screen({ b: at.b, k: key })}</div>
          </div>

          <aside className="ohd-kaju" aria-label="Kaju in this chapter" tabIndex={0}>
            <div className="ohd-kj">
              <span className="ohd-kj-pup" aria-hidden><Kaju state={pose} size={80} /></span>
              <div>
                <h2>Kaju in this step</h2>
                <ul>{ch.kaju.map((x) => <li key={x.t}><span>{x.t}</span><AvailTag s={x.s} small /></li>)}</ul>
              </div>
            </div>
            <p className="ohd-guard">{ch.guard}</p>
            {ch.next ? <p className="ohd-next"><ArrowRight size={14} aria-hidden /><span>{ch.next}</span></p> : null}
            {ch.real ? <a className="ohd-real" href={ch.real.href} target="_blank" rel="noopener">{ch.real.label} in StrayPaw, with sample data<ExternalLink size={13} aria-hidden /></a> : null}
          </aside>

          <div className="ohd-ctl">
            <button type="button" className="ohd-cbtn" onClick={back} aria-label="Previous step"><ArrowLeft size={18} aria-hidden /></button>
            <span className="ohd-ctl-n">{at.b + 1} / {ch.beats.length}</span>
            {nextLabel ? <button type="button" className="ohd-cbtn is-go" onClick={next}>{nextLabel}<ArrowRight size={18} aria-hidden /></button> : <button type="button" className="ohd-cbtn is-go" onClick={restart}><RotateCcw size={16} aria-hidden />Play again</button>}
          </div>
        </main>
      )}
      <p className="ohd-sr" aria-live="polite">{said}</p>
    </div>
  );
}
