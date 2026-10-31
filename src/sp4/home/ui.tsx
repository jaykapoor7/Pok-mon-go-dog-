import type { ReactNode } from "react";
import {
  ArrowUp, Bell, Camera, Check, ChevronLeft, ClipboardCheck, Copy, FileCheck2, FileText, Home, Inbox, Landmark,
  ListChecks, MapPin, MessageCircle, Mic, Paperclip, Search, ShieldCheck, Sparkles, Stethoscope, TriangleAlert,
} from "lucide-react";

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
            <p className="s4u-h">While you were out</p>
            <ul className="s4u-list">
              <li><span className="s4u-sq c-flame"><MessageCircle size={11} /></span><span><b>Pickup request from the field</b><small>Brown female, limping · Ward 14 market · 07:42</small></span><span className="s4-tag is-amber">Draft · review</span></li>
              <li><span className="s4u-sq c-teal"><Stethoscope size={11} /></span><span><b>Dr. Rao authorised 12 sterilisations</b><small>Surgery list, 30 Oct · all ear-notched</small></span><span className="s4-tag is-green">Vet-authorised</span></li>
              <li><span className="s4u-sq c-amber"><Camera size={11} /></span><span><b>3 records missing a release photo</b><small>SP-1031 · SP-1044 · SP-1067</small></span><span className="s4-tag">Evidence</span></li>
              <li><span className="s4u-sq c-violet"><Copy size={11} /></span><span><b>Possible duplicate</b><small>SP-1042 and SP-1067 · same ward, 2 days apart</small></span><span className="s4-tag is-violet">Check</span></li>
            </ul>
            <div className="s4u-ask"><Sparkles size={14} /><span>Ask StrayPaw AI to prepare Friday&apos;s report package…</span><span className="s4u-ask-go"><ArrowUp size={13} /></span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroPhone() {
  return (
    <div className="s4u-phone" role="group" aria-label="Product demo: a field message becoming a draft record">
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
export function CaptureUi() {
  return (
    <div className="s4-ui s4u-frag" style={{ width: 440 }}>
      <div className="s4-ui-pad s4u-head"><span className="s4-ui-title">New animal · Ward 14</span><span className="s4-tag is-blue">Operator-created</span></div>
      <div className="s4-ui-pad s4u-form">
        <div className="s4u-thumbs"><Thumb n={0} /><Thumb n={1} /><Thumb n={2} /><span className="s4u-add"><Camera size={14} /></span></div>
        <div className="s4u-fields">
          <label>Sex<span>Female</span></label><label>Coat<span>Brown, white chest</span></label>
          <label>Ear notch<span>None</span></label><label>Location<span><MapPin size={11} /> Ward 14 · market gate</span></label>
        </div>
        <div className="s4u-foot"><small>Captured by Ravi · 07:52 · GPS ±8 m</small><span className="s4u-btn">Save to intake</span></div>
      </div>
    </div>
  );
}

export function VetUi() {
  return (
    <div className="s4-ui s4u-frag" style={{ width: 420 }}>
      <div className="s4-ui-pad s4u-head"><span className="s4-ui-title">Sterilisation · SP-1067</span><span className="s4-tag is-solid">Vet</span></div>
      <ul className="s4-ui-pad s4u-checks">
        <li><Ok />Pre-operative check<em>Fit for surgery</em></li>
        <li><Ok />Procedure<em>Ovariohysterectomy</em></li>
        <li><Ok />Ear notch<em>Right ear</em></li>
        <li><Ok />Anti-rabies vaccination<em>Batch on file</em></li>
        <li><Open />Post-operative check<em>Due Thu, 2 Nov</em></li>
      </ul>
      <div className="s4-ui-pad s4u-foot"><small>Authorised by Dr. S. Rao, registered veterinarian</small><span className="s4u-btn is-teal"><Stethoscope size={12} /> Authorise</span></div>
    </div>
  );
}

export function EvidenceUi() {
  return (
    <div className="s4-ui s4u-frag" style={{ width: 430 }}>
      <div className="s4-ui-pad s4u-head"><span className="s4-ui-title">Evidence · SP-1067</span><span className="s4-tag is-amber">4 of 5</span></div>
      <ul className="s4-ui-pad s4u-checks">
        <li><Ok />Capture photo<em><Thumb n={0} /></em></li>
        <li><Ok />Surgery record<em><Thumb n={3} /></em></li>
        <li><Ok />Ear-notch photo<em><Thumb n={2} /></em></li>
        <li><Warn />Release photo<em className="is-warn">Missing</em></li>
        <li><Ok />Release location<em>Ward 14 · 31 Oct</em></li>
      </ul>
      <div className="s4-ui-pad s4u-foot"><small>Release must match the capture ward</small><span className="s4u-btn is-line">Request from field team</span></div>
    </div>
  );
}

export function DuplicateUi() {
  return (
    <div className="s4-ui s4u-frag" style={{ width: 460 }}>
      <div className="s4-ui-pad s4u-head"><span className="s4-ui-title">Possible duplicate</span><span className="s4-tag is-violet">Check</span></div>
      <div className="s4-ui-pad s4u-dupe">
        {[["SP-1042", "28 Oct", 1], ["SP-1067", "30 Oct", 2]].map(([id, d, n]) => (
          <div key={id as string}><Thumb n={n as number} /><b>{id}</b><small>Female · brown · {d}</small></div>
        ))}
      </div>
      <ul className="s4-ui-pad s4u-reasons"><li>Same ward, two days apart</li><li>Similar coat and size</li><li>Only one has a surgery record</li></ul>
      <div className="s4-ui-pad s4u-foot"><span className="s4u-btn is-line">Different animals</span><span className="s4u-btn">Same animal: merge</span></div>
    </div>
  );
}

export function ReviewUi() {
  const rows: [string, string, string, string][] = [
    ["SP-1031", "Released", "Release photo", "amber"], ["SP-1038", "Released", "Complete", "green"], ["SP-1042", "Duplicate?", "Decision", "violet"],
    ["SP-1051", "Released", "Complete", "green"], ["SP-1067", "Post-op", "Release photo", "amber"],
  ];
  return (
    <div className="s4-ui s4u-frag" style={{ width: 480 }}>
      <div className="s4-ui-pad s4u-head"><span className="s4-ui-title">Operator review · Ward 14 · week 44</span></div>
      <table className="s4u-table">
        <thead><tr><th>Animal</th><th>Stage</th><th>Evidence</th></tr></thead>
        <tbody>{rows.map(([a, s, e, c]) => <tr key={a}><td>{a}</td><td>{s}</td><td><span className={`s4-tag is-${c}`}>{e}</span></td></tr>)}</tbody>
      </table>
      <div className="s4-ui-pad s4u-foot"><small>3 exceptions open · 15 records ready</small><span className="s4u-btn is-off">Approve for report</span></div>
    </div>
  );
}

export function ReportUi() {
  return (
    <div className="s4-ui s4u-frag" style={{ width: 450 }}>
      <div className="s4-ui-pad s4u-head"><span className="s4-ui-title">Report package · Ward 14 · October</span><span className="s4-tag is-green">Ready</span></div>
      <div className="s4-ui-pad s4u-kpis"><div><b>142</b><small>sterilised</small></div><div><b>139</b><small>vaccinated</small></div><div><b>131</b><small>released</small></div></div>
      <ul className="s4-ui-pad s4u-files">
        <li><FileText size={13} />Summary by ward and week</li>
        <li><FileCheck2 size={13} />Evidence index · 655 items</li>
        <li><Stethoscope size={13} />Vet authorisations · 142</li>
        <li><TriangleAlert size={13} />Exceptions log · 4, each explained</li>
      </ul>
      <div className="s4-ui-pad s4u-foot"><small>PDF and XLSX · every figure links to its records</small><span className="s4u-btn">Send for review</span></div>
    </div>
  );
}

export function GovUi() {
  return (
    <div className="s4-ui s4u-frag" style={{ width: 450 }}>
      <div className="s4-ui-pad s4u-head"><span className="s4u-gov"><Landmark size={13} /> Reviewing office</span><span className="s4-tag">Read-only</span></div>
      <div className="s4-ui-pad"><p className="s4-ui-title">Ward 14 ABC · October package</p><p className="s4-ui-sub" style={{ marginTop: 4 }}>Submitted by Ward 14 ABC Unit · 1 Nov</p></div>
      <ul className="s4-ui-pad s4u-checks">
        <li><Ok />142 sterilisations, each vet-authorised</li>
        <li><Ok />Evidence index complete for 138 animals</li>
        <li><Warn />4 exceptions, explained by the operator</li>
      </ul>
      <div className="s4-ui-pad s4u-foot"><span className="s4u-btn is-line">Return with a query</span><span className="s4u-btn is-ink"><ShieldCheck size={12} /> Accept package</span></div>
    </div>
  );
}

/* ── StrayPaw AI fragments ───────────────────────────────────────── */
export function AskUi() {
  return (
    <div className="s4-ui s4u-frag" style={{ width: 470 }}>
      <div className="s4-ui-pad"><p className="s4u-q"><span>Anita</span>How many Ward 14 releases this week lack a release photo?</p></div>
      <div className="s4-ui-pad s4u-a"><span className="s4u-ai"><Sparkles size={11} /></span><p>Three of eighteen: <u>SP-1031</u>, <u>SP-1044</u> and <u>SP-1067</u>. All three were released on 31 Oct by the same team.<small><Search size={10} /> find_missing_evidence · 18 records read</small></p></div>
    </div>
  );
}
export function ProposeUi() {
  return (
    <div className="s4-ui s4u-frag" style={{ width: 400 }}>
      <div className="s4-ui-pad s4u-head"><span className="s4u-ai-lab"><Sparkles size={12} /> Prepared by StrayPaw AI</span></div>
      <div className="s4-ui-pad"><p className="s4-ui-title">Schedule post-op check</p><p className="s4-ui-sub" style={{ marginTop: 4 }}>SP-1067 · Thursday, 2 Nov · assigned to Ravi</p></div>
      <div className="s4-ui-pad s4u-foot"><small>Saved only when you confirm</small><span className="s4u-btn">Confirm</span></div>
    </div>
  );
}
export function OvernightUi() {
  return (
    <div className="s4-ui s4u-frag" style={{ width: 340 }}>
      <div className="s4-ui-pad"><p className="s4-ui-sub">Week 44 · before the report</p>
        <ul className="s4u-times">
          <li><Ok /><time>09:02</time>Read 164 Ward 14 records</li>
          <li><Ok /><time>09:02</time>Found 3 missing release photos</li>
          <li><Ok /><time>09:03</time>Flagged 1 possible duplicate</li>
          <li><Ok /><time>09:03</time>Drafted the weekly summary</li>
        </ul>
      </div>
    </div>
  );
}
export function ExtractUi() {
  return (
    <div className="s4-ui s4u-frag" style={{ width: 340 }}>
      <div className="s4-ui-pad"><p className="s4u-wa">&ldquo;brown female near market gate, limping back left, no notch&rdquo;</p>
        <dl className="s4u-dl"><dt>Sex</dt><dd>Female</dd><dt>Condition</dt><dd>Limping</dd><dt>Place</dt><dd>Market gate</dd></dl>
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
export function AiToolsUi({ active }: { active: number }) {
  const tools = ["Search records", "Work summary", "Missing evidence", "Possible duplicates", "Programme report", "Read field message", "Propose a case", "Propose a note", "Propose a follow-up", "Propose care"];
  const uses: number[][] = [[2, 0], [3, 0], [4, 1, 0], [5, 6]];
  const on = new Set(uses[active] ?? []);
  return (
    <div className="s4-ui s4u-cfg">
      <div className="s4-ui-pad s4u-head"><span className="s4-ui-title">StrayPaw AI · Ward 14 ABC Unit</span><span className="s4-tag is-green">Your permissions</span></div>
      <div className="s4-ui-pad">
        <p className="s4u-cfg-h">What happens to changes?</p>
        <div className="s4u-radio">
          <div className="is-on"><span /><b>Prepared, then confirmed</b><small>A person confirms every change</small></div>
          <div><span /><b>Read only</b><small>Answers with citations</small></div>
          <div className="is-off"><span /><b>Approve on its own</b><small>Not possible in StrayPaw</small></div>
        </div>
        <p className="s4u-cfg-h">What can StrayPaw AI use?</p>
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

export function ProgrammeUi() {
  const rows: [string, number, number, number, string][] = [["Ward 14", 142, 139, 131, "92%"], ["Ward 9", 98, 97, 90, "88%"], ["Ward 22", 61, 58, 52, "79%"], ["Ward 3", 44, 44, 41, "95%"]];
  return (
    <div className="s4u-pg">
      <div className="s4u-pg-head"><div><b>ABC drive · October</b><small>4 wards · 2 vets · 11 field staff</small></div><span className="s4-tag is-green">On track</span></div>
      <div className="s4u-kpis is-4"><div><b>345</b><small>sterilised</small></div><div><b>338</b><small>vaccinated</small></div><div><b>314</b><small>released</small></div><div><b>7</b><small>exceptions</small></div></div>
      <table className="s4u-table"><thead><tr><th>Ward</th><th>Sterilised</th><th>Vaccinated</th><th>Released</th><th>Evidence</th></tr></thead>
        <tbody>{rows.map(([w, a, b, c, e]) => <tr key={w}><td>{w}</td><td>{a}</td><td>{b}</td><td>{c}</td><td><span className="s4u-bar"><i style={{ width: e }} /></span>{e}</td></tr>)}</tbody></table>
    </div>
  );
}

export function QueueUi() {
  const rows: [string, string, string, string][] = [["Pickup · market gate", "WhatsApp draft", "Review", "amber"], ["SP-1067 post-op check", "Due Thu", "Follow-up", "blue"], ["SP-1042 / SP-1067", "Possible duplicate", "Decide", "violet"], ["SP-1031 release photo", "Evidence gap", "Request", "amber"], ["Injured dog · Ward 9", "Community report", "Triage", "flame"]];
  return (
    <div className="s4u-pg">
      <div className="s4u-pg-head"><div><b>Today</b><small>5 things need someone</small></div><span className="s4u-btn is-line">Assign</span></div>
      <ul className="s4u-q-list">{rows.map(([a, b, c, t]) => <li key={a}><span><b>{a}</b><small>{b}</small></span><span className={`s4-tag is-${t}`}>{c}</span></li>)}</ul>
    </div>
  );
}

export function AuditUi() {
  const rows: [string, string, string][] = [["10:42", "Dr. S. Rao", "authorised sterilisation · SP-1067"], ["10:15", "Anita (coordinator)", "marked SP-1042 and SP-1067 as different animals"], ["09:58", "StrayPaw AI → Anita", "follow-up prepared, confirmed by Anita"], ["09:31", "Ravi (field)", "created SP-1071 · operator-created"], ["Yesterday", "Import", "2,188 rows · historical imported record"]];
  return (
    <div className="s4u-pg">
      <div className="s4u-pg-head"><div><b>Audit history</b><small>Every change, who made it and when</small></div><span className="s4-tag">Read-only</span></div>
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
