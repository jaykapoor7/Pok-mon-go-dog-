"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2, Tent, Check, ArrowUpRight } from "lucide-react";
import { getMyCamps, createVetCamp, setVetCampStatus } from "@/lib/camp-actions";
import { formatDate } from "@/lib/utils";
import type { VetCamp } from "@/lib/types";
import "./field.css";

/* compact: the dashboard's view — only camps still to come, the next three,
   with a link to the full list on Field work. */
export function CampsSection({ compact = false }: { compact?: boolean }) {
  const [camps, setCamps] = useState<VetCamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = () => getMyCamps().then(setCamps).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = camps.filter((c) => c.status !== "done" && (!c.camp_date || c.camp_date >= today))
    .sort((a, b) => (a.camp_date ?? "9999").localeCompare(b.camp_date ?? "9999"));
  const shown = compact ? upcoming.slice(0, 3) : camps;

  return (
    <section className="fw-sec" aria-labelledby="fw-camps-h">
      <header className="fw-head">
        <h2 id="fw-camps-h">{compact ? "Camps coming up" : "Veterinary camps"}{(compact ? upcoming : camps).length ? <span className="sys-mono">{(compact ? upcoming : camps).length}</span> : null}</h2>
        <button type="button" className="fw-act" aria-expanded={adding} onClick={() => setAdding((v) => !v)}>
          <Plus size={15} aria-hidden /> {adding ? "Close" : "Plan a camp"}
        </button>
      </header>

      {adding && <AddCamp onDone={() => { setAdding(false); load(); }} />}

      {loading ? (
        <p className="fw-wait" role="status"><Loader2 size={16} className="fw-spin" aria-hidden /> Reading camps…</p>
      ) : shown.length === 0 ? (
        <p className="fw-empty">{compact && camps.length ? "No camp is coming up. Plan the next one to put it on the team's calendar." : "No camps planned yet. Plan one to put a sterilisation or vaccination day on the team's calendar."}</p>
      ) : (
        <ul className="fw-list">
          {shown.map((c) => (
            <li key={c.id}>
              <Tent size={16} aria-hidden className="fw-ico" />
              <span className="fw-what">
                <b>{c.name}</b>
                <small>{[c.village, c.district].filter(Boolean).join(", ") || "Place not set"}{c.camp_date ? ` · ${formatDate(c.camp_date)}` : ""}</small>
              </span>
              <button type="button" className={`fw-state ${c.status === "done" ? "is-done" : ""}`}
                onClick={() => setVetCampStatus(c.id, c.status === "done" ? "planned" : "done").then(load)}
                aria-label={c.status === "done" ? `${c.name}: done. Mark as planned` : `${c.name}: planned. Mark as done`}>
                {c.status === "done" ? <><Check size={13} aria-hidden /> Done</> : "Planned"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {compact && upcoming.length > 3 && <Link href="/partner/field" className="fw-more">All {upcoming.length} coming up <ArrowUpRight size={13} aria-hidden /></Link>}
    </section>
  );
}

function AddCamp({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createVetCamp({ name: name.trim(), village: village.trim() || undefined, district: district.trim() || undefined, campDate: date || null });
      onDone();
    } finally { setBusy(false); }
  }

  return (
    <div className="fw-add">
      <label className="is-wide"><span>Camp</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ward 12 sterilisation camp" /></label>
      <label><span>Village or area</span><input value={village} onChange={(e) => setVillage(e.target.value)} /></label>
      <label><span>District</span><input value={district} onChange={(e) => setDistrict(e.target.value)} /></label>
      <label><span>Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <button type="button" className="sys-btn is-sm" onClick={submit} disabled={busy || !name.trim()}>
        {busy ? <Loader2 size={15} className="fw-spin" aria-hidden /> : <Check size={15} aria-hidden />} Save camp
      </button>
    </div>
  );
}
