"use client";

/* ════════════════════════════════════════════════════════════════════
   NGO · Inbox & triage (decisions 021, 028, 036).

   Everything that arrives before it is work: reports residents sent to
   the organisation and community reports in its places. A person looks
   at each one and decides: open a case, file it into a drive (which
   registers the animal), or leave it. Nothing becomes a case on its own.

   Channels are named honestly. Web and app reports are live. WhatsApp
   intake (CareOS) has no backend yet, so it is shown as not connected,
   never as an empty inbox.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { orgCampaigns, orgIncoming, KIND_LABEL, type CampaignStats, type Incoming } from "@/lib/campaigns";
import { useMembership } from "../shell/Shell";
import { Portrait } from "../ui/Portrait";
import { Ack, State, n, since, PageBrief } from "../ui";
import { fileReports, type Receipt } from "../data/work";
import { NgoGate } from "./Gate";
import "./ngo.css";

type Source = "ours" | "community";
const MOOD: Record<string, string> = { injured: "Injured", sick: "Unwell", scared: "Scared", aggressive: "Defensive", friendly: "Friendly", hungry: "Hungry", puppy: "Puppy" };

export function Inbox() {
  const mem = useMembership();
  const [src, setSrc] = useState<Source>("ours");
  const [rows, setRows] = useState<Incoming[] | null>(null);
  const [counts, setCounts] = useState<Record<Source, number | null>>({ ours: null, community: null });
  const [drives, setDrives] = useState<CampaignStats[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [drive, setDrive] = useState("");
  const [claim, setClaim] = useState(true);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [helpOnly, setHelpOnly] = useState(false);

  const load = useCallback(async (s: Source) => {
    setRows(null); setPicked(new Set());
    const r = await orgIncoming(s).catch(() => [] as Incoming[]);
    setRows(r); setCounts((c) => ({ ...c, [s]: r[0]?.total_count ?? r.length }));
  }, []);
  useEffect(() => { if (mem.member) void load(src); }, [mem.member, src, load]);
  useEffect(() => { if (!mem.member) return; orgCampaigns().then(setDrives).catch(() => {}); orgIncoming(src === "ours" ? "community" : "ours").then((r) => setCounts((c) => ({ ...c, [src === "ours" ? "community" : "ours"]: r[0]?.total_count ?? r.length }))).catch(() => {}); }, [mem.member]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => (rows ?? []).filter((r) => !helpOnly || (r.mood_tags ?? []).some((m) => m === "injured" || m === "sick")), [rows, helpOnly]);
  const toggle = (id: string) => setPicked((p) => { const x = new Set(p); if (x.has(id)) x.delete(id); else x.add(id); return x; });
  const one = picked.size === 1 ? shown.find((r) => picked.has(r.id)) : null;
  const file = async () => {
    if (!drive || !picked.size) return;
    setBusy(true); setReceipt(null);
    const r = await fileReports([...picked], drive, claim);
    setReceipt(r); setBusy(false);
    if (r.ok) { await load(src); orgCampaigns().then(setDrives).catch(() => {}); }
  };

  return (
    <NgoGate title="Inbox" lede="Reports that have arrived, waiting for a person to decide what they become.">
      <div className="ngo-page ib">
        <header className="ngo-head">
          <div><p className="k">{mem.org?.name ?? "Your organisation"} · triage</p><h1 className="serif">Inbox</h1></div>
          <p className="ngo-sum">A person decides what each report becomes: a case, an animal filed into a drive, or nothing yet. Nothing turns into work on its own.</p>
          <div className="row"><Link className="btn is-s" href="/ngo">Back to Work</Link></div>
        </header>
        <PageBrief items={[["For", "Reports waiting for a person: sent to you, and community reports near you."], ["Watch", "Injured or unwell first."], ["Next", "File into a drive, or open a case."], ["After", "It leaves the inbox; the reporter’s receipt still says received, not accepted."]]} />
        <div className="ib-grid">
          <label className="ib-mobile-source"><span className="label">Reports</span><select className="select" value={src} onChange={e => { setSrc(e.target.value as Source); setReceipt(null); }}><option value="ours">Sent to you ({counts.ours ?? "…"})</option><option value="community">Community in your areas ({counts.community ?? "…"})</option></select><small>WhatsApp intake is not connected for this organisation.</small></label>
          <nav className="ib-channels" aria-label="Channels">
            <p className="k">Channels</p>
            {(["ours", "community"] as Source[]).map((s) => (
              <button key={s} type="button" className={`ib-ch${src === s ? " is-on" : ""}`} aria-pressed={src === s} onClick={() => { setSrc(s); setReceipt(null); }}>
                <span className="ib-dot is-live" aria-hidden /><span><b>{s === "ours" ? "Sent to you" : "Community, in your places"}</b><small>{s === "ours" ? "Web and app reports your team or volunteers sent" : "Residents' reports near your areas"}</small></span><em className="mono">{counts[s] === null ? "…" : n(counts[s]!)}</em>
              </button>
            ))}
            <div className="ib-ch is-off" aria-disabled="true">
              <span className="ib-dot" aria-hidden /><span><b><MessageCircle size={13} aria-hidden /> WhatsApp</b><small>WhatsApp intake is not connected for this organisation.</small></span>
            </div>
          </nav>

          <section className="ib-list" aria-label="Reports">
            <div className="wk-tools">
              <button type="button" className="chip" aria-pressed={helpOnly} onClick={() => setHelpOnly((v) => !v)}>Injured or unwell only</button>
              {shown.length > 0 && <button type="button" className="chip" onClick={() => setPicked(picked.size === shown.length ? new Set() : new Set(shown.map((r) => r.id)))}>{picked.size === shown.length ? "Clear the selection" : `Select all ${shown.length}`}</button>}
            </div>
            {rows === null && <div className="stack" style={{ padding: 20 }}>{[0, 1, 2, 3].map((i) => <div key={i} className="skel" style={{ height: 96 }} />)}</div>}
            {rows !== null && !shown.length && <State art="ngo-empty" title={helpOnly ? "No injured or unwell report" : src === "ours" ? "Nothing sent to you is waiting" : "No community report waiting near you"}>Reports appear here until a person files them into a drive or opens a case. An empty inbox means nothing is waiting, not that nothing was reported elsewhere.</State>}
            <ul className="ib-rows">
              {shown.map((r) => {
                const help = (r.mood_tags ?? []).some((m) => m === "injured" || m === "sick");
                return (
                  <li key={r.id} className={`ib-row${picked.has(r.id) ? " is-on" : ""}${help ? " is-help" : ""}`}>
                    <label className="ib-pick"><input type="checkbox" checked={picked.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select the report from ${r.zone ?? "an unknown place"}`} /></label>
                    <Portrait src={r.photo_url} tag={r.nickname ?? "Report"} sensitive size="s" />
                    <div className="ib-main">
                      <p><b>{r.nickname ? `“${r.nickname}”` : help ? "An animal needing help" : "A sighting"}</b>{r.zone ? <> · {r.zone}</> : <> · <i>place not given</i></>}</p>
                      {r.notes && <p className="small ib-note">{r.notes}</p>}
                      <div className="row" style={{ ["--g" as string]: "6px" }}>
                        {(r.mood_tags ?? []).map((m) => <span key={m} className={`pill ${m === "injured" || m === "sick" ? "is-urgent" : "is-plain"}`}>{MOOD[m] ?? m}</span>)}
                        {r.sterilisation_status && r.sterilisation_status !== "unknown" && <span className="pill">{r.sterilisation_status === "sterilised" ? "Ear notch seen" : "No notch seen"}</span>}
                      </div>
                    </div>
                    <p className="ib-meta small">{since(r.created_at)}<br />{r.reported_by}{r.lat && r.lng ? <><br />pinned</> : null}</p>
                  </li>
                );
              })}
            </ul>
          </section>

          <aside className={`ib-act${picked.size ? "" : " is-empty"}`} aria-label="Decide">
            <p className="k">Decide</p>
            <h2 className="h3">{picked.size ? `${picked.size} report${picked.size === 1 ? "" : "s"} chosen` : "Choose reports"}</h2>
            {one ? (
              <Link className="btn is-flame" href={`/ngo/cases/new?${new URLSearchParams({ ...(one.lat && one.lng ? { lat: String(one.lat), lng: String(one.lng) } : {}), ...(one.zone ? { zone: one.zone } : {}), title: (one.mood_tags ?? []).includes("injured") ? "Injured animal reported" : "Reported animal", note: one.notes ?? "" }).toString()}`}>Open a case from it</Link>
            ) : <p className="small">Choose one report to open a case from it. Its place and words carry over; you confirm them.</p>}
            <div className="ib-file">
              <label className="field"><span className="label">Or file into a drive</span>
                <select className="select" value={drive} onChange={(e) => setDrive(e.target.value)}><option value="">Choose a drive…</option>{drives.map((d) => <option key={d.id} value={d.id}>{d.name} · {KIND_LABEL[d.kind]}</option>)}</select>
              </label>
              <label className="row small" style={{ ["--g" as string]: "8px" }}><input type="checkbox" checked={claim} onChange={(e) => setClaim(e.target.checked)} /> Register the animals as ours</label>
              <button type="button" className="btn is-ink" disabled={!picked.size || !drive || busy} onClick={() => void file()}>{busy ? "Filing…" : `File ${picked.size || ""} into the drive`}</button>
              {!drives.length && <p className="small">No drive yet. <Link className="link" href="/ngo/programmes">Start one in Programmes</Link>.</p>}
            </div>
            <div aria-live="polite">{busy ? <Ack state="pending">Sending to the record…</Ack> : receipt ? (receipt.ok ? <Ack state="saved">{receipt.what}</Ack> : <Ack state="failed">Not filed: {receipt.error}</Ack>) : null}</div>
            <p className="small">Filing records each animal&rsquo;s observed status in the drive. It does not say the animal was treated.</p>
          </aside>
        </div>
      </div>
    </NgoGate>
  );
}
