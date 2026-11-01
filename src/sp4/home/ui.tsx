import type { ReactNode } from "react";
import {
  ArrowUp, Bell, Camera, Check, ChevronLeft, ClipboardCheck, Copy, FileCheck2, FileText, Home, Inbox, Landmark,
  ListChecks, MapPin, MessageCircle, Mic, Paperclip, Search, ShieldCheck, Sparkles, Stethoscope, TriangleAlert,
} from "lucide-react";
import { KajuFace } from "@/kaju/Kaju";

/* ════════════════════════════════════════════════════════════════════
   Product fragments: small, faithful StrayPaw screens for the website.
   Every record here is illustrative and every screen that carries them is
   labelled as a product demo where it is shown.
   ════════════════════════════════════════════════════════════════════ */

const Ok = () => <span className="s4-check" aria-hidden><Check size={10} strokeWidth={3} /></span>;
const Open = () => <span className="s4-check is-open" aria-hidden />;
const Warn = () => <span className="s4-check is-warn" aria-hidden><TriangleAlert size={9} strokeWidth={3} /></span>;
const Thumb = ({ n }: { n: number }) => <span className={`s4u-thumb t${n % 4}`} aria-hidden />;

/* ── the hero: the operator's workspace with a daily brief ───────── */
export function HeroWindow() {
  const mods: [string, string, ReactNode][] = [
    ["Intake", "flame", <Inbox key="i" size={11} />], ["Animals", "blue", <ListChecks key="a" size={11} />],
    ["Treatment", "teal", <Stethoscope key="t" size={11} />], ["Evidence", "amber", <Camera key="e" size={11} />],
    ["Review", "violet", <ClipboardCheck key="r" size={11} />], ["Reports", "green", <FileText key="p" size={11} />],
  ];
  return (
    <div className="s4u-win" role="group" aria-label="Product demo: an ABC operator's workspace and daily brief">
      <aside className="s4u-side" aria-hidden>
        <div className="s4u-org"><span className="s4u-orgmark">W</span><b>Ward 14 ABC Unit</b></div>
        <span className="s4u-quick">Quick actions <kbd>⌘K</kbd></span>
        <ul className="s4u-nav">
          <li className="is-on"><Home size={14} />Home</li>
          <li><Bell size={14} />Notifications<em>5</em></li>
          <li><ListChecks size={14} />Tasks</li>
          <li><MapPin size={14} />Field</li>
        </ul>
        <small>Modules</small>
        <ul className="s4u-nav">{mods.map(([l, c, i]) => <li key={l}><span className={`s4u-sq c-${c}`}>{i}</span>{l}</li>)}</ul>
        <small>Programmes</small>
        <ul className="s4u-nav is-plain"><li>ABC drive · Ward 14</li><li>ARV camp · Ward 9</li></ul>
      </aside>
      <div className="s4u-main">
        <div className="s4u-tabs" aria-hidden><span className="is-on">Home</span><span>+</span></div>
        <div className="s4u-banner">Product demo · illustrative records, not live programme data</div>
        <div className="s4u-brief">
          <div className="s4u-brief-in">
            <p className="s4u-hello">Good morning, Anita.<span>Here is today&apos;s programme brief.</span></p>
            <p className="s4u-since">Since yesterday: <b>18 animals</b> were released in Ward 14, <b>3 records</b> are missing a release photo, and <b>1 possible duplicate</b> needs a decision before Friday&apos;s report package goes to the <b>reviewing office</b>.</p>
            <p className="s4u-h">Recent activity</p>
            <ul className="s4u-list">
              <li><span className="s4u-sq c-flame"><MessageCircle size={11} /></span><span><b>Pickup request from the field</b><small>Brown female, limping · Ward 14 market · 07:42</small></span><span className="s4-tag is-amber">Draft · review</span></li>
              <li><span className="s4u-sq c-teal"><Stethoscope size={11} /></span><span><b>Dr. Rao authorised 12 sterilisations</b><small>Surgery list, 30 Oct · all ear-notched</small></span><span className="s4-tag is-green">Vet-authorised</span></li>
              <li><span className="s4u-sq c-amber"><Camera size={11} /></span><span><b>3 records missing a release photo</b><small>SP-1031 · SP-1044 · SP-1067</small></span><span className="s4-tag">Evidence</span></li>
              <li><span className="s4u-sq c-violet"><Copy size={11} /></span><span><b>Possible duplicate</b><small>SP-1042 and SP-1067 · same ward, 2 days apart</small></span><span className="s4-tag is-violet">Check</span></li>
            </ul>
            <div className="s4u-ask"><KajuFace size={18} /><span>Ask Kaju to prepare Friday&apos;s report package…</span><span className="s4u-ask-go"><ArrowUp size={13} /></span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroPhone() {
  return (
    <div className="s4u-phone" role="group" aria-label="Product demo: a field message becoming a draft record (WhatsApp not connected in production)">
      <div className="s4u-phone-top"><ChevronLeft size={14} /><span className="s4u-av">W</span><span><b>Ward 14 field line</b><small>WhatsApp · demo</small></span></div>
      <div className="s4u-thread">
        <p className="s4u-msg is-in">Brown female near the market gate, limping on the back left leg. Not ear-notched.<span className="s4u-time">07:41</span></p>
        <p className="s4u-msg is-in is-photo"><Thumb n={1} /><Thumb n={2} /><span className="s4u-time">07:41</span></p>
        <div className="s4u-msg is-out">
          <b><Sparkles size={11} /> Draft record prepared</b>
          <dl><dt>Sex</dt><dd>Female</dd><dt>Ear notch</dt><dd>None</dd><dt>Condition</dt><dd>Limping, back left</dd><dt>Place</dt><dd>Ward 14 · market gate</dd></dl>
          <small>Waiting for operator review</small>
        </div>
      </div>
      <div className="s4u-phone-bar"><Paperclip size={13} /><span>Message</span><Mic size={13} /></div>
    </div>
  );
}

/* ── the workflow, one fragment per step ─────────────────────────── */
/* Each fragment has content variants (v) so no demo repeats across the site.
   The homepage hero owns the Ward 14 / Anita story; other places use theirs. */
const CAPTURE = [
  { ward: "Ward 14", sex: "Female", coat: "Brown, white chest", place: "Ward 14 · market gate", by: "Captured by Ravi · 07:52 · GPS ±8 m", t: [0, 1, 2] },
  { ward: "Ward 9", sex: "Male", coat: "Black, tan legs", place: "Ward 9 · mill road", by: "Captured by Meena · 06:40 · GPS ±5 m", t: [1, 3, 0] },
  { ward: "Ward 22", sex: "Female", coat: "Cream, one ear down", place: "Ward 22 · bus depot", by: "Captured by Suresh · 08:15 · GPS ±11 m", t: [2, 0, 3] },
];
export function CaptureUi({ v = 0 }: { v?: number }) {
  const c = CAPTURE[v % CAPTURE.length];
  return (
    <div className="s4-ui s4u-frag" style={{ width: 440 }}>
      <div className="s4-ui-pad s4u-head"><span className="s4-ui-title">New animal · {c.ward}</span><span className="s4-tag is-blue">Operator-created</span></div>
      <div className="s4-ui-pad s4u-form">
        <div className="s4u-thumbs">{c.t.map((n) => <Thumb key={n} n={n} />)}<span className="s4u-add"><Camera size={14} /></span></div>
        <div className="s4u-fields">
          <label>Sex<span>{c.sex}</span></label><label>Coat<span>{c.coat}</span></label>
          <label>Ear notch<span>None</span></label><label>Location<span><MapPin size={11} /> {c.place}</span></label>
        </div>
        <div className="s4u-foot"><small>{c.by}</small><span className="s4u-btn">Save to intake</span></div>
      </div>
    </div>
  );
}

const VET = [
  { id: "SP-1067", proc: "Ovariohysterectomy", notch: "Right ear", arv: "Batch on file", post: "Due Thu, 2 Nov", vet: "Dr. S. Rao" },
  { id: "SP-0918", proc: "Orchiectomy", notch: "Left ear", arv: "Batch AR-2207", post: "Due Mon, 6 Nov", vet: "Dr. K. Menon" },
  { id: "SP-2231", proc: "Ovariohysterectomy", notch: "Right ear", arv: "Batch AR-2214", post: "Due Fri, 10 Nov", vet: "Dr. P. Thomas" },
];
export function VetUi({ v = 0 }: { v?: number }) {
  const c = VET[v % VET.length];
  return (
    <div className="s4-ui s4u-frag" style={{ width: 420 }}>
      <div className="s4-ui-pad s4u-head"><span className="s4-ui-title">Sterilisation · {c.id}</span><span className="s4-tag is-solid">Vet</span></div>
      <ul className="s4-ui-pad s4u-checks">
        <li><Ok />Pre-operative check<em>Fit for surgery</em></li>
        <li><Ok />Procedure<em>{c.proc}</em></li>
        <li><Ok />Ear notch<em>{c.notch}</em></li>
        <li><Ok />Anti-rabies vaccination<em>{c.arv}</em></li>
        <li><Open />Post-operative check<em>{c.post}</em></li>
      </ul>
      <div className="s4-ui-pad s4u-foot"><small>Authorised by {c.vet}, registered veterinarian</small><span className="s4u-btn is-teal"><Stethoscope size={12} /> Authorise</span></div>
    </div>
  );
}

const EVID = [
  { id: "SP-1067", miss: "Release photo", place: "Ward 14 · 31 Oct", note: "Release must match the capture ward", act: "Request from field team" },
  { id: "SP-0931", miss: "Ear-notch photo", place: "Ward 9 · 3 Nov", note: "The notch must be visible in its own photo", act: "Ask the vet team" },
  { id: "SP-2245", miss: "Surgery record", place: "Ward 22 · 4 Nov", note: "No authorisation without the surgery record", act: "Upload the record" },
];
const EVID_ITEMS = ["Capture photo", "Surgery record", "Ear-notch photo", "Release photo"];
export function EvidenceUi({ v = 0 }: { v?: number }) {
  const c = EVID[v % EVID.length];
  return (
    <div className="s4-ui s4u-frag" style={{ width: 430 }}>
      <div className="s4-ui-pad s4u-head"><span className="s4-ui-title">Evidence · {c.id}</span><span className="s4-tag is-amber">4 of 5</span></div>
      <ul className="s4-ui-pad s4u-checks">
        {EVID_ITEMS.map((x, i) => x === c.miss
          ? <li key={x}><Warn />{x}<em className="is-warn">Missing</em></li>
          : <li key={x}><Ok />{x}<em><Thumb n={[0, 3, 2, 1][i]} /></em></li>)}
        <li><Ok />Release location<em>{c.place}</em></li>
      </ul>
      <div className="s4-ui-pad s4u-foot"><small>{c.note}</small><span className="s4u-btn is-line">{c.act}</span></div>
    </div>
  );
}

const DUPE = [
  { a: ["SP-1042", "28 Oct", 1], b: ["SP-1067", "30 Oct", 2], who: "Female · brown", why: ["Same ward, two days apart", "Similar coat and size", "Only one has a surgery record"] },
  { a: ["SP-0904", "1 Nov", 3], b: ["SP-0927", "2 Nov", 0], who: "Male · black, tan legs", why: ["Caught 300 m apart", "Same scar on the left flank", "Both already ear-notched"] },
];
export function DuplicateUi({ v = 0 }: { v?: number }) {
  const c = DUPE[v % DUPE.length];
  return (
    <div className="s4-ui s4u-frag" style={{ width: 460 }}>
      <div className="s4-ui-pad s4u-head"><span className="s4-ui-title">Possible duplicate</span><span className="s4-tag is-violet">Check</span></div>
      <div className="s4-ui-pad s4u-dupe">
        {[c.a, c.b].map(([id, d, n]) => (
          <div key={id as string}><Thumb n={n as number} /><b>{id}</b><small>{c.who} · {d}</small></div>
        ))}
      </div>
      <ul className="s4-ui-pad s4u-reasons">{c.why.map((w) => <li key={w}>{w}</li>)}</ul>
      <div className="s4-ui-pad s4u-foot"><span className="s4u-btn is-line">Different animals</span><span className="s4u-btn">Same animal: merge</span></div>
    </div>
  );
}

const REVIEW: { title: string; rows: [string, string, string, string][]; foot: string }[] = [
  { title: "Operator review · Ward 14 · week 44", foot: "3 exceptions open · 15 records ready", rows: [
    ["SP-1031", "Released", "Release photo", "amber"], ["SP-1038", "Released", "Complete", "green"], ["SP-1042", "Duplicate?", "Decision", "violet"],
    ["SP-1051", "Released", "Complete", "green"], ["SP-1067", "Post-op", "Release photo", "amber"]] },
  { title: "Operator review · Ward 9 · week 45", foot: "2 exceptions open · 21 records ready", rows: [
    ["SP-0904", "Duplicate?", "Decision", "violet"], ["SP-0912", "Released", "Complete", "green"], ["SP-0918", "Post-op", "Complete", "green"],
    ["SP-0931", "Released", "Ear-notch photo", "amber"], ["SP-0940", "Released", "Complete", "green"]] },
];
export function ReviewUi({ v = 0 }: { v?: number }) {
  const r = REVIEW[v % REVIEW.length], rows = r.rows;
  return (
    <div className="s4-ui s4u-frag" style={{ width: 480 }}>
      <div className="s4-ui-pad s4u-head"><span className="s4-ui-title">{r.title}</span></div>
      <table className="s4u-table">
        <thead><tr><th>Animal</th><th>Stage</th><th>Evidence</th></tr></thead>
        <tbody>{rows.map(([a, s, e, c]) => <tr key={a}><td>{a}</td><td>{s}</td><td><span className={`s4-tag is-${c}`}>{e}</span></td></tr>)}</tbody>
      </table>
      <div className="s4-ui-pad s4u-foot"><small>{r.foot}</small><span className="s4u-btn is-off">Approve for report</span></div>
    </div>
  );
}

const REPORT = [
  { t: "Report package · Ward 14 · October", tag: ["Ready", "green"], k: [142, 139, 131], ev: 655, ex: "4, each explained", foot: "PDF and XLSX · every figure links to its records", btn: "Send for review" },
  { t: "Report package · Ward 9 · October", tag: ["Draft", "amber"], k: [98, 97, 90], ev: 446, ex: "2 waiting for the coordinator", foot: "Built from approved records only", btn: "Finish review" },
  { t: "Monthly package · Zone 3 · October", tag: ["Ready", "green"], k: [345, 338, 314], ev: 1561, ex: "7, each explained", foot: "Four wards, one package for the office", btn: "Send for review" },
  { t: "Package received · Ward 22 · October", tag: ["Submitted", "blue"], k: [61, 58, 52], ev: 271, ex: "3 open, 1 answered", foot: "Read-only for the reviewing office", btn: "Open package" },
  { t: "Quarterly report · Zone 3 · Q3", tag: ["Ready", "green"], k: [1012, 990, 941], ev: 4620, ex: "19, all closed", foot: "Method and sources attached", btn: "Download" },
  { t: "ARV camp report · Ward 5 · 29 Oct", tag: ["Ready", "green"], k: [0, 212, 0], ev: 212, ex: "1 dose batch to confirm", foot: "One record per vaccinated animal", btn: "Send for review" },
];
export function ReportUi({ v = 0 }: { v?: number }) {
  const c = REPORT[v % REPORT.length];
  const arvOnly = c.k[0] === 0;
  return (
    <div className="s4-ui s4u-frag" style={{ width: 450 }}>
      <div className="s4-ui-pad s4u-head"><span className="s4-ui-title">{c.t}</span><span className={`s4-tag is-${c.tag[1]}`}>{c.tag[0]}</span></div>
      <div className="s4-ui-pad s4u-kpis">{arvOnly
        ? <><div><b>{c.k[1]}</b><small>vaccinated</small></div><div><b>{c.k[1]}</b><small>with batch</small></div><div><b>1</b><small>to confirm</small></div></>
        : <><div><b>{c.k[0].toLocaleString("en-IN")}</b><small>sterilised</small></div><div><b>{c.k[1].toLocaleString("en-IN")}</b><small>vaccinated</small></div><div><b>{c.k[2].toLocaleString("en-IN")}</b><small>released</small></div></>}</div>
      <ul className="s4-ui-pad s4u-files">
        <li><FileText size={13} />{arvOnly ? "Doses by street and hour" : "Summary by ward and week"}</li>
        <li><FileCheck2 size={13} />Evidence index · {c.ev.toLocaleString("en-IN")} items</li>
        <li><Stethoscope size={13} />{arvOnly ? "Vaccinator sign-offs" : `Vet authorisations · ${c.k[0].toLocaleString("en-IN")}`}</li>
        <li><TriangleAlert size={13} />Exceptions log · {c.ex}</li>
      </ul>
      <div className="s4-ui-pad s4u-foot"><small>{c.foot}</small><span className="s4u-btn">{c.btn}</span></div>
    </div>
  );
}

const GOV = [
  { t: "Ward 14 ABC · October package", s: "Submitted by Ward 14 ABC Unit · 1 Nov", a: "142 sterilisations, each vet-authorised", b: "Evidence index complete for 138 animals", c: "4 exceptions, explained by the operator" },
  { t: "Ward 9 ABC · October package", s: "Submitted by Ward 9 ABC Unit · 2 Nov", a: "98 sterilisations, each vet-authorised", b: "Evidence index complete for 96 animals", c: "1 query answered, 1 still open" },
  { t: "Zone 3 ARV camp · 29 October", s: "Submitted by the Zone 3 vaccination team · 30 Oct", a: "212 anti-rabies doses, batch recorded", b: "Street-level list for every dose", c: "1 batch number to confirm" },
];
export function GovUi({ v = 0 }: { v?: number }) {
  const c = GOV[v % GOV.length];
  return (
    <div className="s4-ui s4u-frag" style={{ width: 450 }}>
      <div className="s4-ui-pad s4u-head"><span className="s4u-gov"><Landmark size={13} /> Reviewing office</span><span className="s4-tag">Read-only</span></div>
      <div className="s4-ui-pad"><p className="s4-ui-title">{c.t}</p><p className="s4-ui-sub" style={{ marginTop: 4 }}>{c.s}</p></div>
      <ul className="s4-ui-pad s4u-checks">
        <li><Ok />{c.a}</li>
        <li><Ok />{c.b}</li>
        <li><Warn />{c.c}</li>
      </ul>
      <div className="s4-ui-pad s4u-foot"><span className="s4u-btn is-line">Return with a query</span><span className="s4u-btn is-ink"><ShieldCheck size={12} /> Accept package</span></div>
    </div>
  );
}

/* ── Kaju fragments ───────────────────────────────────────── */
const ASK: { who: string; q: string; a: ReactNode; tool: string }[] = [
  { who: "Anita", q: "How many Ward 14 releases this week lack a release photo?", a: <>Three of eighteen: <u>SP-1031</u>, <u>SP-1044</u> and <u>SP-1067</u>. All three were released on 31 Oct by the same team.</>, tool: "find_missing_evidence · 18 records read" },
  { who: "Meena", q: "Which Ward 9 dogs still need their second anti-rabies dose?", a: <>Seven are due before 12 Nov. The first two are <u>SP-0912</u> and <u>SP-0918</u>; all seven were caught near the mill road.</>, tool: "work_summary · 97 records read" },
  { who: "Dr. Menon", q: "How many surgeries did I sign in October, and are any missing a record?", a: <>You signed 61. One, <u>SP-2245</u>, has no surgery record attached yet, so it is held out of the package.</>, tool: "find_missing_evidence · 61 records read" },
  { who: "Suresh", q: "Summarise what the Ward 22 team did yesterday.", a: <>Nine captures, six surgeries and four releases. <u>SP-2231</u> is waiting for its post-operative check.</>, tool: "work_summary · 19 records read" },
  { who: "Anita", q: "Which programme has the lowest evidence completion this month?", a: <>Ward 22 at 79%. Most gaps are release photos from the bus-depot drive on <u>4 Nov</u>.</>, tool: "programme_report · 4 programmes read" },
];
export function AskUi({ v = 0 }: { v?: number }) {
  const c = ASK[v % ASK.length];
  return (
    <div className="s4-ui s4u-frag" style={{ width: 470 }}>
      <div className="s4-ui-pad"><p className="s4u-q"><span>{c.who}</span>{c.q}</p></div>
      <div className="s4-ui-pad s4u-a"><span className="s4u-ai is-kaju"><KajuFace size={18} /></span><p>{c.a}<small><Search size={10} /> {c.tool}</small></p></div>
    </div>
  );
}
const PROPOSE = [
  { t: "Schedule post-op check", s: "SP-1067 · Thursday, 2 Nov · assigned to Ravi" },
  { t: "Open a case: injured dog", s: "Ward 9 · mill road · severity high · from a resident's report" },
  { t: "Add a treatment note", s: "Mange case · day 6 of 14 · skin improving, continue dips" },
];
export function ProposeUi({ v = 0 }: { v?: number }) {
  const c = PROPOSE[v % PROPOSE.length];
  return (
    <div className="s4-ui s4u-frag" style={{ width: 400 }}>
      <div className="s4-ui-pad s4u-head"><span className="s4u-ai-lab"><KajuFace size={16} /> Prepared by Kaju</span></div>
      <div className="s4-ui-pad"><p className="s4-ui-title">{c.t}</p><p className="s4-ui-sub" style={{ marginTop: 4 }}>{c.s}</p></div>
      <div className="s4-ui-pad s4u-foot"><small>Saved only when you confirm</small><span className="s4u-btn">Confirm</span></div>
    </div>
  );
}
const OVERNIGHT: { h: string; rows: [string, string][] }[] = [
  { h: "Week 44 · before the report", rows: [["09:02", "Read 164 Ward 14 records"], ["09:02", "Found 3 missing release photos"], ["09:03", "Flagged 1 possible duplicate"], ["09:03", "Drafted the weekly summary"]] },
  { h: "Ward 9 · Monday check", rows: [["08:30", "Read 97 vaccination records"], ["08:30", "Found 7 second doses due"], ["08:31", "Flagged 2 dogs caught twice"], ["08:31", "Drafted reminders for the field team"]] },
  { h: "Zone 3 · month end", rows: [["17:10", "Read 345 procedures in 4 wards"], ["17:11", "Found 6 surgeries without a record"], ["17:11", "Listed 7 releases outside their ward"], ["17:12", "Prepared the package checklist"]] },
];
export function OvernightUi({ v = 0 }: { v?: number }) {
  const c = OVERNIGHT[v % OVERNIGHT.length];
  return (
    <div className="s4-ui s4u-frag" style={{ width: 340 }}>
      <div className="s4-ui-pad"><p className="s4-ui-sub">{c.h}</p>
        <ul className="s4u-times">
          {c.rows.map(([t, x]) => <li key={x}><Ok /><time>{t}</time>{x}</li>)}
        </ul>
      </div>
    </div>
  );
}
const EXTRACT = [
  { m: "brown female near market gate, limping back left, no notch", sex: "Female", cond: "Limping", place: "Market gate" },
  { m: "black male pup outside the school on 4th cross, very thin, maybe 3 months", sex: "Male · puppy", cond: "Underweight", place: "School, 4th cross" },
  { m: "released the 3 from yesterday back at the temple lane, all notched", sex: "3 animals", cond: "Released, notched", place: "Temple lane" },
  { m: "cream dog with a wound on the neck near the bus depot, friendly", sex: "Not given", cond: "Neck wound", place: "Bus depot" },
];
export function ExtractUi({ v = 0 }: { v?: number }) {
  const c = EXTRACT[v % EXTRACT.length];
  return (
    <div className="s4-ui s4u-frag" style={{ width: 340 }}>
      <div className="s4-ui-pad"><p className="s4u-wa">&ldquo;{c.m}&rdquo;</p>
        <dl className="s4u-dl"><dt>Animal</dt><dd>{c.sex}</dd><dt>Condition</dt><dd>{c.cond}</dd><dt>Place</dt><dd>{c.place}</dd></dl>
      </div>
    </div>
  );
}
export function RingUi() {
  const p = 86, r = 52, c = 2 * Math.PI * r;
  return (
    <div className="s4-ui s4u-frag s4u-ring" style={{ width: 190 }}>
      <svg viewBox="0 0 128 128" width="128" height="128" aria-hidden><circle cx="64" cy="64" r={r} fill="none" stroke="#e7e9ef" strokeWidth="10" /><circle cx="64" cy="64" r={r} fill="none" stroke="var(--s4-blue)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(p / 100) * c} ${c}`} transform="rotate(-90 64 64)" /></svg>
      <b>{p}%</b><small>evidence complete</small>
    </div>
  );
}

/* ── the AI configuration panel for the dark band ────────────────── */
export function AiToolsUi({ active, org = "Kaju · Ward 14 ABC Unit" }: { active: number; org?: string }) {
  const tools = ["Search records", "Work summary", "Missing evidence", "Possible duplicates", "Programme report", "Read field message", "Propose a case", "Propose a note", "Propose a follow-up", "Propose care"];
  const uses: number[][] = [[2, 0], [3, 0], [4, 1, 0], [5, 6]];
  const on = new Set(uses[active] ?? []);
  return (
    <div className="s4-ui s4u-cfg">
      <div className="s4-ui-pad s4u-head"><span className="s4-ui-title">{org}</span><span className="s4-tag is-green">Your permissions</span></div>
      <div className="s4-ui-pad">
        <p className="s4u-cfg-h">What happens to changes?</p>
        <div className="s4u-radio">
          <div className="is-on"><span /><b>Prepared, then confirmed</b><small>A person confirms every change</small></div>
          <div><span /><b>Read only</b><small>Answers with citations</small></div>
          <div className="is-off"><span /><b>Approve on its own</b><small>Not possible in StrayPaw</small></div>
        </div>
        <p className="s4u-cfg-h">What can Kaju use?</p>
        <div className="s4u-chips">{tools.map((t, i) => <span key={t} className={on.has(i) ? "is-on" : ""}>{t}</span>)}</div>
        <p className="s4u-cfg-h">Every answer</p>
        <div className="s4u-chips is-quiet"><span>Cites the records it read</span><span>Reads only what you can read</span><span>Logged with the confirmer&apos;s name</span></div>
      </div>
    </div>
  );
}

/* ── a compact app window for inner-page heroes ──────────────────── */
export function MiniWindow({ title, active = 0, children, label }: { title: string; active?: number; children: ReactNode; label: string }) {
  const mods: [string, string][] = [["Intake", "flame"], ["Animals", "blue"], ["Treatment", "teal"], ["Evidence", "amber"], ["Review", "violet"], ["Reports", "green"]];
  return (
    <div className="s4u-mini" role="group" aria-label={`Product demo: ${label}`}>
      <div className="s4u-mini-bar" aria-hidden><i /><i /><i /><span>{title}</span></div>
      <div className="s4u-mini-body">
        <aside aria-hidden>
          <div className="s4u-org"><span className="s4u-orgmark">W</span><b>Ward 14 ABC Unit</b></div>
          <ul className="s4u-nav">{mods.map(([l, c], n) => <li key={l} className={n === active ? "is-on" : ""}><span className={`s4u-sq c-${c}`} />{l}</li>)}</ul>
        </aside>
        <div className="s4u-mini-main">{children}</div>
      </div>
    </div>
  );
}

const PROGRAMME: { h: string; sub: string; k: number[]; rows: [string, number, number, number, string][] }[] = [
  { h: "ABC drive · October", sub: "4 wards · 2 vets · 11 field staff", k: [345, 338, 314, 7], rows: [["Ward 14", 142, 139, 131, "92%"], ["Ward 9", 98, 97, 90, "88%"], ["Ward 22", 61, 58, 52, "79%"], ["Ward 3", 44, 44, 41, "95%"]] },
  { h: "ABC + ARV · Zone 5 · September", sub: "3 wards · 1 vet · 8 field staff", k: [188, 251, 176, 4], rows: [["Ward 5", 74, 112, 70, "94%"], ["Ward 6", 63, 81, 58, "86%"], ["Ward 11", 51, 58, 48, "90%"]] },
];
export function ProgrammeUi({ v = 0 }: { v?: number }) {
  const pg = PROGRAMME[v % PROGRAMME.length], rows = pg.rows;
  return (
    <div className="s4u-pg">
      <div className="s4u-pg-head"><div><b>{pg.h}</b><small>{pg.sub}</small></div><span className="s4-tag is-green">On track</span></div>
      <div className="s4u-kpis is-4"><div><b>{pg.k[0]}</b><small>sterilised</small></div><div><b>{pg.k[1]}</b><small>vaccinated</small></div><div><b>{pg.k[2]}</b><small>released</small></div><div><b>{pg.k[3]}</b><small>exceptions</small></div></div>
      <table className="s4u-table"><thead><tr><th>Ward</th><th>Sterilised</th><th>Vaccinated</th><th>Released</th><th>Evidence</th></tr></thead>
        <tbody>{rows.map(([w, a, b, c, e]) => <tr key={w}><td>{w}</td><td>{a}</td><td>{b}</td><td>{c}</td><td><span className="s4u-bar"><i style={{ width: e }} /></span>{e}</td></tr>)}</tbody></table>
    </div>
  );
}

const QUEUE: [string, string, string, string][][] = [
  [["Pickup · market gate", "Field draft", "Review", "amber"], ["SP-1067 post-op check", "Due Thu", "Follow-up", "blue"], ["SP-1042 / SP-1067", "Possible duplicate", "Decide", "violet"], ["SP-1031 release photo", "Evidence gap", "Request", "amber"], ["Injured dog · Ward 9", "Community report", "Triage", "flame"]],
  [["Ward 3 capture day", "12 animals · 2 vans", "Plan", "blue"], ["SP-3110 surgery record", "Evidence gap", "Upload", "amber"], ["October package · Ward 3", "4 records to review", "Review", "violet"], ["New volunteer · Kavya", "Access request", "Approve", "blue"], ["Feeder report · park gate", "Community report", "Triage", "flame"]],
  [["Pup outside the school · 4th cross", "Field message draft", "Review", "amber"], ["Released 3 · temple lane", "Field message draft", "Review", "amber"], ["Neck wound · bus depot", "Field message draft", "Triage", "flame"], ["SP-0918 second dose", "Due Mon", "Follow-up", "blue"], ["SP-0904 / SP-0927", "Possible duplicate", "Decide", "violet"]],
];
export function QueueUi({ v = 0 }: { v?: number }) {
  const rows = QUEUE[v % QUEUE.length];
  return (
    <div className="s4u-pg">
      <div className="s4u-pg-head"><div><b>Today</b><small>{rows.length} things need someone</small></div><span className="s4u-btn is-line">Assign</span></div>
      <ul className="s4u-q-list">{rows.map(([a, b, c, t]) => <li key={a}><span><b>{a}</b><small>{b}</small></span><span className={`s4-tag is-${t}`}>{c}</span></li>)}</ul>
    </div>
  );
}

const AUDIT: { h: string; rows: [string, string, string][] }[] = [
  { h: "Audit history", rows: [["10:42", "Dr. S. Rao", "authorised sterilisation · SP-1067"], ["10:15", "Anita (coordinator)", "marked SP-1042 and SP-1067 as different animals"], ["09:58", "Kaju → Anita", "follow-up prepared, confirmed by Anita"], ["09:31", "Ravi (field)", "created SP-1071 · operator-created"], ["Yesterday", "Import", "2,188 rows · historical imported record"]] },
  { h: "Case history · RC-0412", rows: [["16:20", "Dr. K. Menon", "changed the dressing; wound clean"], ["14:05", "Kaju → Priya", "treatment note prepared, confirmed by Priya"], ["11:40", "Priya (rescue)", "moved to in treatment"], ["08:10", "Meena (field)", "admitted · hit by vehicle, Ward 9"], ["07:52", "Resident", "reported from the public page"]] },
  { h: "Access history", rows: [["Today", "Anita (lead)", "made Dr. Menon a veterinarian"], ["Today", "Reviewing office", "opened the Ward 14 package"], ["Mon", "Anita (lead)", "removed a field volunteer's access"], ["Mon", "Ravi (field)", "uploaded 3 evidence photos · private"], ["Sun", "Import", "Kind Hour register · labelled historical"]] },
];
export function AuditUi({ v = 0 }: { v?: number }) {
  const a = AUDIT[v % AUDIT.length], rows = a.rows;
  return (
    <div className="s4u-pg">
      <div className="s4u-pg-head"><div><b>{a.h}</b><small>Every change, who made it and when</small></div><span className="s4-tag">Read-only</span></div>
      <ul className="s4u-audit">{rows.map(([t, w, d]) => <li key={t + d}><time>{t}</time><span><b>{w}</b> {d}</span></li>)}</ul>
    </div>
  );
}

export function PackageListUi() {
  const rows: [string, string, string, string][] = [["Ward 14 ABC Unit", "October package", "Accepted", "green"], ["Ward 9 ARV camp", "October package", "Query open", "amber"], ["Ward 22 ABC Unit", "October package", "Submitted", "blue"]];
  return (
    <div className="s4u-pg">
      <div className="s4u-pg-head"><div><b>Reviewing office · packages</b><small>Read-only view of operator submissions</small></div><span className="s4-tag">Reviewer</span></div>
      <ul className="s4u-q-list">{rows.map(([a, b, c, t]) => <li key={a}><span><b>{a}</b><small>{b}</small></span><span className={`s4-tag is-${t}`}>{c}</span></li>)}</ul>
    </div>
  );
}

export function RescueUi() {
  const rows: [string, string, string, string][] = [["Hit by vehicle · Ward 9", "Severe · admitted 08:10", "In treatment", "flame"], ["Mange, skin infection", "Treatment day 6 of 14", "Ongoing", "blue"], ["Puppy, dehydrated", "Discharged to feeder", "Follow-up", "teal"], ["Distemper suspected", "Isolation ward", "Monitoring", "amber"]];
  return (
    <div className="s4u-pg">
      <div className="s4u-pg-head"><div><b>Rescue cases</b><small>Requests, treatment and follow-ups</small></div><span className="s4u-btn">New case</span></div>
      <ul className="s4u-q-list">{rows.map(([a, b, c, t]) => <li key={a}><span><b>{a}</b><small>{b}</small></span><span className={`s4-tag is-${t}`}>{c}</span></li>)}</ul>
    </div>
  );
}

/* ── Kaju running a check, for the dark band ────────────────────────
   One run per job: what was asked, the steps Kaju took (with the tool
   each used), what it found, and the change it prepared for a person. */
export type KajuRun = { who: string; ask: string; scope: string; steps: [string, string][]; found: string[]; prepared: string; by: string };
export function KajuRunUi({ run, k }: { run: KajuRun; k: string | number }) {
  return (
    <div className="s4-ui s4u-run" key={k}>
      <div className="s4-ui-pad s4u-head"><span className="s4u-ai-lab"><KajuFace size={18} /> Kaju</span><span className="s4-tag">{run.scope}</span></div>
      <div className="s4-ui-pad"><p className="s4u-q"><span>{run.who}</span>{run.ask}</p></div>
      <ol className="s4-ui-pad s4u-run-steps">
        {run.steps.map(([tool, out], i) => <li key={tool + i} style={{ ["--i" as string]: i }}><Ok /><span><b>{out}</b><code>{tool}</code></span></li>)}
      </ol>
      <div className="s4-ui-pad s4u-run-found" style={{ ["--i" as string]: run.steps.length }}>
        <p className="s4u-cfg-h">Found</p>
        <div className="s4u-chips">{run.found.map((f) => <span key={f} className="is-on">{f}</span>)}</div>
      </div>
      <div className="s4-ui-pad s4u-foot s4u-run-prep" style={{ ["--i" as string]: run.steps.length + 1 }}>
        <small><b>Prepared:</b> {run.prepared}</small><span className="s4u-btn">Confirm</span>
      </div>
      <p className="s4u-run-by">{run.by}</p>
    </div>
  );
}
