"use client";

/* ════════════════════════════════════════════════════════════════════
   Kaju agents: the roles Kaju plays for an animal-welfare organisation.
   Each role is Kaju in its own colour, with what it does, when it runs and
   what it may use. Every screen is an illustrative run on demo records.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useState, type ReactNode } from "react";
import { Check, Clock, FileText, Play, Settings2, Sparkles } from "lucide-react";

import { ROLES } from "./roles";
import { RoleFace } from "./RoleFace";

/* ── the three featured agents, each with its run screen ─────────── */
const FEATURED = [
  { key: "release", title: "Release photo chaser", body: "Finds every release missing a photo or a place, asks the field worker who did it, and closes the gap before the month ends." },
  { key: "claim", title: "Monthly claim builder", body: "Builds the claim at your contract rates from vet-authorised records, explains each exception, and prepares PDF, Excel and slides." },
  { key: "intake", title: "Field intake agent", body: "Reads the field group as messages arrive, prepares cases with photos and ward, and merges reports about the same animal." },
];
type Run = { at: string; status: "ok" | "attn"; trigger: string; dur: string };
const RUNS: Record<string, { name: string; next: string; summary: ReactNode; rows: [string, string, string][]; runs: Run[] }> = {
  release: { name: "Release Photo Chaser", next: "Next run in about 5 hours",
    summary: <>Checked <b>164 releases</b> this week in Ward 14 and Ward 9.</>,
    rows: [["COMPLETE", "151", "Photo and place match the capture ward"], ["ASKED_FIELD_STAFF", "9", "Ravi and Meena asked on WhatsApp"], ["OUTSIDE_WARD", "1", "Flagged for the coordinator"], ["PHOTO_LATE", "3", "Photo added after release day"]],
    runs: [{ at: "Today, 6:00 PM", status: "ok", trigger: "Scheduled", dur: "48 seconds" }, { at: "Yesterday, 6:00 PM", status: "ok", trigger: "Scheduled", dur: "51 seconds" }, { at: "Mon, 6:00 PM", status: "attn", trigger: "Scheduled", dur: "1 minute" }] },
  claim: { name: "Monthly Claim Builder", next: "Next run on 1 December",
    summary: <>October claim for Ward 14: <b>₹3,04,080</b> across 4 rate lines.</>,
    rows: [["READY", "142", "Sterilisations with vet sign-off and evidence"], ["VACCINATED", "139", "Anti-rabies doses, batch recorded"], ["EXCEPTIONS", "4", "Each explained in the package"], ["HELD_BACK", "2", "Missing a sign-off; not claimed"]],
    runs: [{ at: "1 Nov, 9:00 AM", status: "ok", trigger: "Scheduled", dur: "2 minutes" }, { at: "1 Oct, 9:00 AM", status: "ok", trigger: "Scheduled", dur: "2 minutes" }, { at: "28 Sep, 4:12 PM", status: "ok", trigger: "Manual", dur: "1 minute" }] },
  intake: { name: "Field Intake Agent", next: "Runs when a message arrives",
    summary: <>Read <b>38 messages</b> from the Ward 14 field team today.</>,
    rows: [["DRAFT_CASES", "12", "Prepared with photos, ward and condition"], ["MERGED", "4", "Reports about an animal already open"], ["URGENT", "1", "Hit by auto, Canal Road: Ravi assigned"], ["NOT_A_CASE", "6", "Chat, thanks and location pings"]],
    runs: [{ at: "Today, 9:10 AM", status: "ok", trigger: "New message", dur: "6 seconds" }, { at: "Today, 8:31 AM", status: "attn", trigger: "New message", dur: "9 seconds" }, { at: "Today, 7:42 AM", status: "ok", trigger: "New message", dur: "5 seconds" }] },
};

export function FeaturedAgents() {
  const [on, setOn] = useState(0);
  const [hold, setHold] = useState(false);
  useEffect(() => {
    if (hold || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setOn((v) => (v + 1) % FEATURED.length), 7000);
    return () => window.clearInterval(id);
  }, [hold]);
  const f = FEATURED[on]; const r = RUNS[f.key]; const role = ROLES.find((x) => x.key === f.key)!;
  return (
    <div className="s7a-feat" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
      <div className="s7a-feat-tabs" role="tablist" aria-label="Featured agents">
        {FEATURED.map((x, i) => (
          <button key={x.key} type="button" role="tab" aria-selected={on === i} onClick={() => { setOn(i); setHold(true); }}>
            <b>{on === i && <i style={{ background: ROLES.find((y) => y.key === x.key)!.color }} />}{x.title}</b>
            <span>{x.body}</span>
          </button>
        ))}
      </div>
      <div className="s7a-stage" key={f.key}>
        <div className="s7a-app">
          <div className="s7a-app-bar"><i /><i /><i /></div>
          <div className="s7a-app-in">
            <aside className="s7a-side" aria-hidden>
              <p><b>StrayPaw</b></p>
              <small>Workflow</small>
              {["Intake", "Animals", "Treatment", "Evidence", "Reports"].map((x) => <span key={x}>{x}</span>)}
              <small>Platform</small>
              <span className="is-on">Kaju agents</span><span>Team</span>
            </aside>
            <div className="s7a-main">
              <div className="s7a-head"><RoleFace color={role.color} size={18} /><b>{r.name}</b><small><Clock size={12} /> {r.next}</small><span className="s7a-sp" /><span className="s7-btn"><Settings2 size={13} /> Configure</span><span className="s7-btn is-blue"><Play size={12} /> Start now</span></div>
              <div className="s7a-cols">
                <div className="s7a-runs">
                  <p className="s7-cap">Runs</p>
                  <div className="s7a-spark" aria-hidden>{[3, 5, 4, 6, 5, 7, 9, 8, 10, 12].map((h, i) => <i key={i} style={{ height: `${h * 7}%`, background: role.color }} />)}</div>
                  {r.runs.map((x, i) => (
                    <div key={i} className={`s7a-run${i === 0 ? " is-on" : ""}`}>
                      <span className={`s7-pill ${x.status === "ok" ? "is-green" : "is-amber"}`}>{x.status === "ok" ? <><Check size={11} strokeWidth={3} /> Succeeded</> : "Needs attention"}</span>
                      <b>{x.at}</b><small>{x.trigger} · {x.dur}</small>
                    </div>
                  ))}
                </div>
                <div className="s7a-out">
                  <p className="s7a-out-h"><span className="s7-pill is-green"><Check size={11} strokeWidth={3} /> Succeeded</span> {r.runs[0].at}</p>
                  <p className="s7a-steps"><Sparkles size={12} /> Agent steps · 5 completed</p>
                  <p className="s7a-sum-h">{r.name} summary</p>
                  <p className="s7a-sum">{r.summary}</p>
                  <table className="s7a-table"><thead><tr><th>Status</th><th>Count</th><th>Description</th></tr></thead>
                    <tbody>{r.rows.map(([a, b, c]) => <tr key={a}><td>{a}</td><td>{b}</td><td>{c}</td></tr>)}</tbody></table>
                  <p className="s7a-foot"><FileText size={12} /> Prepared by Kaju · nothing is approved until a person confirms</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── the agent setup form, as on the landing ─────────────────────── */
export function AgentSetup() {
  const [on, setOn] = useState(true);
  return (
    <div className="s7a-setup">
      <div className="s7a-app-bar"><i /><i /><i /></div>
      <div className="s7a-setup-in">
        <RoleFace color="#d97706" size={20} />
        <p className="s7-agent-name">Release Photo Chaser</p>
        <div className="s7-row"><span className="s7-sel">Ward 14 team ▾</span><button type="button" className="s7-toggle is-btn" aria-pressed={on} onClick={() => setOn((v) => !v)}><i className={on ? "" : "is-off"} /> {on ? "Enabled" : "Paused"}</button></div>
        <div className="s7a-start"><Sparkles size={13} /> <span><b>Start with a common job</b><small>Pick one and Kaju fills in what to check and who to tell.</small></span></div>
        <p className="s7-agent-h">When should this run?</p>
        <div className="s7-when"><span className="is-on"><i /><b>On a schedule</b><small>Every day at 6:00 PM</small></span><span><i /><b>When something happens</b><small>A release is recorded</small></span></div>
        <p className="s7-agent-h">What can Kaju use?</p>
        <div className="s7-uses">{["Releases", "Evidence", "Team", "WhatsApp", "Maps", "Register", "Excel"].map((x, i) => <span key={x} className={i < 4 ? "is-on" : ""}>{x}</span>)}</div>
      </div>
    </div>
  );
}
