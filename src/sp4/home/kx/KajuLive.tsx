"use client";

/* Kaju itself, on the homepage. This is the product's own frame and conversation: the app's stylesheet (.nx), its
   composer, thread, answer blocks and proposal cards, and Kaju's own rig. What differs from a signed-in workspace is
   where answers come from (the public sample endpoint) and that the menu around the conversation is a picture of the
   workspace, not a way into it: a visitor has no workspace to open, so those rows are not links.

   This file is loaded only when a visitor heads for the product window (see Passage.tsx), so the public homepage does
   not carry the application's code or styles up front. */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { ArrowDown, ArrowRight, BarChart3, CalendarClock, ChevronsUpDown, ClipboardCheck, Hand, History, LayoutGrid, ListChecks, MessageSquare, Plus, Search, ShieldCheck, SlidersHorizontal, Sparkles, X, Zap } from "lucide-react";
import { Kaju as Puppy } from "@/kaju/Kaju";
import type { KajuState } from "@/kaju/poses";
import { Composer } from "@/nx/kaju/Composer";
import { Thread } from "@/nx/kaju/Thread";
import { Blocks } from "@/nx/kaju/Blocks";
import { useKaju } from "@/nx/kaju/state";
import type { Block } from "@/sp3/ai/blocks";
import { DemoKajuProvider } from "./demoKaju";
import "@/nx/nx.css";
import "@/nx/kaju/kaju.css";
import "@/nx/kaju/workspace.css";
import "./live.css";

const VOCAB = { places: ["Ward 14", "Market gate", "Canal Road", "Main Road", "Temple lane", "Bus depot"], teams: [], channels: [], people: [{ id: "anita", name: "Anita" }, { id: "ravi", name: "Ravi" }, { id: "rao", name: "Dr. Rao" }] };
const STARTERS = ["Which releases are missing a photo?", "How is the October package looking?", "Show me SP-1067's record", "What needs Anita today?"];
const NAV = [["Ask Kaju", Sparkles, true], ["Missions", ListChecks], ["Automations", Zap], ["Approvals", ShieldCheck], ["Insights", BarChart3], ["History", History], ["Rules & memory", SlidersHorizontal]] as const;
const NOTICED: { icon: typeof Hand; tone: string; title: string; detail: string; source: string; ask: string; label: string }[] = [
  { icon: ClipboardCheck, tone: "warn", title: "2 releases are still missing a release photo", detail: "SP-1044 and SP-1067 cannot join the October package until the photo is on the record.", source: "Kaju's weekly evidence check", ask: "Which releases are missing a photo?", label: "See the check" },
  { icon: CalendarClock, tone: "accent", title: "The October package is due on Friday", detail: "A draft is ready: 142 sterilised, 139 vaccinated, 131 released, 4 exceptions, each explained.", source: "Reports", ask: "How is the October package looking?", label: "Open the package" },
  { icon: Hand, tone: "warn", title: "SP-1042 and SP-1067 may be the same animal", detail: "Same description, same place, three days apart. Kaju flags it; a person decides.", source: "Kaju's daily checks", ask: "Why might SP-1042 and SP-1067 be the same animal?", label: "See why" },
];
type Card = { title: string; meta: string; blocks: Block[]; ask: string };

export type LiveProps = {
  /** The visitor is inside the product window: focus and typing are welcome. Outside it the frame is inert. */
  active: boolean;
  /** Leave the product window and carry on down the page. */
  onExit: () => void;
  /** Put the caret in the composer (set when the visitor asked to enter). */
  focusKey: number;
  onConversation: (state: { turns: number; busy: boolean; answered: boolean }) => void;
};

export default function KajuLive(props: LiveProps) {
  const [answered, setAnswered] = useState(false);
  return <DemoKajuProvider onActivity={setAnswered}><Frame {...props} answered={answered} /></DemoKajuProvider>;
}

function Frame({ active, onExit, focusKey, onConversation, answered }: LiveProps & { answered: boolean }) {
  const k = useKaju();
  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [model, setModel] = useState<boolean | null>(null);
  const [card, setCard] = useState<Card | "loading" | null>(null);
  const [hello, setHello] = useState(true);
  /* A phone's composer is one line at the foot of the window, so its hint is short (as in the app). */
  const [narrow, setNarrow] = useState(false);
  useEffect(() => { const m = window.matchMedia("(max-width: 640px)"); const on = () => setNarrow(m.matches); on(); m.addEventListener("change", on); return () => m.removeEventListener("change", on); }, []);
  useEffect(() => { let live = true; fetch("/api/kaju/demo").then((r) => r.json()).then((j: { model?: boolean }) => { if (live) setModel(j.model === true); }).catch(() => { if (live) setModel(false); }); return () => { live = false; }; }, []);
  useEffect(() => { onConversation({ turns: k.turns.length, busy: k.busy, answered }); }, [k.turns.length, k.busy, answered, onConversation]);
  /* Kaju greets a visitor who has just come in, then settles. */
  useEffect(() => { if (!active) return; setHello(true); const t = window.setTimeout(() => setHello(false), 2400); return () => window.clearTimeout(t); }, [active]);
  useEffect(() => { if (!focusKey || !active) return; root.current?.querySelector<HTMLTextAreaElement>('textarea[aria-label="Ask Kaju"]')?.focus({ preventScroll: true }); }, [focusKey, active]);
  /* The newest words are brought into view inside the window, as in the app; the page itself is never scrolled. */
  const last = k.turns[k.turns.length - 1];
  useEffect(() => {
    const el = body.current; if (!el || !k.turns.length) return;
    const t = window.setTimeout(() => { const turn = el.querySelector<HTMLElement>(".nx-kthread > li:last-child"); if (!turn) return; const top = turn.offsetTop - 96; el.scrollTo({ top: last?.pending ? el.scrollHeight : Math.max(0, top), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }, 80);
    return () => window.clearTimeout(t);
  }, [k.turns.length, last?.pending]);

  /* A sample record's link opens that record as a card inside the window. It is never a page to navigate to. */
  const open = useCallback(async (code: string) => {
    setCard("loading");
    try { const r = await fetch(`/api/kaju/demo?record=${encodeURIComponent(code)}`); setCard(r.ok ? ((await r.json()) as Card) : null); } catch { setCard(null); }
  }, []);
  const onLink = (e: ReactMouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest?.("a"); const href = a?.getAttribute("href") ?? "";
    const m = href.match(/^\/#record\/(.+)$/);
    if (m) { e.preventDefault(); e.stopPropagation(); void open(decodeURIComponent(m[1])); }
  };
  useEffect(() => { if (!card) return; const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setCard(null); } }; window.addEventListener("keydown", key, true); return () => window.removeEventListener("keydown", key, true); }, [card]);
  useEffect(() => { if (!active) setCard(null); }, [active]);

  const pose: KajuState = k.busy ? "thinking" : hello && !k.turns.length ? "greeting" : last?.reply ? "explaining" : "sitting";
  const ask = (q: string) => { if (!k.busy) void k.ask(q); };

  return (
    <div ref={root} className="nx kx-nx" data-theme="light" onClickCapture={onLink}>
      <div className="nx-rail" aria-hidden>
        <span className="nx-mark">sp</span>
        <span className="nx-rail-b"><LayoutGrid size={17} /></span>
        <span className="nx-rail-b"><MessageSquare size={17} /></span>
        <span className="nx-rail-b is-on"><Sparkles size={17} /></span>
        <span className="nx-rail-b"><Search size={17} /></span>
        <span className="nx-rail-sp" />
        <span className="nx-face">AN</span>
      </div>

      <aside className="nx-side" aria-label="Sample workspace">
        <div className="nx-org kx-org" aria-hidden><span className="nx-org-l">W</span><span><b>Ward 14 ABC Unit</b><small>Kaju · sample programme</small></span><ChevronsUpDown size={14} /></div>
        <div className="nx-nav" aria-hidden>
          {NAV.map(([label, Icon, on]) => <span key={label} className={`nx-item ${on ? "is-on" : ""}`}><Icon size={15} /><span>{label}</span></span>)}
          <div className="nx-nav-h">The sample team</div>
          {[["Anita", "Coordinator"], ["Ravi", "Field team"], ["Dr. Rao", "Veterinarian"]].map(([n, r]) => <span key={n} className="nx-item"><span className="nx-dot" /><span>{n}</span><i className="kx-role">{r}</i></span>)}
        </div>
        <Link href="/demo" className="nx-side-f"><Sparkles size={13} /><span>Sample programme. <b>Book a demo</b> to put Kaju on your records</span></Link>
      </aside>

      <div className="nx-main">
        <header className="nx-top">
          <div className="nx-crumb"><b>Kaju</b><span className="nx-sample"><span className="nx-chip is-plain">Sample programme</span></span></div>
          <div className="nx-top-r">
            <button type="button" className="nx-btn is-quiet is-sm kx-out-btn" onClick={onExit} aria-keyshortcuts="Escape"><span className="kx-hide-s">Step out to the site</span><span className="kx-only-s">Step out</span><ArrowDown size={14} aria-hidden /></button>
          </div>
        </header>
        <div ref={body} className="nx-body" role="region" tabIndex={-1} aria-label="Kaju, on a sample programme">
          <div className={`kj kj-home kx-home${k.turns.length ? " has-talk" : ""}`}>
            <div className="kj-main kj-one">
              <header className="kj-hero">
                <div className="kj-hero-pup" aria-hidden><Puppy state={pose} size={76} /></div>
                <div className="kj-hero-t">
                  <p className="kj-eyebrow">Kaju · working inside Ward 14 ABC Unit, a sample programme<span className="nx-sample"><span className="nx-chip is-plain">Illustrative records</span></span></p>
                  <p className="kj-h1" role="heading" aria-level={2}>Ask Kaju about this programme</p>
                  <p className="kj-sub">This is Kaju as your team would use it, on a sample ward: 164 animal records, their evidence, and October&apos;s package for the municipal office. Ask in your own words. Every answer names the records it read.</p>
                </div>
              </header>

              <div className="kj-compose">
                <Composer vocab={VOCAB} predictive={false} canPlan={false} busy={k.busy} placeholder={narrow ? "Ask about this programme" : "Ask about the sample programme: “Which releases are missing a photo?”"} onAsk={ask} onPlan={ask} />
              </div>
              {!k.turns.length ? (
                <div className="kj-jobs kx-starters">
                  <p className="kj-jobs-h">Or start from one of these:</p>
                  <div className="kj-jobs-row" role="group" aria-label="Starting questions">{STARTERS.map((s) => <button key={s} type="button" className="kj-job" disabled={k.busy} onClick={() => ask(s)}>{s}</button>)}</div>
                </div>
              ) : null}

              {k.turns.length ? (
                <section className="kj-convo" aria-label="Conversation">
                  <Thread />
                  <p className="kj-quiet"><button type="button" className="nx-thread" onClick={k.clear}><Plus size={12} /> New conversation</button> · This conversation stays in this browser tab. Nothing you type is stored by StrayPaw.</p>
                </section>
              ) : (
                <section className="kj-noticed" aria-labelledby="kx-n">
                  <div className="kj-noticed-h"><p id="kx-n" role="heading" aria-level={3}>Kaju noticed</p><span className="kj-count">{NOTICED.length}</span><span className="nx-sample"><span className="nx-chip is-plain">Sample data</span></span></div>
                  <ul className="kj-noticed-l">{NOTICED.map((n) => (
                    <li key={n.title} className={`kj-notice t-${n.tone}`}>
                      <span className="kj-notice-i" aria-hidden><n.icon size={16} /></span>
                      <div className="kj-notice-b"><b>{n.title}</b><p>{n.detail}</p><small>{n.source}</small>
                        <div className="kj-notice-a"><button type="button" className="kj-act is-plan" disabled={k.busy} onClick={() => ask(n.ask)}>{n.label}<ArrowRight size={14} /></button></div>
                      </div>
                    </li>))}</ul>
                </section>
              )}

              <div className="kj-foot">
                <p className="kj-rules">{model === null ? "Kaju reads only this sample." : model ? "Kaju answers here with a model, from this sample only." : "On this page Kaju answers by fixed rules from this sample; in a workspace with a connected model it also takes free-form questions."} It never makes clinical, verification or payment decisions; those steps wait for the person with the authority. <Link href="/ai" className="kj-link">How Kaju works<ArrowRight size={13} /></Link></p>
              </div>
            </div>
          </div>
        </div>

        {card ? (
          <aside className="kx-card" role="dialog" aria-label={card === "loading" ? "Opening the record" : card.title}>
            <div className="kx-card-h">
              <div><span className="nx-chip is-plain">Sample record</span><b>{card === "loading" ? "Opening…" : card.title}</b>{card !== "loading" ? <small>{card.meta}</small> : null}</div>
              <button type="button" className="nx-ib" aria-label="Close the record" onClick={() => setCard(null)}><X size={18} /></button>
            </div>
            {card !== "loading" ? <>
              <div className="kx-card-b"><Blocks blocks={card.blocks} busy={k.busy} onSend={ask} /></div>
              <div className="kx-card-f"><button type="button" className="nx-btn is-sm" disabled={k.busy} onClick={() => { const q = card.ask; setCard(null); ask(q); }}>Ask Kaju: {card.ask}</button></div>
            </> : <div className="kx-card-b"><div className="kj-skel is-tall" aria-label="Reading" /></div>}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
