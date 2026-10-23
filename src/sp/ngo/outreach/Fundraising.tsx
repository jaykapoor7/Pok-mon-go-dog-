"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Fundraising (1.0 /partner/fundraising).

   Real needs turned into campaigns. StrayPaw links out to the
   organisation's own donation page and never holds the money, so any
   amount raised is what the organisation reported, never a verified
   total, and the page never sums reported amounts into one figure.
   Cover photos are blurred: a fundraiser often shows an injured animal.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { SensitiveVeil } from "@/components/ui/SensitiveVeil";
import { formatINR } from "@/lib/fundraisers";
import { fundraiserCategory, type Fundraiser } from "@/lib/types";
import { useMembership } from "../../shell/Shell";
import { Method, State, day, n } from "../../ui";
import { readOrgFundraisers } from "../../data/work-outreach";
import { NgoGate } from "../Gate";
import "../ngo.css";
import "./outreach.css";

/* Common needs prefill a new campaign's title. */
export const NEEDS = ["Emergency treatment", "Rescue operation", "Veterinary medicines", "Mobile veterinary ambulance", "Vaccination drive", "Rehabilitation"];

export function Fundraising() {
  const mem = useMembership();
  const [rows, setRows] = useState<Fundraiser[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const load = useCallback(async () => {
    setFailed(null); setRows(null);
    try { setRows(await readOrgFundraisers()); } catch (e) { setFailed(e instanceof Error ? e.message : "The campaigns could not be read."); }
  }, []);
  useEffect(() => { if (mem.member) void load(); }, [mem.member, load]);
  const active = rows?.filter((r) => r.status === "active").length ?? 0;

  return (
    <NgoGate title="Fundraising" lede="Turn real needs into campaigns that link to your own donation page.">
      <div className="ngo-page">
        <header className="ngo-head">
          <div><p className="k">{mem.org?.name ?? "Your organisation"} · fundraising</p><h1 className="serif">Fundraising</h1></div>
          <p className="ngo-sum">{rows ? <><b>{n(rows.length)}</b> campaign{rows.length === 1 ? "" : "s"}, <b>{n(active)}</b> active. </> : failed ? "Your campaigns could not be read. Nothing is shown as none. " : "Reading your campaigns… "}Donors pay you directly through your own link; StrayPaw never holds the money.</p>
          <div className="row"><Link className="btn is-flame" href="/ngo/fundraising/new"><Plus size={15} aria-hidden /> New campaign</Link></div>
        </header>

        <section className="or-band" aria-labelledby="fr-need">
          <h2 id="fr-need">Start from a need</h2>
          <div className="or-needs">{NEEDS.map((x) => <Link key={x} className="chip" href={`/ngo/fundraising/new?title=${encodeURIComponent(x)}`}>{x}</Link>)}</div>
        </section>

        <div className="or-sub"><h2 className="serif">Your campaigns</h2></div>
        <div style={{ padding: "0 28px 8px" }}><Method items={[["Source", "your organisation's campaigns"], ["Raised", "reported by your organisation, not verified"], ["Money", "held by you, not StrayPaw"]]} /></div>

        {failed ? (
          <State kind="error" title="Not read" action={<button type="button" className="btn is-ink" onClick={() => void load()}>Try again</button>}>{failed}</State>
        ) : rows === null ? (
          <div style={{ padding: "18px 28px" }}><div className="skel" style={{ height: 160 }} /></div>
        ) : rows.length === 0 ? (
          <State art="ngo-empty" title="No campaigns yet" action={<Link className="btn is-ink" href="/ngo/fundraising/new">Start a campaign</Link>}>Pick a need above or start your own. You need a donation link (UPI, Razorpay, Milaap, Ketto or your own page); donors are sent there.</State>
        ) : (
          <div className="or-scroll" role="region" aria-label="Your campaigns" tabIndex={0}>
            <table className="or-table" style={{ minWidth: 900 }}>
              <thead><tr><th>Campaign</th><th>Status</th><th className="is-num">Goal</th><th className="is-num">Raised</th><th>Needed by</th><th>Started</th><th /></tr></thead>
              <tbody>
                {rows.map((c) => {
                  const pct = c.goal_amount && c.raised_reported ? Math.min(100, Math.round((c.raised_reported / c.goal_amount) * 100)) : null;
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: "grid", gridTemplateColumns: "56px minmax(0,1fr)", gap: 12, alignItems: "center" }}>
                          {c.cover_photo ? <span className="or-thumb is-s"><SensitiveVeil sensitive id={c.cover_photo} compact>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={c.cover_photo} alt="" loading="lazy" onError={e => (e.currentTarget.style.display = "none")} /></SensitiveVeil></span> : <span className="or-thumb is-s" aria-hidden />}
                          <span><b>{c.title}</b><small>{fundraiserCategory(c.category).label}{c.case_id ? " · linked to a case" : ""}</small></span>
                        </div>
                      </td>
                      <td><span className={`pill ${c.status === "active" ? "is-care" : "is-plain"}`} style={{ textTransform: "capitalize" }}>{c.status}</span></td>
                      <td className="is-num">{c.goal_amount ? formatINR(c.goal_amount) : <i className="or-none">no goal</i>}</td>
                      <td className="is-num">{c.raised_reported != null ? <>{formatINR(c.raised_reported)}{pct != null ? ` · ${pct}%` : ""}<span className="or-reported">reported, not verified</span></> : <i className="or-none">not reported</i>}</td>
                      <td className="mono">{c.deadline ? day(c.deadline) : <i className="or-none">no date</i>}</td>
                      <td className="mono">{day(c.created_at)}{c.created_by_name ? <small>{c.created_by_name}</small> : null}</td>
                      <td><div className="or-acts"><Link className="btn is-s" href={`/fundraisers/${c.id}`}>Open</Link>{c.case_id && <Link className="btn is-ghost is-s" href={`/ngo/cases/${c.case_id}`}>Case</Link>}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="small ngo-foot" style={{ paddingTop: 18 }}>Any member of a verified partner organisation can start a campaign; the database refuses everyone else. Updates, the amount raised and the outcome are kept on each campaign&rsquo;s own page.</p>
      </div>
    </NgoGate>
  );
}
