"use client";

/* ════════════════════════════════════════════════════════════════════
   The register: a card file of real animals, flipped through by scroll.

   Every animal reported gets a StrayPaw ID and a card that keeps its
   story. This section is that idea made physical: an index box, the front
   card a real animal (a resident's photograph, its ID on the tab, where it
   lives, when it was seen, what its record holds), the next cards' tabs
   peeking up behind it, and behind those the rest of the register.

   As the section scrolls, the front card tips forward and falls away, the
   next rises to the front and its photograph develops from pale to full
   colour, and the split-flap board beside the box flips, letter by letter,
   to the new animal's ID. Each card rests a moment before the next.

   A self-contained section, driven only by its own scroll. The total is
   the hero's own count. Nothing is invented: every card is a real public
   record, "not recorded yet" where it is not, and the blank cards behind
   carry no IDs. Under reduced motion the box does not flip on scroll; its
   cards turn with the buttons beside it.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { sized } from "@/lib/photo/src";
import { cleanPlace } from "@/lib/utils";
import type { AnimalRegister as Data, RegisterFocus } from "@/lib/landing/story";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string | null, year = true) => { if (!iso) return null; const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}${year ? ` ${d.getUTCFullYear()}` : ""}`; };
const fmt = (n: number) => n.toLocaleString("en-IN");
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const placeOf = (c: RegisterFocus) => [cleanPlace(c.zone), c.city].filter(Boolean).join(" · ") || "Place not recorded";
const checkOf = (v: string | null) => { const s = (v ?? "").toLowerCase(); return ["yes", "true", "sterilised", "sterilized"].includes(s) ? "yes" : ["no", "false", "not_sterilised"].includes(s) ? "no" : "unknown"; };
const FLAP = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
const GHOSTS = 6;

/* The board beside the box: each letter spins through a few before it
   lands, the way a station board changes. */
function SplitFlap({ text, calm }: { text: string; calm: boolean }) {
  const [shown, setShown] = useState(text);
  useEffect(() => {
    if (calm) { setShown(text); return; }
    const len = text.length, timers: number[] = [];
    const put = (j: number, ch: string) => setShown((prev) => { const a = prev.padEnd(len).slice(0, len).split(""); a[j] = ch; return a.join(""); });
    setShown((prev) => prev.padEnd(len).slice(0, len));
    text.split("").forEach((ch, j) => {
      if (ch === "-") { timers.push(window.setTimeout(() => put(j, "-"), j * 38)); return; }
      for (let s = 0; s < 3; s++) timers.push(window.setTimeout(() => put(j, FLAP[Math.floor(Math.random() * FLAP.length)]), j * 38 + s * 60));
      timers.push(window.setTimeout(() => put(j, ch), j * 38 + 180));
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [text, calm]);
  return (
    <span className="rx-flap sys-mono" role="img" aria-label={text}>
      {shown.split("").map((c, i) => <i key={`${i}-${c}`} className={c === "-" ? "is-dash" : ""} aria-hidden>{c}</i>)}
    </span>
  );
}

function Card({ c, i, setRef }: { c: RegisterFocus; i: number; setRef: (el: HTMLDivElement | null) => void }) {
  const seen = day(c.last_seen);
  const ster = checkOf(c.sterilisation);
  const facts = [
    { k: "r", what: "Requests for help", known: c.requests.length > 0, value: c.requests.length ? `${c.requests.length} · ${c.requests[c.requests.length - 1].condition ?? "help"}` : "None" },
    { k: "c", what: "Care", known: c.care.length > 0, value: c.care.length ? `${c.care.length} · last ${day(c.care[c.care.length - 1].at, false)}` : "None yet" },
    { k: "s", what: "Sterilised", known: ster !== "unknown", value: ster === "yes" ? "Yes" : ster === "no" ? "Not yet" : "Not examined" },
  ];
  return (
      <div className="rx-card" ref={setRef}>
        <span className="rx-tab sys-mono" style={{ ["--tab" as string]: i % 3 }}>{c.straypaw_id}</span>
        <div className="rx-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sized(c.cover_photo, 640)} alt={`${c.name?.trim() || "A dog"} near ${cleanPlace(c.zone) || c.city || "the reported spot"}, photographed by a resident`} loading={i < 2 ? "eager" : "lazy"} />
        </div>
        <div className="rx-body">
          <p className="rx-id sys-mono">{c.straypaw_id}</p>
          <p className="rx-place">{placeOf(c)}</p>
          <p className="rx-seen">{seen ? `Seen ${seen}` : "Seen"} · {plural(c.sightings, "sighting")}</p>
          <ul className="rx-facts">
            {facts.map((f) => (
              <li key={f.k} className={f.known ? "is-known" : "is-open"}><i aria-hidden /><span>{f.what}</span><b>{f.value}</b></li>
            ))}
          </ul>
          <Link href={`/dog/${c.id}`} className="rx-go">Open the record <ArrowUpRight size={13} aria-hidden /></Link>
        </div>
      </div>
  );
}

export function AnimalRegister({ data, total }: { data: Data; total: number }) {
  const [n, setN] = useState(6);
  const [front, setFront] = useState(0);
  const [calm, setCalm] = useState(false);
  const [open, setOpen] = useState(false);
  const sec = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const manual = useRef(0);
  const redraw = useRef<() => void>(() => {});
  const openAt = useRef(0);
  const cards = data.cards.slice(0, n);
  const count = cards.length;

  useEffect(() => {
    setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setN(window.innerWidth < 760 ? 5 : 6);
    const node = sec.current; if (!node) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      setOpen(true); io.disconnect();
      /* The cards rise out of the tray once, the front first. Done here in
         the frame rather than as a CSS animation on a wrapper, which would
         flatten the box's 3D and paint the cards in the wrong order. */
      openAt.current = performance.now();
      const tick = () => { redraw.current(); if (performance.now() - openAt.current < 1600) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }, { threshold: 0.2 });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const s = sec.current, box = stage.current;
    if (!s || !box || !count) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pad = 0.4, N = count;
    /* About three screens: long enough for each card to rest, no longer. */
    s.style.height = reduce ? "" : `${Math.round((N - 1 + pad * 2) * 44 + 100)}svh`;
    let raf = 0, shown = -1;
    const frame = () => {
      raf = 0;
      const r = s.getBoundingClientRect(), vh = window.innerHeight;
      const p = reduce ? 0 : clamp(-r.top / Math.max(1, r.height - vh));
      let k: number;
      if (reduce) k = manual.current;
      else {
        const raw = Math.max(0, Math.min(N - 1, p * (N - 1 + pad * 2) - pad)), base = Math.floor(raw);
        k = base + smooth((raw - base - 0.2) / 0.6); // each card rests before the next
      }
      const phone = window.innerWidth < 760, lift = phone ? 15 : 22;
      const since = openAt.current ? performance.now() - openAt.current : reduce ? 1e9 : -1;
      els.current.forEach((el, i) => {
        if (!el) return;
        const d = i - k;
        const rise = since < 0 ? 0 : smooth((since - Math.min(i, 8) * 70) / 850);
        let tf: string, op = 1;
        if (d >= 0) {
          /* Waiting behind: lifted so its tab shows, set back, leaning a touch. */
          tf = `translate3d(0, ${(-d * lift).toFixed(1)}px, ${(-d * 64).toFixed(1)}px) rotateX(${(d * 2.2).toFixed(2)}deg) scale(${(1 - d * 0.035).toFixed(3)})`;
          op = d > 4 ? Math.max(0, 5 - d) : 1;
        } else {
          /* Done: tips forward over the front of the box and falls away. */
          const u = Math.min(1, -d);
          tf = `translate3d(0, ${(u * 36).toFixed(1)}px, ${(u * 40).toFixed(1)}px) rotateX(${(-u * 104).toFixed(1)}deg)`;
          op = 1 - smooth((u - 0.5) / 0.38);
        }
        if (rise < 1) tf = `translate3d(0, ${((1 - rise) * 110).toFixed(1)}px, 0) ${tf}`;
        el.style.transform = tf;
        el.style.opacity = (op * rise).toFixed(3);
        el.style.setProperty("--dev", clamp(1 - Math.abs(d) * 1.35).toFixed(3));
        el.style.pointerEvents = Math.abs(d) < 0.35 ? "auto" : "none";
      });
      box.style.setProperty("--end", String(reduce ? 0 : clamp((p - 0.9) / 0.08)));
      box.style.setProperty("--start", String(reduce ? 1 : 1 - clamp(p / 0.12)));
      const fr = Math.max(0, Math.min(N - 1, Math.round(k)));
      if (fr !== shown) { shown = fr; setFront(fr); }
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(frame); };
    redraw.current = on;
    frame();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, [count]);

  if (!count || total <= 0) return null;
  const f = cards[Math.min(front, count - 1)];
  const turn = (by: number) => { manual.current = Math.max(0, Math.min(count - 1, manual.current + by)); redraw.current(); };

  return (
    <section ref={sec} className={`rx ${calm ? "is-calm" : ""} ${open ? "is-open" : ""}`} aria-labelledby="rx-title">
      <div ref={stage} className="rx-stage">
        <div className="rx-words">
          <p className="rx-kicker sys-mono">The register</p>
          <h2 id="rx-title"><span className="rx-n">{fmt(total)}</span> animals. <em>One card each.</em></h2>
          <p className="rx-lede">Every animal reported gets a StrayPaw ID and a card that keeps its story: where it lives, every sighting, every request for help, every treatment, whoever records it.</p>
          <div className="rx-board" aria-live="polite">
            <SplitFlap text={f.straypaw_id ?? ""} calm={calm} />
            <p className="rx-board-line">{placeOf(f)}{f.last_seen ? ` · seen ${day(f.last_seen, false)}` : ""}</p>
          </div>
          <p className="rx-hint sys-mono">Scroll to turn the cards</p>
          <p className="rx-end">Every one of the {fmt(total)} has a card like these.</p>
          {calm && (
            <p className="rx-turn">
              <button type="button" onClick={() => turn(-1)} aria-label="Previous card"><ArrowLeft size={16} /></button>
              <button type="button" onClick={() => turn(1)} aria-label="Next card"><ArrowRight size={16} /></button>
            </p>
          )}
        </div>

        <div className="rx-file">
          <div className="rx-drum">
            {cards.map((c, i) => <Card key={c.id} c={c} i={i} setRef={(el) => { els.current[i] = el; }} />)}
            {/* The rest of the register: blank cards, carrying no IDs. */}
            {Array.from({ length: GHOSTS }, (_, j) => (
              <div key={`g${j}`} className="rx-card is-ghost" aria-hidden ref={(el) => { els.current[count + j] = el; }}>
                <span className="rx-tab" style={{ ["--tab" as string]: (count + j) % 3 }} />
              </div>
            ))}
            <div className="rx-tray" aria-hidden>
              <span className="sys-mono">StrayPaw register</span>
              <b className="sys-mono">{fmt(total)} cards · one per animal</b>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
