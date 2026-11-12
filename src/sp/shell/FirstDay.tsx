"use client";

/* ════════════════════════════════════════════════════════════════════
   The first day. A short, self-sufficient introduction to the workspace,
   shown once to a person the first time they open their place's home, and
   again whenever they ask for it from the status line.

   It teaches by pointing at the real thing: the place, the menu, the one
   thing to do first, the line of work, Kaju and the status line are lit in
   turn while the rest of the screen dims, and the light glides from one to
   the next. A step whose control is not on this screen (a phone has no
   sidebar) is skipped. It ends on real first actions for the person's role,
   not on a slogan. Nothing here writes to a record; where the person got to
   is remembered on this device only.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { KajuFace } from "@/kaju/Kaju";
import "./firstday.css";

export const FIRSTDAY_EVENT = "sp:firstday";
const KEY = (uid: string) => `sp.firstday.v1:${uid}`;
type Rect = { x: number; y: number; w: number; h: number };
type Step = { sel: string; title: string; body: string };
export type FirstAction = { href: string; label: string; note: string };

const STEPS: Step[] = [
  { sel: ".cn-place", title: "This is your place", body: "Everything on this screen belongs to it. If you work in more than one place, this is where you change." },
  { sel: ".sx3-side .sx3-nav", title: "The menu is short on purpose", body: "Today, then the work, then your part in the programme. The current page sits on the white pill." },
  { sel: ".hm-first, .hm-head, .oh-head", title: "One thing first", body: "Home names the one thing to do next and gives it one button. Start there each time you open StrayPaw." },
  { sel: ".hm-line", title: "The line of work", body: "Every record moves left to right through these stages. A stage opens the board at that stage; a record shows where it is on the same line." },
  { sel: ".cn-kaju", title: "Kaju", body: "Ask in plain words. Kaju finds records, checks them and prepares work. A person always confirms before anything is saved." },
  { sel: ".cn-foot", title: "The status line", body: "Whether your records are reaching the register, where you are, and the two keys worth knowing: search and Kaju." },
];

const visible = (el: Element | null): el is HTMLElement => !!el && el instanceof HTMLElement && el.offsetParent !== null && el.getBoundingClientRect().width > 0;
/* A step may name several controls, best first; the light takes the first that is on the screen, and moves to a better one when it arrives. */
const find = (sel: string) => { for (const part of sel.split(",")) { const el = [...document.querySelectorAll(part.trim())].find(visible); if (el) return el; } return null; };

export function FirstDay({ userId, name, place, home, path, actions, quiet }: { userId: string; name: string; place: string; /** The home of this workspace: the guide opens by itself only there. */ home: string; path: string; actions: FirstAction[]; /** A sample session has its own guide; this one then opens only when asked for. */ quiet: boolean }) {
  const [open, setOpen] = useState(false);
  /* Offered, never forced: on the first visit a small card asks; the tour starts only when the person chooses it. */
  const [offer, setOffer] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const card = useRef<HTMLDivElement>(null);
  /* `i` counts through every step; a step whose control is not on the screen right now is passed over at the
     moment the guide moves, so a page that is still loading does not lose its step. After the last comes the closing card. */
  const [have, setHave] = useState<boolean[]>([]);
  const last = i >= STEPS.length;
  const step = last ? null : STEPS[i];
  const from = (k: number, dir: 1 | -1) => { let n = k; while (n >= 0 && n < STEPS.length && !find(STEPS[n].sel)) n += dir; return n; };
  const next = () => setI((v) => from(v + 1, 1));
  const back = () => setI((v) => { const n = from(v - 1, -1); return n < 0 ? v : n; });
  const shown = STEPS.filter((_, k) => have[k] || k === i);
  const at = shown.indexOf(STEPS[i]);

  const start = useCallback(() => { setOffer(false); let n = 0; while (n < STEPS.length && !find(STEPS[n].sel)) n++; setI(n); setOpen(true); }, []);
  const close = useCallback(() => { setOpen(false); try { localStorage.setItem(KEY(userId), "done"); } catch { /* fine */ } }, [userId]);

  /* Offered once, on the place's home; any time from the status line. */
  useEffect(() => {
    const ask = () => start();
    window.addEventListener(FIRSTDAY_EVENT, ask);
    return () => window.removeEventListener(FIRSTDAY_EVENT, ask);
  }, [start]);
  useEffect(() => {
    if (quiet || path !== home) return;
    let seen = true;
    try { seen = localStorage.getItem(KEY(userId)) === "done"; } catch { /* storage blocked: do not interrupt */ }
    if (seen) return;
    const t = window.setTimeout(() => setOffer(true), 900);
    return () => window.clearTimeout(t);
  }, [quiet, path, home, userId]);
  const later = () => { setOffer(false); try { localStorage.setItem(KEY(userId), "done"); } catch { /* fine */ } };

  /* The light follows the control as the page settles, scrolls or resizes. */
  useLayoutEffect(() => {
    if (!open || !step) { setRect(null); return; }
    const place = () => { const el = find(step.sel); if (!el) { setRect(null); return; } const r = el.getBoundingClientRect(); setRect({ x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12 }); };
    const el = find(step.sel);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    place();
    const t = window.setInterval(place, 250);
    window.addEventListener("resize", place); window.addEventListener("scroll", place, true);
    return () => { window.clearInterval(t); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    setHave(STEPS.map((x) => !!find(x.sel)));
    card.current?.querySelector<HTMLElement>("[data-primary]")?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowRight" && !last) next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- next and back only read the page as it is now
  }, [open, i, last, close]);

  if (!open) return offer ? (
    <aside className="fd1-offer" aria-label="Introduction">
      <span className="fd1-offer-k" aria-hidden><KajuFace size={34} /></span>
      <div><b>Welcome to {place}.</b><small>A one-minute tour of the controls you will use every day.</small></div>
      <div className="fd1-offer-acts"><button type="button" className="fd1-next" onClick={start}>Take the tour</button><button type="button" className="fd1-back" onClick={later}>Not now</button></div>
    </aside>
  ) : null;

  /* The card sits beside what it is describing: to the right if there is room, else below, else above. */
  const W = 340, vw = typeof window === "undefined" ? 1280 : window.innerWidth, vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const pos = !rect || last ? null
    : rect.x + rect.w + 16 + W <= vw ? { left: rect.x + rect.w + 16, top: Math.max(16, Math.min(rect.y, vh - 260)) }
    : rect.y + rect.h + 16 + 220 <= vh ? { left: Math.max(16, Math.min(rect.x, vw - W - 16)), top: rect.y + rect.h + 16 }
    : { left: Math.max(16, Math.min(rect.x, vw - W - 16)), top: Math.max(16, rect.y - 236) };
  const first = name.trim().split(/\s+/)[0] || "there";

  return (
    <div className="fd1" role="dialog" aria-modal="true" aria-labelledby="fd1-t">
      <div className="fd1-catch" aria-hidden />
      <span className={`fd1-light${rect && !last ? "" : " is-off"}`} aria-hidden style={rect && !last ? { left: rect.x, top: rect.y, width: rect.w, height: rect.h } : undefined} />
      <div ref={card} className={`fd1-card${last ? " is-last" : ""}`} style={pos ?? undefined} key={last ? "last" : "step"}>
        <button type="button" className="fd1-x" onClick={close} aria-label="Close the introduction"><X size={15} aria-hidden /></button>
        {last ? (
          <>
            <span className="fd1-kaju" aria-hidden><KajuFace size={40} /></span>
            <h2 id="fd1-t">That is the whole of it, {first}.</h2>
            <p>Home says what is first, the line shows where everything is, and each record gives one next step. Start with one of these in {place}:</p>
            <ul className="fd1-acts">{actions.map((a, k) => (
              <li key={a.href}><Link href={a.href} onClick={close} data-primary={k === 0 ? "" : undefined}><span><b>{a.label}</b><small>{a.note}</small></span><ArrowRight size={15} aria-hidden /></Link></li>
            ))}</ul>
            <p className="fd1-again">You can open this again from <b>Guide</b> in the status line.</p>
          </>
        ) : step ? (
          <>
            <p className="fd1-k">{at + 1} of {shown.length}</p>
            <h2 id="fd1-t">{step.title}</h2>
            <p>{step.body}</p>
          </>
        ) : null}
        <div className="fd1-foot">
          <span className="fd1-dots" aria-hidden>{[...shown, null].map((_, k) => <i key={k} className={(last ? k === shown.length : k === at) ? "is-on" : last || k < at ? "is-done" : undefined} />)}</span>
          {last || at > 0 ? <button type="button" className="fd1-back" onClick={back}><ArrowLeft size={14} aria-hidden /> Back</button> : <button type="button" className="fd1-back" onClick={close}>Skip</button>}
          {last ? <button type="button" className="fd1-next" onClick={close}>Done</button>
            : <button type="button" className="fd1-next" data-primary="" onClick={next}>{from(i + 1, 1) >= STEPS.length ? "Finish" : "Next"} <ArrowRight size={14} aria-hidden /></button>}
        </div>
      </div>
    </div>
  );
}
