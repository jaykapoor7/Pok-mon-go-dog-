"use client";

/* ════════════════════════════════════════════════════════════════════
   Reporting on WhatsApp, shown with the message itself.

   The scroll types one real-sounding report into a WhatsApp compose box
   at poster size and sends it. Then the words that matter leave the
   bubble and land in the record they become: "Brown dog" is the animal,
   "bus stand" and the live location are the place, "limping on a back
   leg" is the condition, the photo is the photo. The record folds into
   one point, the view pulls back from that street to the city's real
   recorded areas, and StrayPaw's reply comes back into the chat.

   How the flight works: the sentence and the record are laid out once,
   in place, with their key words invisible. Those words are drawn a
   second time on a layer above, and each one is moved from where it sits
   in the sentence to where it sits in the record, scaled by the ratio of
   the two type sizes. Both layouts are measured, so it holds at any width.

   Nothing to press: it plays by itself once it is on screen, and
   scrolling moves it ahead. Nothing invented: no
   names, phone numbers, reference numbers or outcomes; the map is the
   city's recorded areas; the photograph is a placeholder, never an animal.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Camera, CheckCheck, MapPin } from "lucide-react";
import type { Area } from "@/components/request/OriginalRequest";
import { useStory } from "./useStory";
import "./report-thread.css";

type Tok = "animal" | "place" | "cond" | "photo" | "pin";
const SAY: { t: string; tok?: Tok }[] = [
  { t: "Brown dog", tok: "animal" }, { t: " near the " }, { t: "bus stand", tok: "place" }, { t: ", " },
  { t: "limping on a back leg", tok: "cond" }, { t: ". Still walking." },
];
const CHARS = SAY.reduce((n, s) => n + s.t.length, 0);

/* The script, as points on the scroll. Starts at the chat, finishes at a
   checked record — the group chat and the city map are their own sections,
   so this one ends when the record is ready. */
const T = {
  type0: 0.04, type1: 0.3, photo: 0.32, pin: 0.36, send: 0.44,
  read: 0.5, review: 0.86,
};
const FLY: Record<Tok, [number, number]> = { animal: [0.56, 0.68], place: [0.6, 0.72], pin: [0.63, 0.75], cond: [0.66, 0.78], photo: [0.7, 0.81] };
const NOTE = [
  { at: 0, t: "Typed into WhatsApp" },
  { at: T.send, t: "Sent to StrayPaw" },
  { at: T.read, t: "Read into a record" },
  { at: T.review, t: "Checked by a person before anyone else sees it" },
];

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => (v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const span = (p: number, a: number, b: number) => ease(clamp((p - a) / (b - a)));

type Box = { x: number; y: number; w: number; h: number };
type Geo = { toks: Partial<Record<Tok, { a: Box; b: Box }>> };

/* A run of text typed up to `upto` characters: the rest keeps its room but
   is not drawn, so nothing reflows while it types. */
function Typed({ text, from, upto, caret }: { text: string; from: number; upto: number; caret: boolean }) {
  const n = Math.max(0, Math.min(text.length, upto - from));
  const end = from + text.length;
  const here = caret && ((upto >= from && upto < end) || (upto === CHARS && end === CHARS));
  return <>{text.slice(0, n)}{here && <i className="rt-caret" aria-hidden />}<span className="rt-unsaid">{text.slice(n)}</span></>;
}

const Photo = () => <span className="rt-chip rt-chip-photo"><Camera aria-hidden /></span>;
const Pin = () => <span className="rt-chip rt-chip-pin"><svg viewBox="0 0 80 40" aria-hidden><rect width="80" height="40" fill="#dfe7dc" /><path d="M0 27 C22 23 40 32 80 21" stroke="#fff" strokeWidth="4" fill="none" /><path d="M33 0 C35 14 31 28 36 40" stroke="#fff" strokeWidth="3" fill="none" /><circle cx="40" cy="20" r="8" fill="#00a884" fillOpacity=".2" /><circle cx="40" cy="20" r="3" fill="#00a884" /></svg><b><MapPin aria-hidden />Live location</b></span>;

export function ReportThread({ areas, city, recordedAt: _recordedAt }: { areas: Area[]; city: string; recordedAt?: string }) {
  const place = useMemo(() => [...areas].sort((a, b) => b.open - a.open)[0]?.name || city, [areas, city]);

  const track = useRef<HTMLDivElement>(null);
  const raw = useStory(track, 11, "whatsapp-groups");
  /* The first stretch of the scroll is the opening frame; the message's own script runs on the rest. */
  const INTRO = 0.08;
  const p = clamp((raw - INTRO) / (1 - INTRO));
  const intro = 1 - clamp((raw - INTRO * 0.55) / (INTRO * 0.45));
  const [geo, setGeo] = useState<Geo | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const ga = useRef<Partial<Record<Tok, HTMLElement | null>>>({});
  const gb = useRef<Partial<Record<Tok, HTMLElement | null>>>({});

  /* Measure both layouts relative to the stage. */
  const measure = useCallback(() => {
    const st = stage.current, cd = card.current; if (!st || !cd) return;
    const s = st.getBoundingClientRect();
    const rel = (el: Element): Box => { const r = el.getBoundingClientRect(); return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }; };
    const toks: Geo["toks"] = {};
    (Object.keys(FLY) as Tok[]).forEach((k) => { const a = ga.current[k], b = gb.current[k]; if (a && b) toks[k] = { a: rel(a), b: rel(b) }; });
    void rel(cd);
    setGeo({ toks });
  }, []);
  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (stage.current) ro.observe(stage.current);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [measure]);

  const typed = Math.round(CHARS * clamp((p - T.type0) / (T.type1 - T.type0)));
  const sent = p >= T.send, reading = p >= T.read;
  const note = NOTE.reduce((a, x) => (p >= x.at ? x : a), NOTE[0]);
  const status = p >= T.review ? "Checked by a person" : "Waiting for a person";

  /* The key words leave the sentence, land in the record, stay there. */
  const flyStyle = (k: Tok): CSSProperties => {
    const g = geo?.toks[k];
    if (!g) return { opacity: 0 };
    const [f0, f1] = FLY[k];
    const e = span(p, f0, f1), s = g.b.h / g.a.h;
    const x = lerp(g.a.x, g.b.x, e), y = lerp(g.a.y, g.b.y, e), sc = lerp(1, s, e);
    const shown = k === "photo" ? p >= T.photo : k === "pin" ? p >= T.pin : true;
    return { transform: `translate3d(${x}px, ${y}px, 0) scale(${sc})`, opacity: shown ? 1 : 0 };
  };

  let from = 0;
  const sentence: ReactNode[] = SAY.map((s) => {
    const at = from; from += s.t.length;
    const inner = <Typed text={s.t} from={at} upto={typed} caret={!sent} />;
    return s.tok
      ? <span key={s.t} ref={(el) => { ga.current[s.tok!] = el; }} className={`rt-say-tok is-${s.tok}`}>{inner}</span>
      : <span key={s.t}>{inner}</span>;
  });
  /* The overlay copy of a word, typed in step with the sentence. */
  const word = (k: Tok) => { let at = 0; for (const s of SAY) { if (s.tok === k) return <Typed text={s.t} from={at} upto={typed} caret={false} />; at += s.t.length; } return null; };

  const style = {
    "--note": clamp((p - note.at) / 0.02), "--intro": intro,
  } as CSSProperties;

  return (
    <section id="one-request" className="rt" aria-labelledby="rt-title">
      <p className="rt-sr">StrayPaw is on WhatsApp. Anyone can message the StrayPaw bot to report an animal, and NGOs add it to their team&rsquo;s group chat. In a direct chat, a resident types what they see, with a photo and their live location, and sends it to StrayPaw. StrayPaw reads the message into a record: the animal, the place and the condition. A person checks it before anyone else sees it. The group chat view and {city}&rsquo;s map among {areas.length.toLocaleString("en-IN")} recorded areas are in the sections that follow.</p>
      <div ref={track} className="rt-track">
        <div ref={stage} className={`rt-stage${sent ? " is-sent" : ""}${reading ? " is-read" : ""}`} style={style}>

          <h2 id="rt-title" className="rt-label"><svg viewBox="0 0 24 24" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Z" fill="#25d366" /><path d="M8.6 7.4c.2-.4.4-.4.7-.4h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.8.9c.3.1.4.2.5.3 0 .2 0 .9-.3 1.6-.3.7-1.6 1.4-2.2 1.4-.6.1-1.2.3-4-.8-3.4-1.4-5.5-4.9-5.7-5.1-.2-.2-1.3-1.8-1.3-3.4 0-1.6.8-2.4 1.2-2.7Z" fill="#fff" /></svg>Direct chat with the StrayPaw bot</h2>
          <div className="rt-intro">
            <p className="rt-intro-h">StrayPaw is on WhatsApp.</p>
            <p className="rt-intro-s">Message the StrayPaw bot to report an animal. NGOs add it to their team&rsquo;s group to run their records.</p>
          </div>

          <div className="rt-say" aria-hidden>
            <div className="rt-bubble-big">
              <p className="rt-words">{sentence}</p>
              <div className="rt-attach">
                <span ref={(el) => { ga.current.photo = el; }} className="rt-slot"><Photo /></span>
                <span ref={(el) => { ga.current.pin = el; }} className="rt-slot"><Pin /></span>
              </div>
              <span className="rt-meta">8:41 <CheckCheck aria-hidden /></span>
              <span className="rt-send"><svg viewBox="0 0 24 24" aria-hidden><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10 15 12 3.4 14z" fill="currentColor" /></svg></span>
            </div>
          </div>

          <div ref={card} className="rt-rec" aria-hidden>
            <div className="rt-rec-row is-animal"><span className="rt-rec-k">Animal</span><span ref={(el) => { gb.current.animal = el; }} className="rt-rec-v">Brown dog</span></div>
            <div className="rt-rec-row is-place">
              <span className="rt-rec-k">Place</span>
              <span className="rt-rec-place">
                <span ref={(el) => { gb.current.place = el; }} className="rt-rec-v">bus stand</span>
                <span className={`rt-rec-resolved${p >= FLY.pin[1] ? " is-on" : ""}`}>{place}, {city}</span>
              </span>
              <span ref={(el) => { gb.current.pin = el; }} className="rt-rec-slot"><Pin /></span>
            </div>
            <div className="rt-rec-row is-cond"><span className="rt-rec-k">Condition</span><span ref={(el) => { gb.current.cond = el; }} className="rt-rec-v">limping on a back leg</span></div>
            <div className="rt-rec-row is-photo"><span className="rt-rec-k">Photo</span><span ref={(el) => { gb.current.photo = el; }} className="rt-rec-slot"><Photo /></span><span className="rt-rec-aside">not public until checked</span></div>
            <p className={`rt-rec-status${p >= T.review ? " is-done" : ""}`}><i />{status}</p>
          </div>

          {/* The words themselves, flying from the sentence into the record. */}
          <div className="rt-fly" aria-hidden>
            <span className="rt-say-tok is-animal rt-f" style={flyStyle("animal")}>{word("animal")}</span>
            <span className="rt-say-tok is-place rt-f" style={flyStyle("place")}>{word("place")}</span>
            <span className="rt-say-tok is-cond rt-f" style={flyStyle("cond")}>{word("cond")}</span>
            <span className="rt-f rt-f-chip" style={flyStyle("photo")}><Photo /></span>
            <span className="rt-f rt-f-chip" style={flyStyle("pin")}><Pin /></span>
          </div>

          {intro < 0.5 && <p className="rt-note" key={note.t} aria-hidden>{note.t}</p>}
          <span className="rt-progress" aria-hidden><i style={{ transform: `scaleX(${raw})` }} /></span>
        </div>
      </div>
    </section>
  );
}
