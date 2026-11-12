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
import { ArrowRight, Check } from "lucide-react";
import { orgCampaigns, orgIncoming, KIND_LABEL, type CampaignStats, type Incoming } from "@/lib/campaigns";
import { useMembership } from "../shell/Shell";
import { Portrait } from "../ui/Portrait";
import { Ack, n, since } from "../ui";
import { Empty, PageHead, Seg } from "../ui/Page";
import { fileReports, type Receipt } from "../data/work";
import { NgoGate } from "./Gate";
import { isRecordingDemo } from "@/lib/recording-demo";
import { WhatsAppIntake } from "./WhatsAppIntake";
import { WhatsAppInbox } from "./WhatsAppInbox";
import { useAuth } from "@/components/auth/AuthProvider";
import "./ngo.css";
import "./whatsapp.css";
import "./intake2.css";

type Source = "ours" | "community";
const MOOD: Record<string, string> = { injured: "Injured", sick: "Unwell", scared: "Scared", aggressive: "Defensive", friendly: "Friendly", hungry: "Hungry", puppy: "Puppy" };

export function Inbox() {
  const mem = useMembership();
  const [src, setSrc] = useState<Source>("ours");
  const [wa, setWa] = useState(isRecordingDemo);
  const { user } = useAuth();
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

  type Channel = Source | "whatsapp";
  const channel: Channel = wa ? "whatsapp" : src;
  const setChannel = (c: Channel) => { setReceipt(null); if (c === "whatsapp") setWa(true); else { setWa(false); setSrc(c); } };
  const waiting = (counts.ours ?? 0) + (counts.community ?? 0);

  return (
    <NgoGate title="Intake" lede="Reports that have arrived, prepared by Kaju, waiting for a person to decide what they become.">
      <div className="vw ik">
        <PageHead title="Intake"
          sum={counts.ours === null || counts.community === null ? "Reports from the web, the app, WhatsApp and residents near you." : waiting === 0 ? "No report is waiting for a person." : <><b>{n(waiting)}</b> {waiting === 1 ? "report is" : "reports are"} waiting for a person to decide what {waiting === 1 ? "it becomes" : "they become"}.</>} />

        <div className="vw-bar">
          <Seg<Channel> label="Where reports came from" value={channel} onChange={setChannel} options={[
            { id: "ours", label: "Sent to you", count: counts.ours },
            { id: "community", label: "Community near you", count: counts.community },
            { id: "whatsapp", label: "WhatsApp" },
          ]} />
          {!wa && <div className="ik-tools">
            <button type="button" className="ik-chip" aria-pressed={helpOnly} onClick={() => setHelpOnly((v) => !v)}>Injured or unwell only</button>
            {shown.length > 0 && <button type="button" className="ik-chip" onClick={() => setPicked(picked.size === shown.length ? new Set() : new Set(shown.map((r) => r.id)))}>{picked.size === shown.length ? "Clear the selection" : `Select all ${shown.length}`}</button>}
          </div>}
        </div>

        {wa ? <div className="ik-wa">{isRecordingDemo ? <WhatsAppIntake /> : <WhatsAppInbox admin={mem.role === "admin"} />}</div> : (
          <div className="ik-split">
            <section aria-label="Reports">
              {rows === null && <div className="ik-skel" aria-hidden>{[0, 1, 2].map((i) => <i key={i} className="skel" />)}</div>}
              {rows !== null && !shown.length && <Empty title={helpOnly ? "No injured or unwell report" : src === "ours" ? "Nothing sent to you is waiting" : "No community report is waiting near you"}>{helpOnly ? "Turn the filter off to see every report." : "When a report arrives it appears here, and on the board under New."}</Empty>}
              <ul className="ik-list">
                {shown.map((r, j) => {
                  const help = (r.mood_tags ?? []).some((m) => m === "injured" || m === "sick");
                  return (
                    <li key={r.id} style={{ ["--j" as string]: j }}>
                      <label className={`ik-row${picked.has(r.id) ? " is-on" : ""}${help ? " is-help" : ""}`}>
                        <input type="checkbox" checked={picked.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Choose the report from ${r.zone ?? "an unknown place"}`} />
                        <span className="ik-check" aria-hidden><Check size={12} strokeWidth={3} /></span>
                        <Portrait src={r.photo_url} tag={r.nickname ?? "Report"} sensitive size="s" />
                        <span className="ik-main">
                          <b>{r.nickname ? `“${r.nickname}”` : help ? "An animal needing help" : "A sighting"}</b>
                          <small>{r.zone ?? "Place not given"} · {since(r.created_at)} · {r.reported_by}{r.lat && r.lng ? " · pinned on the map" : ""}</small>
                          {r.notes && <span className="ik-note">{r.notes}</span>}
                          {((r.mood_tags ?? []).length > 0 || (r.sterilisation_status && r.sterilisation_status !== "unknown")) && <span className="ik-tags">
                            {(r.mood_tags ?? []).map((m) => <span key={m} className="vw-tag" data-tone={m === "injured" || m === "sick" ? "flame" : undefined}>{MOOD[m] ?? m}</span>)}
                            {r.sterilisation_status && r.sterilisation_status !== "unknown" && <span className="vw-tag">{r.sterilisation_status === "sterilised" ? "Ear notch seen" : "No notch seen"}</span>}
                          </span>}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* What a chosen report becomes: a case for the team, or an entry in a drive. Nothing else. */}
            <aside className="ik-decide" aria-label="Decide">
              <h2>{picked.size ? `${picked.size} ${picked.size === 1 ? "report" : "reports"} chosen` : "Choose a report"}</h2>
              <p className="ik-lede">{picked.size ? "A report becomes one of two things." : "Tick one or more on the left. Each becomes one of two things."}</p>
              <div className={`ik-way${one ? " is-ready" : ""}`}>
                <b>A case for your team</b>
                <p>For an animal that needs someone to go. Its place and words carry over; you confirm them.</p>
                {one ? <Link className="ik-go" href={`/ngo/cases/new?${new URLSearchParams({ ...(one.lat && one.lng ? { lat: String(one.lat), lng: String(one.lng) } : {}), ...(one.zone ? { zone: one.zone } : {}), title: (one.mood_tags ?? []).includes("injured") ? "Injured animal reported" : "Reported animal", note: one.notes ?? "" }).toString()}`}>Open a case from it <ArrowRight size={14} aria-hidden /></Link>
                  : <span className="ik-hint">{picked.size > 1 ? "Choose exactly one report to open a case." : "Choose one report."}</span>}
              </div>
              <div className={`ik-way${picked.size && drive ? " is-ready" : ""}`}>
                <b>An entry in a drive</b>
                <p>For sightings that belong to a vaccination or sterilisation drive. Filing records what was seen, not that the animal was treated.</p>
                <select className="ik-sel" value={drive} onChange={(e) => setDrive(e.target.value)} aria-label="Drive"><option value="">Choose a drive…</option>{drives.map((d) => <option key={d.id} value={d.id}>{d.name} · {KIND_LABEL[d.kind]}</option>)}</select>
                <label className="ik-claim"><input type="checkbox" checked={claim} onChange={(e) => setClaim(e.target.checked)} /> Register the animals as ours</label>
                <button type="button" className="ik-go is-quiet" disabled={!picked.size || !drive || busy} onClick={() => void file()}>{busy ? "Filing…" : `File ${picked.size || ""} into the drive`}</button>
                {!drives.length && <span className="ik-hint">No drive yet. <Link href="/ngo/programmes">Start one</Link>.</span>}
              </div>
              <div aria-live="polite">{busy ? <Ack state="pending">Sending to the record…</Ack> : receipt ? (receipt.ok ? <Ack state="saved">{receipt.what}</Ack> : <Ack state="failed">Not filed: {receipt.error}</Ack>) : null}</div>
            </aside>
          </div>
        )}
      </div>
    </NgoGate>
  );
}
