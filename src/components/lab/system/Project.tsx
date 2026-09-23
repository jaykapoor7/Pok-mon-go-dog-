import Link from "next/link";
import "./sys.css";
import { fmt } from "../data";
import { Band, Band100 } from "./parts";
import { ProjectTabs, type Template } from "./ProjectTabs";
import { R } from "./sdata";

const TEMPLATES: Template[] = [
  { id: "abc", name: "ABC drive", real: true, unit: "Locality · cell", progress: "Enrolled → admitted → released", outcome: "Sterilised and released to the same place", vars: [], evidence: "Admit and release dates, ear notch, photograph" },
  { id: "tvt", name: "TVT course", real: true, unit: "Animal", progress: "Weekly doses until regression", outcome: "Regressed · course complete", vars: [], evidence: "Dated dose entries, missed weeks" },
  { id: "arv", name: "ARV campaign", real: false, unit: "Cell · ward", progress: "Animals vaccinated of animals recorded", outcome: "Vaccinated, booster due date set", vars: ["Animal record", "Place", "Vaccine and batch", "Dose date", "Booster due", "Vaccinator", "Photograph", "Ear notch or collar"], evidence: "Batch number, dated dose" },
  { id: "census", name: "Census", real: false, unit: "Cell · transect", progress: "Cells surveyed of cells planned", outcome: "Population estimate with interval", vars: ["Transect or cell", "Surveyor", "Date and time", "Count", "Sex, where seen", "Ear notch seen", "Condition", "Photograph"], evidence: "Timed, placed counts" },
  { id: "medical", name: "Medical camp", real: false, unit: "Site", progress: "Animals treated of animals presented", outcome: "Treated · referred · follow-up due", vars: ["Site", "Animal record", "Condition", "Treatment", "Vet", "Follow-up date", "Photograph"], evidence: "Treatment entry per animal" },
  { id: "edu", name: "Education", real: false, unit: "School · ward", progress: "Sessions held of sessions planned", outcome: "People reached, reports that follow", vars: ["Venue", "Date", "Audience", "People reached", "Facilitator", "Reports in the next 90 days"], evidence: "Attendance, dated session" },
  { id: "horse", name: "Horse welfare", real: false, unit: "Stand · route", progress: "Animals checked of animals registered", outcome: "Fit to work · rest ordered · treated", vars: ["Animal record", "Owner consent", "Body condition score", "Hoof and harness", "Wounds", "Water and shade", "Action"], evidence: "Scored checks, photographs" },
  { id: "survey", name: "Survey", real: false, unit: "Respondent · ward", progress: "Responses of target", outcome: "Findings with sample size", vars: ["Questionnaire version", "Respondent type", "Ward", "Answers", "Consent"], evidence: "Versioned responses" },
  { id: "custom", name: "Custom", real: false, unit: "Chosen by the organisation", progress: "Defined per project", outcome: "Defined per project", vars: ["Any field the organisation needs", "Place is always recorded", "Date is always recorded", "Not recorded is always separate from zero"], evidence: "Per field" },
];

export function SystemProject() {
  const a = R.abc;
  const admitted = a.fields.find((f) => f[0] === "Admit date")![1];
  const released = a.fields.find((f) => f[0] === "Release date")![1];
  const reappt = a.fields.find((f) => f[0] === "Re-appointment")![1];
  const stays = [...a.stays].sort((x, y) => x - y);
  const med = stays[Math.floor(stays.length / 2)];
  const smax = Math.max(...stays);
  const abc = (
    <div className="sx-proj-body">
      <section className="sx-proj-line" aria-label="Progress">
        <ol className="sx-line" style={{ ["--n" as string]: 4 }}>
          <li className="sx-stn here"><i /><span className="lbl">Enrolled</span><b className="num">{a.enrolled}</b><p>animals entered on the drive list</p></li>
          <li className="sx-stn here"><i /><span className="lbl">Admitted</span><b className="num">{admitted}</b><p>with an admit date</p></li>
          <li className="sx-stn here"><i /><span className="lbl">Released</span><b className="num">{released}</b><p>with a release date</p></li>
          <li className="sx-stn need"><i /><span className="lbl">Re-appointed</span><b className="num">{reappt}</b><p>given a new date — the drive&apos;s open work</p></li>
        </ol>
        <p className="sx-note" style={{ marginTop: 18 }}>{a.enrolled - admitted} enrolled animals have no admit date and {admitted - released} admitted animals have no release date. They are not counted as failures — they are unrecorded, and each is a line to chase.</p>
      </section>
      <div className="sx-proj-grid">
        <section aria-label="Sex">
          <h3>Who was enrolled</h3>
          <Band100 height={22} parts={[{ n: a.female, fill: "#2457ce", label: "female" }, { n: a.male, fill: "#93aee9", label: "male" }, { n: a.sexNotRecorded, fill: "", hatch: true, label: "not recorded" }]} />
          <div className="sx-key" style={{ marginTop: 10 }}><span><i style={{ background: "#2457ce" }} />female {a.female}</span><span><i style={{ background: "#93aee9" }} />male {a.male}</span><span><i className="hatch" style={{ outline: "1px solid rgba(11,30,61,.3)" }} />not recorded {a.sexNotRecorded}</span></div>
          <p className="sx-note" style={{ marginTop: 12 }}>Three females to every male enrolled — the right priority for population control, and a figure a funder can check.</p>
        </section>
        <section aria-label="Stay">
          <h3>Days from admission to release</h3>
          <svg viewBox="0 -40 420 150" width="100%" role="img" aria-label={`Stays for ${stays.length} animals, median ${med} days`}>
            <line x1="10" x2="410" y1="70" y2="70" stroke="#0b1e3d" />
            {[0, 7, 14, 30, 60, 100].filter((d) => d <= smax + 5).map((d) => <g key={d}><line x1={10 + (d / (smax + 1)) * 400} x2={10 + (d / (smax + 1)) * 400} y1="70" y2="76" stroke="#0b1e3d" /><text x={10 + (d / (smax + 1)) * 400} y="92" textAnchor="middle" className="ax">{d}</text></g>)}
            {stays.map((d, i) => { const same = stays.slice(0, i).filter((x) => x === d).length; return <circle key={i} cx={10 + (d / (smax + 1)) * 400} cy={62 - same * 8} r="3.6" fill="#2457ce" />; })}
            <line x1={10 + (med / (smax + 1)) * 400} x2={10 + (med / (smax + 1)) * 400} y1="-36" y2="70" stroke="#f05b40" strokeDasharray="3 3" />
            <text x={18 + (med / (smax + 1)) * 400} y="-26" className="ax hot">median {med} days</text>
            <text x="410" y="106" textAnchor="end" className="ax">days</text>
          </svg>
          <p className="sx-note">{stays.length} animals with both dates. Two stays of {stays[stays.length - 2]} and {smax} days are recovery, not routine — they would be flagged for review.</p>
        </section>
        <section aria-label="Variables">
          <h3>Variables collected</h3>
          <ul className="sx-vars">{a.fields.map(([k, n]) => <li key={k}><span>{k}</span><div><Band100 height={10} parts={[{ n, fill: "#2457ce" }, { n: a.enrolled - n, fill: "", hatch: true }]} /></div><b className="m">{n}/{a.enrolled}</b></li>)}</ul>
        </section>
        <section aria-label="Geography">
          <h3>Geography</h3>
          <div className="sx-proj-geo hatch"><span>Location recorded as text for {a.fields.find((f) => f[0] === "Location")![1]} of {a.enrolled} animals — not yet placed on the map.</span></div>
          <p className="sx-note" style={{ marginTop: 12 }}>Once each line is joined to an animal record, the drive draws itself on the ward coverage map: which cells were reached, and which were not.</p>
        </section>
      </div>
      <section className="sx-proj-report night" aria-label="Reports">
        <div><span className="lbl">Reports</span><b>Funder summary</b><span>Enrolment, sex ratio, completion, stays, with every unrecorded field shown.</span></div>
        <div className="acts"><button type="button" className="sx-btn">Export PDF summary</button><button type="button" className="sx-btn quiet">Export records (CSV)</button></div>
      </section>
    </div>
  );
  const tvt = (
    <div className="sx-proj-body">
      <section className="sx-proj-line" aria-label="TVT progress">
        <ol className="sx-line" style={{ ["--n" as string]: 3 }}>
          <li className="sx-stn here"><i /><span className="lbl">Courses</span><b className="num">{R.tvt.courses}</b><p>animals on a weekly dose course</p></li>
          <li className="sx-stn need"><i /><span className="lbl">Open</span><b className="num">{R.tvt.open}</b><p>mid-schedule now</p></li>
          <li className="sx-stn here"><i /><span className="lbl">Dated entries</span><b className="num">{R.tvt.entries.reduce((x, y) => x + y, 0)}</b><p>{R.tvt.missed.reduce((x, y) => x + y, 0)} marked as missed</p></li>
        </ol>
      </section>
      <p className="sx-note">Every course is in the Operations view as unfinished work until it closes. See <Link href="/lab/system/ngo" className="care">Operations</Link>.</p>
    </div>
  );
  return (
    <main className="sx sx-project">
      <Band current="/lab/system/project" crumbs={["India", "Coimbatore", "Field partner", "Projects"]} />
      <section className="sx-head">
        <div>
          <span className="lbl">Project · field partner, Coimbatore · sterilisation drive</span>
          <h1>ABC drive, <span className="it">{fmt(a.enrolled)} animals enrolled.</span></h1>
        </div>
      </section>
      <ProjectTabs templates={TEMPLATES} panels={{ abc, tvt }} />
    </main>
  );
}
