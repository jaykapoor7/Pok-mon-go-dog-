"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Grain } from "@/sp4/site/Grain";
import { AiToolsUi } from "@/sp4/home/ui";

/* ════════════════════════════════════════════════════════════════════
   The two interactive homepage sections.

   UseCases: the title and tabs stay pinned while the page scrolls through
   the workflow, one step per screenful; tabs also jump. On phones and
   tablets the steps are a plain stacked list.

   AiBand: the dark band. Jobs Kaju does today cycle while the band
   is on screen; the panel shows which of its real tools each one uses.
   ════════════════════════════════════════════════════════════════════ */

export type Step = { tab: string; title: ReactNode; body: string; tag?: ReactNode; href: string; cta: string; ui: ReactNode };

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function UseCases({ steps, title, kicker }: { steps: Step[]; title: ReactNode; kicker?: ReactNode }) {
  const sec = useRef<HTMLElement>(null);
  const [i, setI] = useState(0);
  const per = 620;

  useEffect(() => {
    const on = () => {
      const el = sec.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const run = el.offsetHeight - window.innerHeight;
      const p = run > 0 ? Math.min(0.9999, Math.max(0, -r.top / run)) : 0;
      setI(Math.floor(p * steps.length));
    };
    on(); window.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, [steps.length]);

  const go = useCallback((n: number) => {
    const el = sec.current; if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const run = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + ((n + 0.5) / steps.length) * run, behavior: reduced() ? "auto" : "smooth" });
    setI(n);
  }, [steps.length]);

  const s = steps[i];
  return (
    <section ref={sec} className="s4-uc" aria-labelledby="uc-title" style={{ ["--uc-h" as string]: `${steps.length * per}px` }}>
      <div className="s4-uc-desk" style={{ height: `calc(${steps.length * per}px + 100vh - 160px)` }}>
        <div className="s4-uc-pin">
          <div className="s4-wrap" style={{ paddingTop: 24 }}>
            {kicker && <p className="s4-uc-kicker">{kicker}</p>}
            <h2 id="uc-title" className="s4-h2">{title}</h2>
            <div className="s4-uc-tabs" role="tablist" aria-label="Workflow steps">
              {steps.map((t, n) => (
                <button key={t.tab} type="button" role="tab" id={`uc-tab-${n}`} aria-selected={n === i} aria-controls="uc-panel" tabIndex={n === i ? 0 : -1}
                  onClick={() => go(n)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                      e.preventDefault();
                      const m = (n + (e.key === "ArrowRight" ? 1 : -1) + steps.length) % steps.length;
                      go(m); (e.currentTarget.parentElement?.children[m] as HTMLElement | undefined)?.focus();
                    }
                  }}>{t.tab}</button>
              ))}
            </div>
            <div id="uc-panel" role="tabpanel" aria-labelledby={`uc-tab-${i}`} className="s4-uc-panel">
              <div key={`c${i}`} className="s4-uc-copy s4-uc-swap">
                {s.tag}
                <h3 className="s4-h3">{s.title}</h3>
                <p className="s4-lede">{s.body}</p>
                <Link href={s.href} className="s4-link">{s.cta} <ArrowRight size={18} aria-hidden /></Link>
              </div>
              <Grain v={i} id="uc-art" className="s4-uc-art"><div key={`u${i}`} className="s4-uc-swap">{s.ui}</div></Grain>
            </div>
          </div>
        </div>
      </div>
      <div className="s4-wrap s4-uc-list">
        {kicker && <p className="s4-uc-kicker">{kicker}</p>}
        <h2 className="s4-h2">{title}</h2>
        {steps.map((t, n) => (
          <article key={t.tab}>
            <span className="s4-eyebrow" style={{ marginBottom: 0 }}>{n + 1} · {t.tab}</span>
            <h3 className="s4-h3">{t.title}</h3>
            <p className="s4-lede">{t.body}</p>
            <Grain v={n} id={`uc-m${n}`}>{t.ui}</Grain>
            <Link href={t.href} className="s4-link is-sm">{t.cta} <ArrowRight size={16} aria-hidden /></Link>
          </article>
        ))}
      </div>
    </section>
  );
}

const BANDS = [
  { title: <>Give the routine checks{" "}<br />to Kaju</>, org: "Kaju · Ward 14 ABC Unit", link: { href: "/ai", label: "See Kaju" }, jobs: [
    "Find records missing evidence before the weekly report",
    "Flag possible duplicates in this week's captures",
    "Draft the monthly summary for the reviewing office",
    "Turn a field message into a draft record",
  ] },
  { title: <>Kaju works for{" "}<br />every role</>, org: "Kaju · Zone 5 ARV programme", link: { href: "/assistant", label: "Open Kaju" }, jobs: [
    "Show a vet which surgeries still need their signature",
    "Remind the field team which second doses are due",
    "List what the coordinator must fix before month end",
    "Answer the reviewing office's query with the records behind it",
  ] },
];

export function AiBand({ v = 0 }: { v?: number }) {
  const band = BANDS[v % BANDS.length], JOBS = band.jobs;
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);
  const [still, setStill] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => { setStill(reduced()); }, []);
  useEffect(() => {
    const el = box.current; if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.35 });
    io.observe(el); return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (held || still || !seen) return;
    const t = window.setTimeout(() => setI((n) => (n + 1) % JOBS.length), 5200);
    return () => window.clearTimeout(t);
  }, [i, held, still, seen]);
  return (
    <div ref={box} className="s4-band">
      <div>
        <h2 className="s4-h2" id="ai-title">{band.title}</h2>
        <div className={`s4-jobs${still || held ? " is-still" : ""}`}>
          {JOBS.map((j, n) => (
            <button key={j} type="button" aria-pressed={n === i} onClick={() => { setI(n); setHeld(true); }}>
              <ArrowUpRight size={20} aria-hidden />{j}<i key={`${n}-${i}-${seen}`} aria-hidden />
            </button>
          ))}
        </div>
        <Link href={band.link.href} className="s4-link">{band.link.label} <ArrowRight size={18} aria-hidden /></Link>
      </div>
      <AiToolsUi active={i} org={band.org} />
    </div>
  );
}
