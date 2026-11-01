"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Grain } from "@/sp4/site/Grain";
import { KajuRunUi, type KajuRun } from "@/sp4/home/ui";

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

const BANDS: { title: ReactNode; link: { href: string; label: string }; jobs: string[]; runs: KajuRun[] }[] = [
  { title: <>Give recurring checks{" "}<br />to Kaju</>, link: { href: "/ai", label: "See Kaju" },
    jobs: ["List releases missing a photo this week", "Check every surgery has a vet sign-off", "Flag possible duplicates from capture day", "Turn a field message into a record"],
    runs: [
      { who: "Anita", ask: "Which Ward 3 releases this week have no release photo?", scope: "Ward 3 · week 45", steps: [["search_records", "Read 52 releases"], ["find_missing_evidence", "Checked 5 evidence items each"], ["work_summary", "Grouped by field team"]], found: ["SP-3104", "SP-3117", "SP-3121"], prepared: "A reminder to Suresh's team for the 3 photos", by: "Asked on demand · reads only what Anita can read" },
      { who: "Anita", ask: "Are any October surgeries in Ward 3 missing a vet sign-off?", scope: "Ward 3 · October", steps: [["search_records", "Read 44 surgeries"], ["find_missing_evidence", "Matched each to its authorisation"], ["programme_report", "Checked against the package"]], found: ["SP-3110", "SP-3126"], prepared: "A note for Dr. Thomas listing the 2 surgeries", by: "Asked on demand · held out of the package until signed" },
      { who: "Ravi", ask: "Did we catch any dog twice on Tuesday's capture day?", scope: "Ward 3 · 7 Nov", steps: [["search_records", "Read 18 captures"], ["find_duplicates", "Compared coat, sex, place and photos"], ["work_summary", "Listed the closest pairs"]], found: ["SP-3131 / SP-3109", "SP-3135 / SP-3098"], prepared: "2 pairs for Anita to mark same or different", by: "Asked on demand · Kaju never merges records itself" },
      { who: "Ravi", ask: "“two females released at the water tank, both notched, photos sent”", scope: "Field message", steps: [["extract_field_message", "Read the message"], ["search_records", "Matched 2 recent surgeries"], ["propose_note", "Drafted release notes"]], found: ["SP-3119", "SP-3122"], prepared: "Release notes on 2 records, with place and time", by: "Saved only when Ravi confirms" },
    ] },
  { title: <>Kaju works for{" "}<br />every role</>, link: { href: "/assistant", label: "Open Kaju" },
    jobs: ["Show a vet what still needs their signature", "Remind the field team which second doses are due", "List what to fix before month end", "Answer a reviewer's query with the records"],
    runs: [
      { who: "Dr. Thomas", ask: "What still needs my signature?", scope: "Zone 5 · this week", steps: [["search_records", "Read 31 procedures"], ["find_missing_evidence", "Filtered to your patients"]], found: ["SP-5012", "SP-5019", "SP-5023", "SP-5030"], prepared: "Nothing: authorising is yours to do", by: "Kaju cannot sign for a vet" },
      { who: "Priya", ask: "Which second anti-rabies doses are due in Ward 6?", scope: "Ward 6 · next 7 days", steps: [["work_summary", "Read 81 vaccinations"], ["propose_followup", "Grouped by street"]], found: ["9 dogs", "Mill colony", "Lake road"], prepared: "Follow-ups for the 9 dogs, assigned to Priya", by: "Saved only when Priya confirms" },
      { who: "Anita", ask: "What must we fix before the Zone 5 package goes out?", scope: "Zone 5 · September", steps: [["programme_report", "Read 188 procedures"], ["find_missing_evidence", "Found 6 gaps"], ["find_duplicates", "Found 1 possible duplicate"]], found: ["6 evidence gaps", "1 duplicate", "2 late releases"], prepared: "A checklist for the coordinator, by owner", by: "Reads only Zone 5's records" },
      { who: "Reviewer", ask: "Why was SP-5044 released 2 km away?", scope: "Zone 5 package", steps: [["search_records", "Opened SP-5044"], ["work_summary", "Read its history and notes"]], found: ["Capture: Ward 5", "Release: Ward 6", "Operator's note"], prepared: "A draft answer for the operator to send", by: "The operator replies; the office decides" },
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
  }, [i, held, still, seen, JOBS.length]);
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
      <KajuRunUi run={band.runs[i]} k={`${v}-${i}`} />
    </div>
  );
}
