"use client";

/* Landing additions: the hero that grows as you scroll, "how it works
   today", the strip of real street-dog photographs, and the audit trail. */

import { useEffect, useRef } from "react";
import { Camera, FileSpreadsheet, MessageCircle, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { KajuFace } from "@/kaju/Kaju";

/** Sets --hp (0→1) on the hero as it scrolls away: the demo grows to full width, the headline settles back. */
export function HeroScroll() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const hero = ref.current?.closest<HTMLElement>(".s6-hero"); if (!hero) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.innerWidth < 900) return;
    let raf = 0;
    const tick = () => { raf = 0; const p = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.6))); hero.style.setProperty("--hp", p.toFixed(3)); };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick(); window.addEventListener("scroll", on, { passive: true });
    return () => { window.removeEventListener("scroll", on); cancelAnimationFrame(raf); };
  }, []);
  return <span ref={ref} hidden />;
}

/** The before: how a programme runs without one record. */
export function WhyNow() {
  return (
    <section className="s7-why" aria-labelledby="why-title">
      <div className="s4-wrap">
        <p className="s7-why-k">How most programmes run today</p>
        <h2 id="why-title" className="s4-h2">The work is real. The record isn&rsquo;t.</h2>
        <div className="s7-why-grid">
          <article>
            <div className="s7-why-art is-chat" aria-hidden>
              <p className="s7-why-top"><MessageCircle size={13} /> Ward 14 field team · 214 unread</p>
              {["Brown dog near the gate, limping", "same one?? or the other brown one", "which ward is this", "sent yesterday check above"].map((m, i) => <span key={i} className={i % 2 ? "is-r" : ""}>{m}</span>)}
            </div>
            <h3>Reports lost in WhatsApp</h3>
            <p>Hundreds of messages a week. Nobody can say which dog was treated.</p>
          </article>
          <article>
            <div className="s7-why-art is-sheet" aria-hidden>
              <p className="s7-why-top"><FileSpreadsheet size={13} /> register_FINAL_v3 (2).xlsx</p>
              <table><tbody>{[["Dog 112", "W14", "12/10", "?"], ["Dog 113", "", "13/10", "F"], ["Dog 113", "W-14", "", "F"], ["dog 114", "ward14", "14/10", "?"]].map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={!c || c === "?" ? "is-bad" : ""}>{c || "—"}</td>)}</tr>)}</tbody></table>
            </div>
            <h3>Registers that disagree</h3>
            <p>Three spreadsheets, three spellings, the same dog counted twice.</p>
          </article>
          <article>
            <div className="s7-why-art is-back" aria-hidden>
              <p className="s7-why-top"><RotateCcw size={13} /> Municipal office · October claim</p>
              <b>Returned</b>
              <span>31 of 142 lines have no release photo.</span>
              <span>Payment held until resubmitted.</span>
            </div>
            <h3>Claims sent back</h3>
            <p>Missing evidence surfaces at month end, and payment waits weeks.</p>
          </article>
        </div>
        <p className="s7-why-turn"><span className="s7-why-k2"><KajuFace size={22} /></span>StrayPaw puts all three on one record, and Kaju keeps it complete. Here is how.</p>
      </div>
    </section>
  );
}

export type Photo = { src: string; by: string; licence: string; licenceUrl: string; source: string };
/** A moving strip of real street dogs, each credited. Pauses on hover and for reduced motion. */
export function PhotoStrip({ photos }: { photos: Photo[] }) {
  const row = [...photos, ...photos];
  return (
    <section className="s7-photos" aria-labelledby="photos-title">
      <div className="s4-wrap"><h2 id="photos-title" className="s7-photos-h">The animals behind every record</h2></div>
      <div className="s7-photos-track">
        <ul>
          {row.map((p, i) => (
            <li key={i} aria-hidden={i >= photos.length || undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={i < photos.length ? "A street dog in India" : ""} loading="lazy" decoding="async" />
              <small><a href={p.source} target="_blank" rel="noopener noreferrer" tabIndex={i >= photos.length ? -1 : undefined}>{p.by}</a> · <a href={p.licenceUrl} target="_blank" rel="noopener noreferrer license" tabIndex={i >= photos.length ? -1 : undefined}>{p.licence}</a></small>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Built for public money: one record's history, with the controls as captions. */
export function AuditTrail() {
  const rows: [string, string, string, string, string][] = [
    ["30 Oct · 07:42", "R", "Ravi", "Reported from the field (WhatsApp)", "Field capture"],
    ["30 Oct · 07:43", "K", "Kaju", "Drafted case: female, brown, Ward 14", "Prepared by Kaju"],
    ["30 Oct · 09:10", "A", "Anita", "Confirmed the draft and assigned Ravi", "Coordinator"],
    ["31 Oct · 14:05", "D", "Dr. Rao", "Authorised sterilisation, 14.2 kg", "Vet sign-off"],
    ["2 Nov · 17:20", "R", "Ravi", "Release photo at capture point", "Evidence"],
    ["3 Nov · 10:02", "M", "Municipal office", "Accepted line 18 of the October claim", "Reviewer"],
  ];
  const caps = ["Each organisation's records are isolated", "Roles decide who sees and changes what", "Every change records who and when", "Every record shows where it came from", "Kaju prepares; a named person confirms", "Export everything to Excel or CSV"];
  return (
    <div className="s7-audit">
      <ul className="s7-audit-caps">{caps.map((c) => <li key={c}><ShieldCheck size={16} aria-hidden />{c}</li>)}</ul>
      <div className="s7-audit-win" aria-label="Example: the history of one animal record">
        <div className="s7-audit-top"><Camera size={14} aria-hidden /><b>SP-1071 · Sheru · history</b><span>6 changes · nothing deleted</span></div>
        <ol>{rows.map(([t, a, who, what, tag], i) => (
          <li key={i} style={{ animationDelay: `${i * 120}ms` }}>
            <time>{t}</time><span className={`s7-audit-av${a === "K" ? " is-k" : ""}`}>{a === "K" ? <Sparkles size={12} /> : a}</span>
            <span><b>{who}</b> {what}</span><em className={a === "K" ? "is-k" : ""}>{tag}</em>
          </li>
        ))}</ol>
      </div>
    </div>
  );
}

/** Softly reveals landing content as it scrolls in, once. Off for reduced motion; without JS nothing is hidden. */
export function Reveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const main = document.querySelector("main"); if (!main) return;
    const SEL = [
      "main > section:not(.s6-hero):not(.s7-steps) .s4-h2", ".s4-sechead", ".s4-wall > *", ".s7-photos-track", ".s7-why-k", ".s7-why-grid > *", ".s7-why-turn",
      ".s7-mate-big > *", ".s7-mate-small > *", ".s7-rec-copy > *", ".s7-agent", ".s4-int-head", ".s7-tacc", ".s7-res-stats > *", ".s7-res-row",
      ".s7-audit-caps li", ".s7-audit-win", ".s7-close-card", ".s7-q-list > *", ".s7-q-art",
    ].join(",");
    const els = [...main.querySelectorAll<HTMLElement>(SEL)].filter((e) => !e.closest(".s6-hero, .s7-steps") && !e.parentElement?.closest("[data-rv]"));
    const sibIndex = new Map<Element, number>();
    els.forEach((e) => { const p = e.parentElement!; const i = sibIndex.get(p) ?? 0; sibIndex.set(p, i + 1); e.dataset.rv = ""; e.style.setProperty("--rv-d", `${Math.min(i, 6) * 80}ms`); });
    const band = main.querySelector<HTMLElement>(".s7-rec"); if (band) band.dataset.rvBand = "";
    const io = new IntersectionObserver((entries) => { for (const en of entries) if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    els.forEach((e) => { const r = e.getBoundingClientRect(); if (r.top < window.innerHeight * 0.92) e.classList.add("is-in"); else io.observe(e); });
    if (band) io.observe(band);
    document.documentElement.classList.add("s7-rv-on");
    return () => io.disconnect();
  }, []);
  return null;
}
