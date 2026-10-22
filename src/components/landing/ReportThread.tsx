"use client";

/* ════════════════════════════════════════════════════════════════════
   One report, as a conversation.

   The WhatsApp pilot, told as a single thread that grows from the first
   message to the city's record: what a resident sends, what StrayPaw
   says back, what a team records, and where the report ends up. Four
   chapters, one continuous chat, one message at a time.

   Pacing. The section holds while the reader scrolls through it, and the
   scroll is the clock: each step of the scroll brings the next message,
   StrayPaw's replies arrive after a typing beat, and a chapter's title
   changes a little before its first message. Scrolling back takes the
   messages back. There is nothing to press. Under reduced motion the
   messages still follow the scroll but arrive without animation.

   Honesty. WhatsApp intake is a pilot: the frame says so, the photo is
   withheld, no reference numbers, names or outcomes are invented, and the
   city card uses the real recorded areas with their date.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Camera, CheckCheck, ChevronLeft, MapPin } from "lucide-react";
import type { Area } from "@/components/request/OriginalRequest";
import "./report-thread.css";

type Msg = { id: string; from: "you" | "sp" | "note"; body: ReactNode; time?: string };
type Chapter = { label: string; title: string; text: string; msgs: Msg[] };

function useAreaDots(areas: Area[], place: string) {
  return useMemo(() => {
    const pts = areas.filter((a) => a.ring.length >= 6).map((a) => {
      let x = 0, y = 0;
      for (let i = 0; i < a.ring.length; i += 2) { x += a.ring[i]; y += a.ring[i + 1]; }
      return { x: x / (a.ring.length / 2), y: y / (a.ring.length / 2), open: a.open > 0, here: a.name === place };
    });
    if (!pts.length) return { pts: [], here: null as null | { x: number; y: number } };
    /* Frame the central 94% of areas so a few outliers do not shrink the city. */
    const q = (v: number[], f: number) => { const a = [...v].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.max(0, Math.round(f * (a.length - 1))))]; };
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const w = q(xs, 0.03), e = q(xs, 0.97), s = q(ys, 0.03), n = q(ys, 0.97);
    const span = Math.max(e - w, n - s, 0.001), sc = 196 / span;
    const ox = 22 + (196 - (e - w) * sc) / 2, oy = 16 + (196 - (n - s) * sc) / 2;
    const out = pts.map((p) => ({ ...p, x: ox + (p.x - w) * sc, y: oy + (n - p.y) * sc }));
    return { pts: out, here: out.find((p) => p.here) ?? null };
  }, [areas, place]);
}

export function ReportThread({ areas, city, recordedAt }: { areas: Area[]; city: string; recordedAt?: string }) {
  const place = useMemo(() => [...areas].sort((a, b) => b.open - a.open)[0]?.name || city, [areas, city]);
  const { pts, here } = useAreaDots(areas, place);

  const chapters = useMemo<Chapter[]>(() => [
    {
      label: "Send", title: "You send what you see.", text: "A photo, the place and a line about the animal. Nothing else is asked of you.",
      msgs: [
        { id: "photo", from: "you", time: "8:41", body: <span className="rt-photo"><span className="rt-photo-art" aria-hidden><Camera size={22} /></span><span><b>Photo</b><small>Not shown in this preview</small></span></span> },
        { id: "text", from: "you", time: "8:41", body: <>Brown dog near the bus stand. Limping on a back leg, still walking.</> },
        { id: "pin", from: "you", time: "8:42", body: <span className="rt-pin"><svg viewBox="0 0 240 120" aria-hidden><rect width="240" height="120" fill="#dfe7dc" /><path d="M0 78 C60 70 110 92 240 64" stroke="#fff" strokeWidth="7" fill="none" /><path d="M96 0 C102 40 90 80 104 120" stroke="#fff" strokeWidth="5" fill="none" /><circle cx="120" cy="60" r="30" fill="#2457ce" fillOpacity=".14" stroke="#2457ce" strokeWidth="1.5" /><circle cx="120" cy="60" r="5" fill="#2457ce" /></svg><span><MapPin size={14} aria-hidden /> {place} · approximate area</span></span> },
      ],
    },
    {
      label: "Review", title: "A person checks it first.", text: "Every report is reviewed before it goes on the public record. Teams nearby can then see it.",
      msgs: [
        { id: "ack", from: "sp", time: "8:42", body: <>Thank you. Your report is <b>in review</b>. A person checks it before it goes on the record.</> },
        { id: "next", from: "sp", time: "8:43", body: <>Once it is on the record, teams working near {place} can see it. Whether to take it on is their decision.</> },
      ],
    },
    {
      label: "Care", title: "Care stays with the animal.", text: "If a team takes it on, what they record joins the same history: the visit, the care, the follow-up.",
      msgs: [
        { id: "day", from: "note", body: <>Later, if a team records care</> },
        { id: "care", from: "sp", time: "16:05", body: <span className="rt-card"><span className="rt-card-k">On the animal’s history</span><span className="rt-card-row"><i className="is-done" />Report reviewed</span><span className="rt-card-row"><i className="is-care" />Care recorded by the team</span><span className="rt-card-row"><i />Follow-up, when recorded</span></span> },
        { id: "you2", from: "you", time: "16:07", body: <>Thank you for looking into it.</> },
      ],
    },
    {
      label: "Record", title: "One report. A bigger picture.", text: "Each report joins the city’s shared record, so the next person and the next team start from what is known.",
      msgs: [
        { id: "city", from: "sp", time: "16:08", body: <span className="rt-city"><svg viewBox="0 0 240 228" role="img" aria-label={`Recorded areas in ${city}`}><rect width="240" height="228" fill="#0b1e3d" />{pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.open ? 3.2 : 2} fill={p.open ? "#ff8a3d" : "#8fb7ff"} opacity={p.open ? 1 : 0.5} />)}{here && <circle cx={here.x} cy={here.y} r="9" fill="none" stroke="#fffdf9" strokeWidth="1.5" />}</svg><span className="rt-city-cap"><b>{city}</b><span>{areas.length.toLocaleString("en-IN")} recorded areas{recordedAt ? ` · ${recordedAt}` : ""}</span><small>Recorded areas, not citywide coverage.</small></span></span> },
      ],
    },
  ], [place, city, areas.length, recordedAt, pts, here]);

  const all = useMemo(() => chapters.flatMap((c, ci) => c.msgs.map((m) => ({ ...m, ci }))), [chapters]);

  /* The scroll script, in units: one per message, a pause between
     chapters, a lead-in and a hold at the end. */
  const script = useMemo(() => {
    const at: number[] = [], heads: number[] = [];
    let u = 0.5;
    all.forEach((m, k) => {
      if (k > 0 && m.ci !== all[k - 1].ci) { u += 0.9; heads[m.ci] = u - 0.55; }
      if (k === 0) heads[0] = 0;
      u += m.from === "sp" ? 1.15 : m.from === "note" ? 0.6 : 0.85;
      at.push(u);
    });
    const total = u + 1.1;
    return { at: at.map((x) => x / total), heads: heads.map((x) => x / total), typing: 0.5 / total, units: total };
  }, [all]);

  const [p, setP] = useState(0);
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(rm.matches);
    sync(); rm.addEventListener("change", sync);
    let raf = 0;
    const read = () => {
      raf = 0;
      const el = track.current; if (!el) return;
      const r = el.getBoundingClientRect(), vh = window.innerHeight;
      const v = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - vh)));
      setP((o) => (Math.abs(o - v) < 0.002 ? o : v));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { rm.removeEventListener("change", sync); window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);

  const shown = script.at.filter((x) => p >= x).length;
  const nextMsg = all[shown];
  const typing = !!nextMsg && nextMsg.from === "sp" && p >= script.at[shown] - script.typing;
  let chapter = 0;
  script.heads.forEach((h, c) => { if (p >= h) chapter = c; });
  const firstOf = (c: number) => all.findIndex((m) => m.ci === c);

  /* Keep the newest message in view inside the phone, never the page. */
  useEffect(() => {
    const el = thread.current; if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [shown, typing, reduce]);

  const ch = chapters[chapter];

  return (
    <section ref={root} id="one-request" className="rt" aria-labelledby="rt-title">
      <header className="rt-head">
        <p className="rt-kicker"><span className="rt-pilot">Pilot</span> Reporting on WhatsApp</p>
        <h2 id="rt-title">One message.{" "}<br />A record that keeps going.</h2>
        <p className="rt-lede">How a report sent on WhatsApp travels from a street in {city} to the shared record. Scroll to follow it.</p>
      </header>

      <div ref={track} className="rt-track" style={{ height: `calc(100svh + ${Math.round(script.units * 34)}svh)` }}>
        <div className="rt-stage">
          <div className="rt-grid">
            <ol className="rt-steps" aria-label="The report, in four steps">
              {chapters.map((c, i) => {
                const start = firstOf(i), fill = i < chapter ? 1 : i === chapter ? Math.max(0.04, (shown - start) / c.msgs.length) : 0;
                return (
                  <li key={c.label} className={i < chapter ? "is-past" : i === chapter ? "is-now" : ""} aria-current={i === chapter ? "step" : undefined}>
                    <span className="rt-step-n" aria-hidden>{i + 1}</span>
                    <span className="rt-step-t"><b>{c.title}</b><span>{c.text}</span></span>
                    <span className="rt-step-s" aria-hidden>{c.label}</span>
                    <span className="rt-step-bar" aria-hidden><i style={{ transform: `scaleX(${fill})` }} /></span>
                  </li>
                );
              })}
            </ol>

            <div className="rt-now" aria-hidden>
              <h3 key={chapter}>{ch.title}</h3>
              <p>{ch.text}</p>
            </div>

            <div className="rt-device">
              <div className="rt-screen">
                <div className="rt-bar">
                  <ChevronLeft size={20} aria-hidden />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/straypaw-mark.png" alt="" width={34} height={34} />
                  <span><b>StrayPaw</b><small>{typing ? "typing…" : "Pilot preview"}</small></span>
                </div>
                <div ref={thread} className="rt-thread" role="log" aria-label="Example WhatsApp conversation">
                  <p className="rt-day">Example conversation · illustrative</p>
                  {all.slice(0, shown).map((m) => (
                    <div key={m.id} className={`rt-msg is-${m.from}`}>
                      {m.from === "note" ? <span>{m.body}</span> : <div className="rt-bubble">{m.body}{m.time && <span className="rt-time">{m.time}{m.from === "you" && <CheckCheck size={14} aria-hidden />}</span>}</div>}
                    </div>
                  ))}
                  {typing && <div className="rt-msg is-sp" aria-hidden><div className="rt-bubble rt-typing"><i /><i /><i /></div></div>}
                  {shown === 0 && <p className="rt-hint" aria-hidden>Scroll to send the report</p>}
                </div>
                <div className="rt-compose" aria-hidden><span>Message</span><i><Camera size={18} /></i></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="rt-note">WhatsApp intake is a pilot and is not open to the public yet. This conversation is an example, not a real report. Acceptance and care depend on participating teams. <a href="/community/report">Report on the web today</a>.</p>
    </section>
  );
}
