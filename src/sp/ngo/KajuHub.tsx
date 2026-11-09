"use client";

/* Kaju home: what Kaju is already doing for this organisation, before anyone
   asks. Every figure is read live from the organisation's own records (the
   ABC queue, the billing preview, prepared work and the latest record
   check); every row opens the screen or the Kaju answer that acts on it. */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BadgeIndianRupee, CalendarClock, Camera, MapPin, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { stageOf, verificationQueue, type QueueRow } from "@/lib/abc";
import { readBillingPreview, type PreviewResult } from "@/lib/billing";
import { monthBounds, monthlyPlan } from "@/sp3/ai/monthly";
import { useAi } from "@/sp3/ai/AiPanel";
import { contractOffice } from "@/sp/abc/MonthlySubmission";
import { useMembership } from "@/sp/shell/Shell";
import { Reading } from "@/sp/ui/Reading";
import "./kaju-hub.css";

type Prepared = { stalled: unknown[]; reviews: { items: unknown[] }; localities: unknown[] } | null;
type Check = { flagged: number; at: string } | null;

const rupees = (v: string | null) => (v === null ? null : `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`);
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export function KajuHub() {
  const ai = useAi();
  const mem = useMembership();
  const role = mem.role;
  const lead = role === "admin" || role === "coordinator";
  const [rows, setRows] = useState<QueueRow[] | null>(null);
  const [bill, setBill] = useState<PreviewResult | null>(null);
  const [prep, setPrep] = useState<Prepared | undefined>(undefined);
  const [check, setCheck] = useState<Check | undefined>(undefined);

  useEffect(() => {
    if (!mem.member || !mem.org) return;
    let live = true;
    verificationQueue(500).then((r) => live && setRows(r)).catch(() => live && setRows([]));
    if (lead) contractOffice().then((office) => {
      if (!office) { if (live) setBill({ state: "error", message: "no contract" }); return; }
      const b = monthBounds(new Date());
      readBillingPreview(b.start, b.end, office).then((r) => live && setBill(r));
    });
    (async () => {
      try {
        const db = getSupabase();
        const token = (await db?.auth.getSession())?.data.session?.access_token;
        const r = token ? await fetch("/api/ai/prepared", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }) : null;
        if (live) setPrep(r?.ok ? ((await r.json()) as Prepared) : null);
        const c = await db?.from("kaju_check_runs").select("checked_at,findings").eq("ngo_id", mem.org!.id).order("checked_at", { ascending: false }).limit(1).maybeSingle();
        const f = (c?.data?.findings ?? []) as { count: number | null; configured?: boolean }[];
        if (live) setCheck(c?.data ? { flagged: f.filter((x) => x.count !== 0 || x.configured === false).length, at: c.data.checked_at as string } : null);
      } catch { if (live) { setPrep(null); setCheck(null); } }
    })();
    return () => { live = false; };
  }, [mem.member, mem.org, lead]);

  const counts = useMemo(() => {
    const c = { vet: 0, evidence: 0, review: 0 };
    for (const r of rows ?? []) { const s = stageOf(r); if (s === "vet") c.vet++; else if (s === "evidence") c.evidence++; else if (s === "review") c.review++; }
    return c;
  }, [rows]);
  const plan = useMemo(() => (rows ? monthlyPlan(rows, new Date()) : null), [rows]);
  const blocked = plan ? plan.blockedBy.reduce((t, x) => t + x.count, 0) : 0;
  const preview = bill?.state === "ok" ? bill.preview : null;
  const followups = prep?.reviews.items.length ?? 0;
  const places = prep?.localities.length ?? 0;
  const quiet = prep?.stalled.length ?? 0;

  if (!mem.member) return null;
  const loading = rows === null || prep === undefined || check === undefined;

  type Auto = { key: string; icon: React.ReactNode; name: string; status: React.ReactNode; due: boolean; act: React.ReactNode; show: boolean };
  const autos: Auto[] = [
    { key: "check", icon: <ShieldCheck size={16} />, name: "Morning record check", show: true,
      status: check ? (check.flagged ? `${check.flagged} to look at · checked ${clock(check.at)}` : `All clear · checked ${clock(check.at)}`) : "Not run yet",
      due: !!check?.flagged, act: <button type="button" className="kh-go" disabled={ai.busy} onClick={() => ai.ask("Run operational checks on my organisation and explain what needs attention. Do not change anything.")}>Run now</button> },
    { key: "follow", icon: <CalendarClock size={16} />, name: "Follow-up scheduler", show: role !== "veterinarian",
      status: followups || quiet ? `${followups ? `${followups} promised review${followups === 1 ? "" : "s"} to schedule` : ""}${followups && quiet ? " · " : ""}${quiet ? `${quiet} critical case${quiet === 1 ? "" : "s"} gone quiet` : ""}` : "Every promised review is scheduled",
      due: !!(followups || quiet), act: <Link className="kh-go" href="/ngo">Review</Link> },
    { key: "claim", icon: <BadgeIndianRupee size={16} />, name: "Claim builder", show: lead,
      status: preview ? `${preview.count ? `${rupees(preview.total) ?? `${preview.count} procedures`} ready to claim` : "Nothing ready to claim yet"}${blocked ? ` · ${blocked} blocked` : ""}` : bill ? "No contract linked" : "Reading…",
      due: !!(preview?.count || blocked), act: <Link className="kh-go" href="/ngo/packages">Open claim</Link> },
    { key: "vet", icon: <Stethoscope size={16} />, name: "Vet sign-off queue", show: true,
      status: counts.vet ? `${counts.vet} waiting for a vet` : "Nothing waiting", due: counts.vet > 0, act: <Link className="kh-go" href="/ngo/verification?stage=vet">Open</Link> },
    { key: "evidence", icon: <Camera size={16} />, name: "Evidence chaser", show: role !== "veterinarian",
      status: counts.evidence ? `${counts.evidence} record${counts.evidence === 1 ? "" : "s"} missing evidence` : "Every record has its evidence", due: counts.evidence > 0, act: <Link className="kh-go" href="/ngo/verification?stage=evidence">Open</Link> },
    { key: "places", icon: <MapPin size={16} />, name: "Place-name clean-up", show: lead,
      status: places ? `${places} place${places === 1 ? "" : "s"} spelled more than one way` : "Place names are consistent", due: places > 0, act: <Link className="kh-go" href="/ngo/quality">Fix</Link> },
  ];
  const shown = autos.filter((a) => a.show);
  const due = shown.filter((a) => a.due).length;

  const tiles = [
    lead && { k: "Ready to claim", v: preview ? (preview.count ? rupees(preview.total) ?? String(preview.count) : "₹0") : "—", href: "/ngo/packages" },
    { k: "Waiting for vet", v: rows ? String(counts.vet) : "—", href: "/ngo/verification?stage=vet" },
    { k: "Ready for review", v: rows ? String(counts.review) : "—", href: "/ngo/verification?stage=review" },
    { k: "Missing evidence", v: rows ? String(counts.evidence) : "—", href: "/ngo/verification?stage=evidence" },
  ].filter(Boolean) as { k: string; v: string; href: string }[];

  return (
    <section className="kh" aria-label="Kaju at work">
      <header className="kh-head">
        <span className="kh-dot" aria-hidden><Sparkles size={15} /></span>
        <div><h2>{loading ? <Reading>Kaju is reading your records</Reading> : due ? `${due} thing${due === 1 ? "" : "s"} need${due === 1 ? "s" : ""} you` : "Everything is in order"}</h2>
          <p>{mem.org?.name}</p></div>
      </header>
      <ul className="kh-tiles">{tiles.map((t) => <li key={t.k}><Link href={t.href}><span>{t.k}</span><b>{t.v}</b></Link></li>)}</ul>
      <h3 className="kh-sub">Automations</h3>
      <ul className="kh-list">{shown.map((a) => (
        <li key={a.key} className={a.due ? "is-due" : undefined}>
          <span className="kh-ic" aria-hidden>{a.icon}</span>
          <span className="kh-t"><b>{a.name}</b><small>{a.status}</small></span>
          {a.act}
        </li>))}</ul>
      <p className="kh-foot"><Link href="/ngo">Today <ArrowRight size={13} aria-hidden /></Link></p>
    </section>
  );
}
