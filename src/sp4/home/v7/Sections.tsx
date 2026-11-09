"use client";

/* ════════════════════════════════════════════════════════════════════
   Landing sections after the use cases: the teammate, recurring work, the
   tools accordion and customer results. Product screens are illustrative
   records; partner figures come from their own (imported) registers.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Camera, Check, ChevronRight, ClipboardList, FileSpreadsheet, FileText, Map as MapIcon, MapPin, MessageCircle, MessageSquareText, PawPrint, ShieldCheck, Stethoscope, Users } from "lucide-react";
import { KajuFace } from "@/kaju/Kaju";
import { Blueprint } from "@/sp4/home/Blueprint";
import { AliveLogo } from "./AliveLogo";
import { CountUp } from "@/sp4/site/Live";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── Your team's favourite teammate ───────────────────────────────── */
export function Teammate() {
  return (
    <section className="s4-sec s7-mate" aria-labelledby="mate-title">
      <div className="s4-wrap">
        <h2 id="mate-title" className="s4-h2">Your team&rsquo;s favourite teammate</h2>
        <div className="s7-mate-rail">
        <div className="s7-mate-big">
          <article className="s7-mcard">
            <div className="s7-mstage"><KnowsArt /></div>
            <h3>Knows your organisation in and out</h3>
            <p>Kaju learns your animals, cases, vet sign-offs, contract rates, wards and team, and answers from your own records.</p>
          </article>
          <article className="s7-mcard">
            <div className="s7-mstage"><ToolsArt /></div>
            <h3>Connects all your tools</h3>
            <p>WhatsApp, Excel registers, Google Workspace, Microsoft 365, maps and SMS work together with StrayPaw.</p>
          </article>
        </div>
        <div className="s7-mate-small">
          <article className="s7-mcard">
            <div className="s7-mstage is-s"><div className="s7-log"><p>Overnight · Ward 14</p>{[["11:40 PM", "Read 38 field messages"], ["1:15 AM", "Drafted 12 cases"], ["3:05 AM", "Checked 164 releases"], ["6:30 AM", "Sent your morning brief"]].map(([t, x], i) => <div key={t} style={{ animationDelay: `${i * 220}ms` }}><span className="s7-chk is-ok"><Check size={11} strokeWidth={3} /></span><time>{t}</time>{x}</div>)}</div></div>
            <h3>Works in the background</h3>
            <p>Kaju runs checks and prepares records overnight, so the morning starts with a brief, not a backlog.</p>
          </article>
          <article className="s7-mcard">
            <div className="s7-mstage is-s"><div className="s7-pchat"><p><b>Meena</b> <u>@kaju</u> which dogs in Ward 9 are due a second dose this week?</p><p className="is-k"><KajuFace size={14} /> Seven are due. I put them on your field list for tomorrow, nearest first.</p></div></div>
            <h3>Runs workflows from your phone</h3>
            <p>Ask <b>@kaju</b> in the WhatsApp group, in the browser or in field mode. It reads the thread and gets to work.</p>
          </article>
          <article className="s7-mcard">
            <div className="s7-mstage is-s"><Ring /></div>
            <h3>Improves results and records</h3>
            <p>Kaju shares context across intake, vets, field and reporting, so gaps are fixed the same week, not at month end.</p>
          </article>
        </div>
        </div>
      </div>
    </section>
  );
}

function KnowsArt() {
  // Five sources on the left, each joined by a curve into Kaju on the right. One coordinate system, so every line meets the tile.
  const chips = ["Animals & cases", "Vet sign-offs", "Contract rates", "Wards & maps", "Team & roles"];
  const W = 420, H = 260, cx = 300, cy = 130, chipR = 168;
  const ys = chips.map((_, i) => 30 + i * 50);
  return (
    <div className="s7-knows2" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden>
        {ys.map((y, i) => <path key={i} d={`M${chipR} ${y} C ${chipR + 60} ${y}, ${cx - 90} ${cy}, ${cx - 40} ${cy}`} className="s7-k2-line" style={{ animationDelay: `${i * 0.4}s` }} />)}
        {ys.map((y, i) => <circle key={i} cx={chipR} cy={y} r="3.5" className="s7-k2-dot" />)}
      </svg>
      {chips.map((c, i) => <span key={c} className="s7-k2-chip" style={{ top: `${(ys[i] / H) * 100}%`, animationDelay: `${i * 0.4}s` }}>{c}</span>)}
      <span className="s7-k2-k" style={{ left: `${((cx - 40) / W) * 100}%`, top: "50%" }}><KajuFace size={46} /></span>
    </div>
  );
}
function ToolsArt() {
  // The tools sit on a ring around Kaju; lines draw from each one into him, one after another.
  const tools: [string, string, ReactNode][] = [
    ["WhatsApp", "#1f9d55", <Brand key="w" src="whatsapp-icon" />], ["Google Workspace", "#1a73e8", <Brand key="g" src="google-icon" />],
    ["Microsoft 365", "#0f6cbd", <Brand key="m" src="microsoft-icon" />], ["Excel", "#1f7a45", <Brand key="x" src="excel" />],
    ["Slack", "#4a154b", <Brand key="s" src="slack-icon" />], ["Gmail", "#c5221f", <Brand key="e" src="google-gmail" />],
    ["Maps & GPS", "#0f7b8a", <MapPin key="p" size={22} />], ["Camera", "#6b4fd8", <Camera key="c" size={22} />],
  ];
  const R = 38;
  return (
    <div className="s7-hub">
      <svg className="s7-hub-lines" viewBox="0 0 100 100" aria-hidden>
        {tools.map(([n], k) => { const a = (k / tools.length) * Math.PI * 2 - Math.PI / 2; return <line key={n} x1={50 + Math.cos(a) * R} y1={50 + Math.sin(a) * R} x2="50" y2="50" style={{ animationDelay: `${k * 0.35}s` }} />; })}
      </svg>
      <span className="s7-hub-k"><KajuFace size={44} /></span>
      {tools.map(([n, c, i], k) => { const a = (k / tools.length) * Math.PI * 2 - Math.PI / 2; return <span key={n} title={n} className="s7-hub-t" style={{ left: `${50 + Math.cos(a) * R}%`, top: `${50 + Math.sin(a) * R}%`, ["--c" as string]: c, animationDelay: `${k * 0.35}s` }}>{i}</span>; })}
    </div>
  );
}
// eslint-disable-next-line @next/next/no-img-element
function Brand({ src }: { src: string }) { return <img src={`/brand/tools/${src}.svg`} alt="" width={26} height={26} />; }
function Ring() {
  const r = 34, c = 2 * Math.PI * r, pct = 0.94;
  return (
    <div className="s7-ring">
      <svg viewBox="0 0 84 84" width="120" height="120" aria-hidden><circle cx="42" cy="42" r={r} fill="none" stroke="#e7ecf6" strokeWidth="8" /><circle cx="42" cy="42" r={r} fill="none" stroke="var(--s4-blue)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${pct * c} ${c}`} transform="rotate(-90 42 42)" /></svg>
      <b>94%</b><small>evidence complete</small>
      <span className="s7-pill is-green">3 photos to chase</span>
    </div>
  );
}

/* ── Give recurring work to Kaju ──────────────────────────────────── */
type Job = { title: string; agent: string; when: "schedule" | "event"; whenText: string; days?: number[]; time?: string; uses: string[]; notify: string };
const JOBS: Job[] = [
  { title: "Chase missing release photos before the monthly bill", agent: "Release photo chaser", when: "schedule", whenText: "Every day at 6:00 PM", days: [1, 2, 3, 4, 5, 6], time: "6:00 PM", uses: ["Releases", "Evidence", "Team", "WhatsApp"], notify: "Field staff, by name" },
  { title: "Turn the field WhatsApp group into draft cases", agent: "Field intake", when: "event", whenText: "When a message arrives in the group", uses: ["WhatsApp", "Register", "Cases", "Maps"], notify: "Coordinator" },
  { title: "Prepare the monthly claim at contract rates", agent: "Monthly claim builder", when: "schedule", whenText: "1st of every month at 9:00 AM", days: [1], time: "9:00 AM", uses: ["Vet sign-offs", "Contract rates", "Evidence", "Excel"], notify: "Programme lead" },
  { title: "Remind staff of post-op checks and second doses", agent: "Follow-up reminders", when: "schedule", whenText: "Every morning at 7:30 AM", days: [0, 1, 2, 3, 4, 5, 6], time: "7:30 AM", uses: ["Follow-ups", "Care records", "Team", "SMS"], notify: "Assigned field staff" },
  { title: "Catch the same dog registered twice", agent: "Register keeper", when: "event", whenText: "When a new animal is added", uses: ["Register", "Photos", "Maps"], notify: "Coordinator" },
];
const ALL_SOURCES = ["Register", "Cases", "Releases", "Evidence", "Vet sign-offs", "Care records", "Follow-ups", "Contract rates", "Team", "Photos", "Maps", "WhatsApp", "Excel", "SMS"];

export function Recurring() {
  const [on, setOn] = useState(0);
  const [hold, setHold] = useState(false);
  const [seen, setSeen] = useState(false);
  const [chosen, setChosen] = useState(false);
  const [tick, setTick] = useState(0);
  const ref = useRef<HTMLElement>(null);
  // The bar under the open job is the timer: when it fills, the next job opens.
  // It pauses while the section is off screen or the reader is on the card,
  // and stops once the reader picks a job.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const next = () => { setOn((v) => (v + 1) % JOBS.length); setTick((x) => x + 1); };
  const j = JOBS[on];
  return (
    <section ref={ref} className="s7-rec" aria-labelledby="rec-title">
      <div className="s4-wrap s7-rec-in">
        <div className="s7-rec-copy">
          <h2 id="rec-title" className="s4-h2">Give recurring work to Kaju</h2>
          <ul className="s7-rec-list">
            {JOBS.map((x, i) => (
              <li key={x.title}><button type="button" aria-pressed={on === i} onClick={() => { setOn(i); setChosen(true); }}><ArrowUpRight size={18} aria-hidden />{x.title}</button>{on === i && !chosen && <i key={tick} className="s7-rec-prog" aria-hidden style={{ animationPlayState: hold || !seen ? "paused" : "running" }} onAnimationEnd={next} />}</li>
            ))}
          </ul>
          <Link href="/kaju-agents" className="s7-link is-light">See Kaju agents <ArrowRight size={18} aria-hidden /></Link>
        </div>
        <div className="s7-agent" key={on} aria-label={`Example agent: ${j.agent}`} onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
          <span className="s7-agent-ic"><KajuFace size={22} /></span>
          <p className="s7-agent-name">{j.agent}</p>
          <div className="s7-row"><span className="s7-sel">Entire team ▾</span><span className="s7-toggle"><i /> Enabled</span><span className="s7-dim">Notifies {j.notify.toLowerCase()}</span></div>
          <p className="s7-agent-h">When should this run?</p>
          <div className="s7-when">
            <span className={j.when === "schedule" ? "is-on" : ""}><i /><b>On a schedule</b><small>Kaju runs at a set time</small></span>
            <span className={j.when === "event" ? "is-on" : ""}><i /><b>When something happens</b><small>Kaju watches for a change</small></span>
          </div>
          <div className="s7-sched">{j.when === "schedule" && j.days ? <>{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className={j.days!.includes(i) ? "is-on" : ""}>{d}</span>)}<em>{j.time}</em></> : <em className="is-wide">{j.whenText}</em>}<small>{j.whenText} · India Standard Time</small></div>
          <p className="s7-agent-h">What can Kaju use?</p>
          <div className="s7-uses">{ALL_SOURCES.map((x) => <span key={x} className={j.uses.includes(x) ? "is-on" : ""}>{x}</span>)}</div>
          <div className="s7-saved"><b>Prepares, never approves</b><span className="s7-pill is-green"><Check size={11} strokeWidth={3} /> Saved</span></div>
        </div>
      </div>
    </section>
  );
}

/* ── Integrated tools: one card open, the others expand on hover ──── */
type Tool = { key: string; name: string; logos: [string, string][]; /* [logo file or glyph, colour] */ line: string; demo: ReactNode; status: string };
const TOOLS: Tool[] = [
  { key: "wa", name: "WhatsApp", logos: [["whatsapp-icon", "#1f9d55"]], line: "Paste or forward the group's messages and ask @kaju. It reads the thread, checks the register and prepares the records.", status: "Paste intake works today · direct connection awaits Meta approval",
    demo: <div className="s7-tchat"><p className="is-me"><u>@kaju</u> what did the field team report today?</p><div className="s7-tans"><p><Check size={12} /> Read 38 messages from 5 people</p><table><thead><tr><th>Case</th><th>Ward</th><th>Status</th></tr></thead><tbody><tr><td>Brown female, limping</td><td>14</td><td>Draft</td></tr><tr><td>Pup with mange</td><td>9</td><td>Draft</td></tr><tr><td>Hit by auto, bleeding</td><td>12</td><td>Urgent</td></tr></tbody></table><p><b>Bottom line:</b> one urgent case on Canal Road. I drafted it and assigned Ravi, nearest.</p></div></div> },
  { key: "gw", name: "Google Workspace", logos: [["google-icon", "#1a73e8"], ["google-gmail", "#1a73e8"], ["google-drive", "#1a73e8"]], line: "Kaju reads registers in Sheets and Drive, drafts the Gmail to the municipal office and saves reports to Drive.", status: "Built · needs your administrator to connect it",
    demo: <div className="s7-tchat"><p className="is-me"><u>@kaju</u> email the October package to the municipal office</p><div className="s7-tans"><p><Check size={12} /> Drafted from the approved package</p><div className="s7-mail"><b>To:</b> abc.cell@municipal.gov.in<br /><b>Subject:</b> Ward 14 ABC claim · October 2026<br /><span>Attached: package.pdf, claim.xlsx</span></div><p><b>Waiting for you:</b> nothing is sent until you press Send.</p></div></div> },
  { key: "ms", name: "Microsoft 365", logos: [["microsoft-icon", "#0f6cbd"], ["microsoft-onedrive", "#0f6cbd"], ["excel", "#0f6cbd"]], line: "Excel registers, Word reports and PowerPoint reviews, read and written by Kaju in OneDrive.", status: "Built · needs your administrator to connect it",
    demo: <div className="s7-tchat"><p className="is-me"><u>@kaju</u> import last month&apos;s register from OneDrive and make the review slides</p><div className="s7-tans"><p><Check size={12} /> Read October_register.xlsx · 412 rows</p><table><thead><tr><th>Result</th><th>Rows</th><th>Next</th></tr></thead><tbody><tr><td>Matched to animals</td><td>398</td><td>Done</td></tr><tr><td>New animals</td><td>11</td><td>Draft</td></tr><tr><td>Possible duplicates</td><td>3</td><td>You decide</td></tr></tbody></table><p><Check size={12} /> Saved October review.pptx to OneDrive /StrayPaw</p></div></div> },
  { key: "xl", name: "Excel & CSV", logos: [["excel", "#1f7a45"]], line: "Bring the registers you already keep. Kaju imports them as they are and labels them until checked.", status: "Works today",
    demo: <div className="s7-tchat"><p className="is-me"><u>@kaju</u> bring in our 2024 register</p><div className="s7-tans"><p><Check size={12} /> register_2024.xlsx · 2,277 rows imported</p><table><thead><tr><th>Column in your sheet</th><th>Becomes</th><th>Filled</th></tr></thead><tbody><tr><td>Dog no.</td><td>StrayPaw ID</td><td>100%</td></tr><tr><td>Area / locality</td><td>Ward</td><td>96%</td></tr><tr><td>Opn date</td><td>Sterilisation date</td><td>91%</td></tr></tbody></table><p><b>Kept as historical</b> until each animal is checked by your team.</p></div></div> },
  { key: "map", name: "Maps & GPS", logos: [["◎", "#0f7b8a"]], line: "Every capture and release has a place. Export the register as GeoJSON or KML, real points only.", status: "Works today",
    demo: <div className="s7-tchat"><p className="is-me"><u>@kaju</u> were this week&apos;s dogs released where they were caught?</p><div className="s7-tans"><p><Check size={12} /> Checked 164 releases against their capture points</p><table><thead><tr><th>Animal</th><th>Distance</th><th>Status</th></tr></thead><tbody><tr><td>SP-1031</td><td>40 m</td><td>OK</td></tr><tr><td>SP-1083</td><td>110 m</td><td>OK</td></tr><tr><td>SP-1078</td><td>2.1 km</td><td>Flagged</td></tr></tbody></table><p><b>Bottom line:</b> one release outside its ward. I flagged it for the coordinator.</p></div></div> },
];

export function ToolsAccordion() {
  const [on, setOn] = useState(0);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    if (hover || reduced()) return;
    const id = window.setInterval(() => setOn((v) => (v + 1) % TOOLS.length), 4800);
    return () => window.clearInterval(id);
  }, [hover]);
  return (
    <section className="s4-sec s7-tacc-sec" aria-label="Kaju inside the tools you use">
      <div className="s4-wrap">
        <div className="s7-tacc" onMouseLeave={() => setHover(false)}>
          {TOOLS.map((t, i) => (
            <article key={t.key} className={`s7-tc${on === i ? " is-on" : ""}`} style={{ ["--c" as string]: t.logos[0][1] }}
              onMouseEnter={() => { setHover(true); setOn(i); }} onFocus={() => setOn(i)} tabIndex={0}>
              <div className="s7-tc-head">
                <span className="s7-tc-logos">{t.logos.map(([l, c]) => l.length > 2 ? <i key={l} className="s7-tc-logo">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`/brand/tools/${l}.svg`} alt="" /></i> : <b key={l} style={{ background: c }}>{l}</b>)}</span>
                <h3>{t.name}</h3>
              </div>
              <div className="s7-tc-body" hidden={on !== i}>
                <p>{t.line}</p>
                <div className="s7-tc-demo"><div className="s7-tc-bar"><KajuFace size={18} /> <b>Kaju</b><span>{t.name}</span></div>{t.demo}</div>
                <small>{t.status}</small>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Customer results ─────────────────────────────────────────────── */
export type ResultCard = { slug?: string; name: string; city: string; logo?: string | null; color: string; figure?: string; figureLabel?: string; line: string; note?: string };
export function Results({ stats, cards }: { stats: { n: number; label: string }[]; cards: ResultCard[] }) {
  const [on, setOn] = useState(0);
  const [hover, setHover] = useState(false);
  const total = cards.length;
  useEffect(() => {
    if (hover || reduced() || total < 2) return;
    const id = window.setInterval(() => setOn((v) => (v + 1) % total), 5600);
    return () => window.clearInterval(id);
  }, [hover, total]);
  return (
    <section className="s4-sec s7-res" aria-labelledby="res-title">
      <div className="s4-wrap">
        <h2 id="res-title" className="sr-only">Customer results</h2>
        <div className="s7-res-stats">
          {stats.map((s) => <div key={s.label}><b><CountUp n={s.n} /></b><small>{s.label}</small></div>)}
          <Link href="/customers" className="s7-link">Read customer stories <ArrowRight size={18} aria-hidden /></Link>
        </div>
        <div className="s7-res-row" onMouseLeave={() => setHover(false)}>
          {cards.map((c, i) => (
            <article key={c.name} className={`s7-rc${on === i ? " is-on" : ""}`} style={{ ["--c" as string]: c.color }} onMouseEnter={() => { setHover(true); setOn(i); }} onFocus={() => setOn(i)} tabIndex={0}>
              <div className="s7-rc-open" hidden={on !== i}>
                <div className="s7-rc-copy">
                  {c.logo ? <span className="s7-rc-logo">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={c.logo} alt={`${c.name} logo`} /></span> : <span className="s7-rc-name">{c.name}</span>}
                  {c.figure && <p className="s7-rc-fig"><b>{c.figure}</b>{c.figureLabel}</p>}
                  <p className="s7-rc-line">{c.line}</p>
                  {c.note && <small>{c.note}</small>}
                  {c.slug ? <Link href={`/customers/${c.slug}`} className="s7-link is-light">Read case study <ChevronRight size={16} aria-hidden /></Link> : <span className="s7-rc-city"><MapPin size={13} aria-hidden /> {c.city}</span>}
                </div>
                <div className="s7-rc-art" aria-hidden><RecordArt name={c.name} city={c.city} /></div>
              </div>
              <div className="s7-rc-closed" hidden={on === i}>
                {c.logo ? <span className="s7-rc-logo is-s">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={c.logo} alt="" /></span> : null}
                <b>{c.name}</b><small>{c.city}</small>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
function RecordArt({ name, city }: { name: string; city: string }) {
  return (
    <div className="s7-rec-art">
      <p className="s7-cap">{name} · {city}</p>
      {[[<Users key="u" size={13} />, "Animal register", "one record per animal"], [<Stethoscope key="s" size={13} />, "Treatment history", "with the vet's name"], [<MapIcon key="m" size={13} />, "Capture and release", "placed on the map"], [<ClipboardList key="c" size={13} />, "Reports", "built from the records"], [<ShieldCheck key="sh" size={13} />, "Provenance", "imported rows labelled"]].map(([i, a, b], k) => (
        <div key={k}><span>{i}</span><b>{a as string}</b><small>{b as string}</small></div>
      ))}
    </div>
  );
}

/* ── Closing: put Kaju to work, then common questions ─────────────── */
export function CloseAndQuestions({ faq }: { faq: [string, string][] }) {

  return (
    <section className="s7-close" aria-labelledby="close-title">
      <div className="s4-wrap">
        <div className="s7-q" role="region" aria-label="Common questions">
          <div className="s7-q-head">
            <h2 className="s4-h2">Common questions</h2>
            <p className="s7-q-more">Something else? <Link href="/contact">Ask us</Link></p>
          </div>
          <div className="s7-q-list">
            {faq.map(([q, a], i) => (
              <details key={q} className="s7-q-row" open={i === 0 || undefined}>
                <summary>{q}<ChevronRight size={18} aria-hidden /></summary>
                <div className="s7-q-a"><p>{a}</p></div>
              </details>
            ))}
          </div>
        </div>
        <div className="s7-close-card s4-close s7-close4">
          <Blueprint tone="dark" className="s7-c4-map" />
          <div className="s7-c4-copy">
            <h2 id="close-title">See it on your own records.</h2>
            <p>Bring last month&rsquo;s register. We&rsquo;ll show you what StrayPaw does with it.</p>
            <div className="s7-row"><Link href="/demo" className="s7-btn is-white is-primary">Book a demo</Link><Link href="/platform" className="s7-btn is-ghost">Explore the platform</Link></div>
          </div>
          <Link href="/our-story" className="s7-c4-art" aria-label="Our story: every animal deserves a record">
            <AliveLogo />
            <small>Every animal deserves a record.</small>
          </Link>
        </div>
      </div>
    </section>
  );
}
